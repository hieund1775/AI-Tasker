using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.ChatModule;

[Table("Messages")]
public class Message
{
    [Key]
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    [Required]
    public string Content { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }

    public Conversation? Conversation { get; set; }
    public ApplicationUser? Sender { get; set; }
}
