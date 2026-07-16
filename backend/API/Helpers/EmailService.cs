using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

namespace AITasker_Modular.Helpers;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string body)
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
            // Logging to console/debug when SMTP is not fully configured
            _logger.LogWarning("Email settings are not configured in appsettings.json. Email printed to console instead.");
            _logger.LogInformation("================ MOCK EMAIL ================");
            _logger.LogInformation($"To: {toEmail}");
            _logger.LogInformation($"Subject: {subject}");
            _logger.LogInformation($"Body:\n{body}");
            _logger.LogInformation("============================================");
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

            await smtpClient.SendMailAsync(mailMessage);
            _logger.LogInformation($"Email sent to {toEmail} successfully via SMTP.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send email to {toEmail} via SMTP. Falling back to logger.");
            _logger.LogInformation("================ MOCK EMAIL (FALLBACK) ================");
            _logger.LogInformation($"To: {toEmail}");
            _logger.LogInformation($"Subject: {subject}");
            _logger.LogInformation($"Body:\n{body}");
            _logger.LogInformation("=======================================================");
        }
    }
}
