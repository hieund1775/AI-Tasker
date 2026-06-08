using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker_Modular.Modules.UserModule;

[Table("Wallets")]
public class Wallet
{
    [Key]
    public Guid UserId { get; set; }
    public decimal Balance { get; set; }
}
