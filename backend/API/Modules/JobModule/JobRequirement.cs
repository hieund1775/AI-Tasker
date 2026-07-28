using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker_Modular.Modules.JobModule;

[Table("JobRequirements")]
public class JobRequirement
{
    [Key]
    public Guid Id { get; set; }
    public Guid JobPostId { get; set; }
    [Required]
    public string UseCaseName { get; set; } = string.Empty;
    public string? Description { get; set; }

    public JobPost? JobPost { get; set; }
}
