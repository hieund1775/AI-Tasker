using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text.Json.Serialization;

namespace AITasker_Modular.Modules.JobModule
{
    [Table("ProposalTasks")]
    public class ProposalTask
    {
        [Key]
        public Guid Id { get; set; }
        
        public Guid ProposalId { get; set; }
        
        [Required]
        public string Title { get; set; } = string.Empty;

        [ForeignKey("ProposalId")]
        [JsonIgnore]
        public Proposal? Proposal { get; set; }

        public ICollection<ProposalMiniTask> ProposalMiniTasks { get; set; } = new List<ProposalMiniTask>();

        [NotMapped]
        public int Duration => ProposalMiniTasks?.Sum(m => m.Duration) ?? 0;
    }
}
