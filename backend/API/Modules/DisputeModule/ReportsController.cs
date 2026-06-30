using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.DisputeModule;

public class AdminRejectRequest { public string? AdminNote { get; set; } }
public class PartnerRejectRequest { public string? PartnerRejectionReason { get; set; } }
public class InitiatorRespondRequest 
{ 
    public string Reason { get; set; } = string.Empty; 
    public string? EvidenceFileName { get; set; } 
}

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly DataContext _context;

    public ReportsController(DataContext context)
    {
        _context = context;
    }

    // Endpoint hỗ trợ dọn dẹp và reset dữ liệu test để đảm bảo tính lặp lại (Idempotency)
    [HttpPost("reset-test-data")]
    public async Task<IActionResult> ResetTestData()
    {
        var projectId = Guid.Parse("66666666-6666-6666-6666-666666666666");
        
        // 1. Xóa các báo cáo liên quan đến dự án test
        var reports = await _context.Reports.Where(r => r.ProjectId == projectId).ToListAsync();
        _context.Reports.RemoveRange(reports);

        // Reset proposal 55555555-5555-5555-5555-555555555555 back to Pending
        var prop1Id = Guid.Parse("55555555-5555-5555-5555-555555555555");
        var prop1 = await _context.Proposals.FindAsync(prop1Id);
        if (prop1 != null)
        {
            prop1.Status = "Pending";
        }

        // Delete any project created for job post 33333333-3333-3333-3333-333333333333
        var job1Id = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var extraProjects = await _context.Projects.Where(p => p.JobPostId == job1Id).ToListAsync();
        foreach (var extraProj in extraProjects)
        {
            var extraTasks = await _context.ProjectTasks.Where(t => t.ProjectId == extraProj.Id).ToListAsync();
            foreach (var et in extraTasks)
            {
                var extraMinis = await _context.MiniTasks.Where(m => m.TaskId == et.Id).ToListAsync();
                _context.MiniTasks.RemoveRange(extraMinis);
            }
            _context.ProjectTasks.RemoveRange(extraTasks);
            _context.Projects.Remove(extraProj);
        }

        // 2. Reset dự án về trạng thái In Progress và EscrowBalance
        var project = await _context.Projects.FindAsync(projectId);
        if (project != null)
        {
            project.Status = "In Progress";
            project.EscrowBalance = 1800m;
        }

        // 3. Reset số dư ví Client & Expert
        var clientId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var expertId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        var clientWallet = await _context.Wallets.FindAsync(clientId);
        if (clientWallet != null) clientWallet.Balance = 5000m;

        var expertWallet = await _context.Wallets.FindAsync(expertId);
        if (expertWallet != null) expertWallet.Balance = 0m;

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Dữ liệu thử nghiệm đã được reset thành công." });
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

    // API 2.2.2 (Phần 2): Admin bác bỏ đơn hủy
    [HttpPut("{id}/admin-reject-cancel")]
    public async Task<IActionResult> AdminRejectCancel(Guid id, [FromBody] AdminRejectRequest request)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Không tìm thấy đơn yêu cầu hủy.");

        report.Status = "Rejected";
        report.AdminNote = request.AdminNote;
        report.UpdatedAt = DateTime.UtcNow;

        var project = await _context.Projects.FindAsync(report.ProjectId);
        if (project != null)
        {
            project.Status = "In Progress";
        }

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Admin đã bác bỏ đơn hủy. Dự án tiếp tục thực hiện.", Report = report });
    }

    // API 2.2.4 (Phần 1): Người gửi đơn chấp nhận từ chối từ đối tác (Revert chạy tiếp dự án)
    [HttpPut("{id}/initiator-accept-rejection")]
    public async Task<IActionResult> InitiatorAcceptRejection(Guid id)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Không tìm thấy đơn yêu cầu hủy.");

        report.Status = "Rejected";
        report.UpdatedAt = DateTime.UtcNow;

        var project = await _context.Projects.FindAsync(report.ProjectId);
        if (project != null)
        {
            project.Status = "In Progress";
        }

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Đã rút đơn hủy hợp đồng. Dự án tiếp tục thực hiện.", Report = report });
    }

    // API 2.2.4 (Phần 2): Người gửi đơn gửi phản hồi giải trình mới (Resubmit đơn hủy)
    [HttpPut("{id}/initiator-respond-rejection")]
    public async Task<IActionResult> InitiatorRespondRejection(Guid id, [FromBody] InitiatorRespondRequest request)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Không tìm thấy đơn yêu cầu hủy.");

        // Backup đơn hủy cũ vào HistoryLogsJson
        var historyList = new System.Collections.Generic.List<object>();
        if (!string.IsNullOrEmpty(report.HistoryLogsJson))
        {
            try
            {
                var existing = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<object>>(report.HistoryLogsJson);
                if (existing != null) historyList.AddRange(existing);
            }
            catch { /* ignore */ }
        }
        historyList.Add(new
        {
            Reason = report.Reason,
            Description = report.Description,
            EvidenceUrl = report.EvidenceUrl,
            UpdatedAt = report.UpdatedAt,
            Status = report.Status
        });
        report.HistoryLogsJson = System.Text.Json.JsonSerializer.Serialize(historyList);

        // Cập nhật thông tin bằng chứng mới và đổi trạng thái về Pending
        report.Reason = request.Reason;
        report.EvidenceUrl = request.EvidenceFileName;
        report.Status = "Pending";
        report.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Đã gửi phản hồi đàm phán giải trình mới. Đơn hủy chuyển về trạng thái chờ duyệt.", Report = report });
    }
}
