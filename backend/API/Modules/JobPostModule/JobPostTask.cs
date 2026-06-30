using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;

namespace AITasker_Modular.Modules.JobModule
{
    [Table("JobPostTasks")]
    public class JobPostTask
    {
        [Key]
        public Guid Id { get; set; }

        public Guid JobPostId { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        [ForeignKey("JobPostId")]
        [System.Text.Json.Serialization.JsonIgnore]
        public JobPost? JobPost { get; set; }

        public ICollection<JobPostMiniTask> JobPostMiniTasks { get; set; } = new List<JobPostMiniTask>();

        [NotMapped]
        public int Duration => JobPostMiniTasks?.Sum(m => m.Duration) ?? 0;
    }
}
