using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker_Modular.Modules.UserModule;

[Table("Wallets")]
public class Wallet
{
    [Key]
    public Guid UserId { get; set; }
    public decimal Balance { get; set; }
    public decimal EscrowBalance { get; set; } = 0m; // Số dư đang bị giữ trong escrow
    public decimal TotalEarned { get; set; } = 0m;   // Tổng thu nhập tích lũy của Expert
}
