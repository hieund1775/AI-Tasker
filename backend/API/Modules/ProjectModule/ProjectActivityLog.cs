using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker_Modular.Modules.ProjectModule
{
    [Table("ProjectActivityLogs")]
    public class ProjectActivityLog
    {
        [Key]
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        [Required]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;
        [Required]
        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        [MaxLength(255)]
        public string? ActorName { get; set; }

        public Project? Project { get; set; }
    }
}
