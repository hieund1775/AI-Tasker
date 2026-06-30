using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.ProjectModule;

[Table("MiniTasks")]
public class MiniTask
{
    [Key]
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    [Required]
    public string Title { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public string? FeedbackContent { get; set; }
    public Guid? FeedbackSenderId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? Deadline { get; set; }
    public int Duration { get; set; }

    [JsonIgnore]
    public Task? Task { get; set; }
    public ApplicationUser? FeedbackSender { get; set; }
}

