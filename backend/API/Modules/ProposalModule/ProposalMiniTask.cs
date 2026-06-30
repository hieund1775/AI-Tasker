using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace AITasker_Modular.Modules.JobModule
{
    [Table("ProposalMiniTasks")]
    public class ProposalMiniTask
    {
        [Key]
        public Guid Id { get; set; }
        
        public Guid ProposalTaskId { get; set; }
        
        [Required]
        public string Title { get; set; } = string.Empty;
        
        public DateTime? Deadline { get; set; }
        
        public int Duration { get; set; }

        [ForeignKey("ProposalTaskId")]
        [JsonIgnore]
        public ProposalTask? ProposalTask { get; set; }
    }
}
