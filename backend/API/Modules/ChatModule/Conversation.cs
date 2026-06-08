using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using AITasker_Modular.Modules.JobModule;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.ChatModule;

[Table("Conversations")]
public class Conversation
{
    [Key]
    public Guid Id { get; set; }
    public Guid? OriginJobPostId { get; set; }
    public Guid ClientId { get; set; }
    public Guid ExpertId { get; set; }
    public DateTime CreatedAt { get; set; }

    public JobPost? OriginJobPost { get; set; }
    public ApplicationUser? Client { get; set; }
    public ApplicationUser? Expert { get; set; }
}
