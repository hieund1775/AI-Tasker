using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.ProjectModule;

[Table("Tasks")]
public class Task
{
    [Key]
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    [Required]
    public string Title { get; set; } = string.Empty;
    [Required]
    public string Status { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
    public string? FeedbackContent { get; set; }
    public Guid? FeedbackSenderId { get; set; }
    public string? Notes { get; set; }

    [JsonIgnore]
    public Project? Project { get; set; }
    public ICollection<MiniTask> MiniTasks { get; set; } = new List<MiniTask>();

    [NotMapped]
    public int Duration => MiniTasks?.Sum(m => m.Duration) ?? 0;

    [NotMapped]
    public DateTime? Deadline
    {
        get
        {
            if (Project == null) return null;
            return Project.StartDate.AddDays(Duration);
        }
    }

    [ForeignKey(nameof(FeedbackSenderId))]
    public ApplicationUser? FeedbackSender { get; set; }
}

