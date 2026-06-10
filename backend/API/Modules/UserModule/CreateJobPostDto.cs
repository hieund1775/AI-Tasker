using System.ComponentModel.DataAnnotations;

namespace AITasker_Modular.Modules.JobModule.DTOs;

public class CreateJobPostDto
{
    [Required(ErrorMessage = "Title is required.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Description is required.")]
    public string Description { get; set; } = string.Empty;

    [Required(ErrorMessage = "Budget is required.")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Budget must be greater than 0.")]
    public decimal Budget { get; set; }

    public int Deadline { get; set; }

    public string? AICategoryDomainId { get; set; }

    [Required(ErrorMessage = "Client ID is required.")]
    public string ClientId { get; set; } = string.Empty;

    public List<string>? SkillIds { get; set; }
}

public class UpdateJobPostDto
{
    [Required(ErrorMessage = "Title is required.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Description is required.")]
    public string Description { get; set; } = string.Empty;

    [Required(ErrorMessage = "Budget is required.")]
    [Range(0.01, double.MaxValue, ErrorMessage = "Budget must be greater than 0.")]
    public decimal Budget { get; set; }

    public int Deadline { get; set; }

    public string? AICategoryDomainId { get; set; }

    public List<string>? SkillIds { get; set; }
}