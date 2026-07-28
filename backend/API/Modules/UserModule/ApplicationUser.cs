using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker_Modular.Modules.UserModule;

[Table("Users")]
public class ApplicationUser
{
    [Key]
    public Guid Id { get; set; }
    [Required]
    public string Email { get; set; } = string.Empty;
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
    [Required]
    public string FullName { get; set; } = string.Empty;
    [Required]
    public string Role { get; set; } = string.Empty;
    [Required]
    public string Status { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? StaffCode { get; set; }
    public DateTime? AppointedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? PhoneNumber { get; set; }
    public string? PasswordResetToken { get; set; }     // Token dùng để reset mật khẩu
    public DateTime? PasswordResetExpiry { get; set; } // Hạn sử dụng của token (15 phút)
    public string? EmailVerificationToken { get; set; }   // Token dùng để xác thực email
    public DateTime? EmailVerificationExpiry { get; set; } // Hạn sử dụng của token xác thực
}
