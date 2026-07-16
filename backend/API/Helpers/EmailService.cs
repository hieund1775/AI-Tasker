using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Mail;
using System.Threading.Tasks;

namespace AITasker_Modular.Helpers;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        var provider = _configuration["EmailSettings:Provider"] ?? "SMTP";

        if (provider.Equals("Resend", StringComparison.OrdinalIgnoreCase))
        {
            await SendViaResendAsync(toEmail, subject, body);
        }
        else
        {
            await SendViaSmtpAsync(toEmail, subject, body);
        }
    }

    private async Task SendViaResendAsync(string toEmail, string subject, string body)
    {
        var apiKey = _configuration["EmailSettings:ApiKey"];
        var senderName = _configuration["EmailSettings:SenderName"] ?? "AI-Tasker System";
        var senderEmail = _configuration["EmailSettings:SenderEmail"] ?? "onboarding@resend.dev";

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("Resend ApiKey is not configured. Email printed to console instead.");
            LogMockEmail(toEmail, subject, body);
            return;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var from = $"{senderName} <{senderEmail}>";

            var payload = new
            {
                from = from,
                to = new[] { toEmail },
                subject = subject,
                html = body
            };

            var response = await client.PostAsJsonAsync("https://api.resend.com/emails", payload);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation($"Email sent to {toEmail} successfully via Resend API.");
            }
            else
            {
                var errorResponse = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Failed to send email via Resend API. Status code: {response.StatusCode}. Response: {errorResponse}");
                LogMockEmail(toEmail, subject, body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send email to {toEmail} via Resend. Falling back to logger.");
            LogMockEmail(toEmail, subject, body);
        }
    }

    private async Task SendViaSmtpAsync(string toEmail, string subject, string body)
    {
        var smtpServer = _configuration["EmailSettings:SmtpServer"];
        var portStr = _configuration["EmailSettings:Port"];
        var senderName = _configuration["EmailSettings:SenderName"] ?? "AI-Tasker System";
        var senderEmail = _configuration["EmailSettings:SenderEmail"] ?? "no-reply@aitasker.com";
        var username = _configuration["EmailSettings:Username"];
        var password = _configuration["EmailSettings:Password"];
        var enableSslStr = _configuration["EmailSettings:EnableSsl"] ?? "true";

        if (string.IsNullOrWhiteSpace(smtpServer) || string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(username))
        {
            _logger.LogWarning("SMTP email settings are not configured in appsettings.json. Email printed to console instead.");
            LogMockEmail(toEmail, subject, body);
            return;
        }

        int.TryParse(portStr, out var port);
        if (port == 0) port = 587;
        bool.TryParse(enableSslStr, out var enableSsl);

        try
        {
            using var mailMessage = new MailMessage();
            mailMessage.From = new MailAddress(senderEmail, senderName);
            mailMessage.To.Add(toEmail);
            mailMessage.Subject = subject;
            mailMessage.Body = body;
            mailMessage.IsBodyHtml = true;

            using var smtpClient = new SmtpClient(smtpServer, port);
            smtpClient.Credentials = new NetworkCredential(username, password);
            smtpClient.EnableSsl = enableSsl;
            smtpClient.Timeout = 3000; // 3 seconds timeout

            await smtpClient.SendMailAsync(mailMessage);
            _logger.LogInformation($"Email sent to {toEmail} successfully via SMTP.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send email to {toEmail} via SMTP. Falling back to logger.");
            LogMockEmail(toEmail, subject, body);
        }
    }

    private void LogMockEmail(string toEmail, string subject, string body)
    {
        _logger.LogInformation("================ MOCK EMAIL (FALLBACK) ================");
        _logger.LogInformation($"To: {toEmail}");
        _logger.LogInformation($"Subject: {subject}");
        _logger.LogInformation($"Body:\n{body}");
        _logger.LogInformation("=======================================================");
    }
}
