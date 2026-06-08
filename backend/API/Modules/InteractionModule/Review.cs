using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using AITasker_Modular.Modules.ProjectModule;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.InteractionModule;

[Table("Reviews")]
public class Review
{
    [Key]
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid CreatedById { get; set; }
    public Guid TargetUserId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }

    public Project? Project { get; set; }
    public ApplicationUser? CreatedBy { get; set; }
    public ApplicationUser? TargetUser { get; set; }
}
