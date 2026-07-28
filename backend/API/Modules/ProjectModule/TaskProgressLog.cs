using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker_Modular.Modules.ProjectModule
{
    [Table("TaskProgressLogs")]
    public class TaskProgressLog
    {
        [Key]
        public Guid Id { get; set; }
        public Guid TaskId { get; set; }
        [Required]
        [MaxLength(1000)]
        public string Content { get; set; } = string.Empty;
        public double HoursWorked { get; set; }
        public DateTime CreatedAt { get; set; }

        public Task? Task { get; set; }
    }
}
