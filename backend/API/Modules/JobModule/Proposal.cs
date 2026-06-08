using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.JobModule;

[Table("Proposals")]
public class Proposal
{
    [Key]
    public Guid Id { get; set; }
    public Guid JobPostId { get; set; }
    public Guid ExpertId { get; set; }
    public decimal BidAmount { get; set; }
    [Required]
    public string CoverLetter { get; set; } = string.Empty;
    [Required]
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public JobPost? JobPost { get; set; }
    public ApplicationUser? Expert { get; set; }
}
