using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker_Modular.Modules.ProjectModule
{
    [Table("ProjectExtensions")]
    public class ProjectExtension
    {
        [Key]
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public Guid? TaskId { get; set; }
        public int RequestedDays { get; set; }
        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // "Pending", "Accepted", "Rejected"
        public string? ClientNote { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public Project? Project { get; set; }
        public Task? Task { get; set; }
    }
}
