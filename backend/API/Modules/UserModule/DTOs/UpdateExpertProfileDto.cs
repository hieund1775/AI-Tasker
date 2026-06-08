using System.ComponentModel.DataAnnotations;

namespace AITasker_Modular.Modules.UserModule.DTOs;

public class UpdateExpertProfileDto
{
    [Required(ErrorMessage = "Job title is required.")]
    public string JobTitle { get; set; } = string.Empty;

    [Required(ErrorMessage = "Major is required.")]
    public string Major { get; set; } = string.Empty;

    public string? Certifications { get; set; }

    [Required(ErrorMessage = "Bio is required.")]
    public string Bio { get; set; } = string.Empty;

    public string? PortfolioUrls { get; set; }

    public string? Location { get; set; }
}
