using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.DisputeModule;

public class AdminRejectRequest { public string? AdminNote { get; set; } }
public class PartnerRejectRequest { public string? PartnerRejectionReason { get; set; } }

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly DataContext _context;

    public ReportsController(DataContext context)
    {
        _context = context;
    }

    // API 2.2.1: Gửi đơn yêu cầu hủy
    [HttpPost]
    public async Task<IActionResult> CreateReport([FromBody] Report report)
    {
        report.Id = Guid.NewGuid();
        report.Status = "Pending"; 
        report.CreatedAt = DateTime.UtcNow;
        report.UpdatedAt = DateTime.UtcNow.AddDays(30);

        var project = await _context.Projects.FindAsync(report.ProjectId);
        if (project == null) return NotFound("Không tìm thấy dự án tương ứng.");

        project.Status = "Awaiting_Cancellation";
        decimal totalBudget = project.EscrowBalance; 

        decimal progressRate = 0.30m; 
        decimal expertWorkValue = totalBudget * progressRate;

        report.PlatformFee = expertWorkValue * 0.05m; 
        report.EscrowPayExpert = expertWorkValue - report.PlatformFee;

        decimal penaltyAmount = totalBudget * 0.10m;
        report.EscrowRefundClient = totalBudget - expertWorkValue - penaltyAmount;

        _context.Reports.Add(report);
        await _context.SaveChangesAsync();
        return Ok(report);
    }

    // API 2.2.2 (Phần 1): Admin duyệt đơn chuyển sang cho đối tác
    [HttpPut("{id}/admin-approve-cancel")]
    public async Task<IActionResult> AdminApproveCancel(Guid id)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Không tìm thấy đơn yêu cầu hủy.");

        report.Status = "Awaiting Partner"; 
        report.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Admin đã duyệt đơn hủy. Chờ đối tác phản hồi." });
    }

    // API 2.2.2 (Phần 2): Đối tác đồng ý hủy -> TÍCH HỢP KẾT SẮT VÀ NHẬT KÝ DÒNG TIỀN MỚI
    [HttpPut("{id}/partner-accept-cancel")]
    public async Task<IActionResult> PartnerAcceptCancel(Guid id)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Không tìm thấy đơn yêu cầu hủy.");

        report.Status = "Accepted";
        report.UpdatedAt = DateTime.UtcNow;

        var project = await _context.Projects.FindAsync(report.ProjectId);
        if (project != null)
        {
            project.Status = "cancel_done";
            decimal totalBudget = project.EscrowBalance;

            // 1. Giải ngân phần tiền sạch về ví cho Expert
            var expertWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == project.ExpertId);
            if (expertWallet != null)
            {
                expertWallet.Balance += report.EscrowPayExpert;
            }

            // 2. Hoàn trả phần tiền còn lại (đã trừ phạt) về ví cho Client
            var clientWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == project.ClientId);
            if (clientWallet != null)
            {
                clientWallet.Balance += report.EscrowRefundClient;
            }

            // Tính toán số tiền thực tế sàn thu được từ vụ hủy đơn này
            decimal penaltyAmount = totalBudget * 0.10m;
            decimal totalPlatformIncome = report.PlatformFee + penaltyAmount;

            // 3. NẠP TIỀN VÀO KẾT SẮT DOANH THU TỔNG: Bốc dòng TOTAL cố định (Hiệu năng O(1))
            var systemWallet = await _context.SystemWallets
                .FirstOrDefaultAsync(w => w.Id == Guid.Parse("11111111-1111-1111-1111-111111111111"));
            if (systemWallet != null)
            {
                systemWallet.TotalBalance += totalPlatformIncome;
                systemWallet.UpdatedAt = DateTime.UtcNow;
            }

            // 4. CHI CHIẾT HÓA ĐƠN ĐỐI SOÁT: Thêm dòng nhật ký dòng tiền cho hệ thống
            var log = new SystemTransactionLog
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                Amount = totalPlatformIncome,
                Type = "Penalty & Fee",
                Description = $"Thu 5% phí sàn ({report.PlatformFee}) và 10% tiền phạt hủy ngang ({penaltyAmount}) từ đơn hủy {report.Id}.",
                CreatedAt = DateTime.UtcNow
            };
            _context.SystemTransactionLogs.Add(log);

            project.EscrowBalance = 0;
        }

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Hủy hợp đồng thành công. Tiền ký quỹ đã phân rã hoàn toàn về ví các bên và hệ thống.", Report = report });
    }

    // API 2.2.3 (Phần 2): Đối tác từ chối hủy
    [HttpPut("{id}/partner-reject-cancel")]
    public async Task<IActionResult> PartnerRejectCancel(Guid id, [FromBody] PartnerRejectRequest request)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Không tìm thấy đơn yêu cầu hủy.");

        report.Status = "Returned";
        report.PartnerRejectionReason = request.PartnerRejectionReason;
        report.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Đối tác từ chối đề xuất hủy. Chuyển sang luồng thương lượng giải trình.", Report = report });
    }
}
