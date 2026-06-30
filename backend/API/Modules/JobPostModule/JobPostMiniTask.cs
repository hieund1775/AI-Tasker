using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace AITasker_Modular.Modules.JobModule
{
    [Table("JobPostMiniTasks")]
    public class JobPostMiniTask
    {
        [Key]
        public Guid Id { get; set; }

        public Guid JobPostTaskId { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        public int Duration { get; set; }

        [ForeignKey("JobPostTaskId")]
        [JsonIgnore]
        public JobPostTask? JobPostTask { get; set; }
    }
}
