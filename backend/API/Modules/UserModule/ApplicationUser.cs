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
}
