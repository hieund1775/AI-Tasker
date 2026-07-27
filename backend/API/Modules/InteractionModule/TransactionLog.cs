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
    // Đảm bảo không bị sai lệch số thập phân trong SQL Server
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    [Required]
    public string Type { get; set; } = string.Empty;
    // Các giá trị đề xuất: "Deposit", "Withdraw", "Escrow_Deposit", "Escrow_Release", "Escrow_Refund", "Platform_Fee"
    public DateTime CreatedAt { get; set; }

    // ==========================================
    // CAC TRUONG CAN BO SUNG MOI
    // ==========================================
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Success";
    // Trạng thái: "Pending", "Success", "Failed", "Cancelled"
    public DateTime? UpdatedAt { get; set; }
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
    // Nội dung giao dịch làm cơ sở sinh VietQR hoặc đối soát (ví dụ: "NAPTIEN ZALOPAY 123456")
    [MaxLength(255)]
    public string? BankReferenceNo { get; set; }
    // Mã đối soát của Cổng thanh toán ZaloPay/PayOS gửi về khi webhook thành công
    public bool IsSandbox { get; set; } = false;
    // Đánh dấu luồng test/sandbox để tránh lỗi cộng tiền giả trên môi trường thật
    [Column(TypeName = "decimal(18,2)")]
    public decimal GatewayFee { get; set; } = 0;
    // Phí cổng thanh toán (nếu có)
    [Column(TypeName = "decimal(18,2)")]
    public decimal PlatformFee { get; set; } = 0;
    // Phí sàn (ví dụ 5% giữ lại từ thu nhập của Expert khi release payment)
    
    // Các trường phục vụ luồng Rút Tiền (Withdraw) về Ngân hàng
    [MaxLength(50)]
    public string? BankCode { get; set; } // Ví dụ: VCB, TCB, MB
    [MaxLength(100)]
    public string? BankAccountNumber { get; set; }
    [MaxLength(255)]
    public string? BankAccountName { get; set; }
    
    // Liên kết báo cáo tranh chấp khi Admin ra phán quyết hoàn tiền/chia tiền
    public Guid? ReportId { get; set; }

    // ==========================================
    // QUAN HE LIEN KET (RELATIONS)
    // ==========================================
    public Project? Project { get; set; }
    public Wallet? SourceWallet { get; set; }
    public Wallet? DestinationWallet { get; set; }
}
