using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AITasker_Modular.Modules.ChatModule;
using AITasker_Modular.Modules.JobModule;
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Modules.CategoryTagModule;

namespace AITasker_Modular.Modules.ProjectModule;

[Table("Projects")]
public class Project
{
    [Key]
    public Guid Id { get; set; }
    public Guid? JobPostId { get; set; }
    public Guid ClientId { get; set; }
    public Guid ExpertId { get; set; }
    public decimal EscrowBalance { get; set; }
    [Required]
    public string Status { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? ProjectLink { get; set; }
    public Guid? ConversationId { get; set; }

    public JobPost? JobPost { get; set; }

    [JsonIgnore]
    public ApplicationUser? Client { get; set; }

    [JsonIgnore]
    public ApplicationUser? Expert { get; set; }

    [NotMapped]
    [JsonPropertyName("client")]
    public string ClientName => Client?.FullName ?? string.Empty;

    [NotMapped]
    [JsonPropertyName("expert")]
    public string ExpertName => Expert?.FullName ?? string.Empty;

    public Conversation? Conversation { get; set; }
    public ICollection<ProjectSkill> ProjectSkills { get; set; } = new List<ProjectSkill>();
    public ICollection<Task> Tasks { get; set; } = new List<Task>();
}
