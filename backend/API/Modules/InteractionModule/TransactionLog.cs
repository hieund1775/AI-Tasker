using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using AITasker_Modular.Modules.ProjectModule;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.InteractionModule;

[Table("TransactionLogs")]
public class TransactionLog
{
    [Key]
    public Guid Id { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? SourceWalletId { get; set; }
    public Guid? DestinationWalletId { get; set; }
    public decimal Amount { get; set; }
    [Required]
    public string Type { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public Project? Project { get; set; }
    public Wallet? SourceWallet { get; set; }
    public Wallet? DestinationWallet { get; set; }
}
