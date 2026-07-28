using System.Threading.Tasks;

namespace AITasker_Modular.Helpers;

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string body);
}
