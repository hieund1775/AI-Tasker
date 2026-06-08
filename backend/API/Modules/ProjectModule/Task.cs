using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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

    public Project? Project { get; set; }
}
