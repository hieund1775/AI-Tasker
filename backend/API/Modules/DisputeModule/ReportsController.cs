using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.DisputeModule;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.DisputeModule;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly DataContext _context;

    public ReportsController(DataContext context)
    {
        _context = context;
    }

    // API 2.2.1: Gửi đơn yêu cầu hủy (Client/Expert gửi đơn)
    [HttpPost]
    public async Task<IActionResult> CreateReport([FromBody] Report report)
    {
        report.Id = Guid.NewGuid();
        report.Status = "Pending"; // Chờ Admin duyệt
        report.CreatedAt = DateTime.UtcNow;
        report.UpdatedAt = DateTime.UtcNow;

        // Tìm dự án tương ứng để khóa Workspace
        var project = await _context.Projects.FindAsync(report.ProjectId);
        if (project != null)
        {
            project.Status = "Awaiting_Cancellation"; // Khóa cứng trạng thái dự án theo đặc tả
            
            // Tính toán đền bù phạt sơ bộ (Ví dụ: Giữ phạt 10% trên tổng giá trị dự án làm quỹ đền bù)
            decimal totalBudget = project.EscrowBalance; 
            report.PlatformFee = totalBudget * 0.05m; // Phí sàn 5%
            report.EscrowRefundClient = totalBudget * 0.90m; // Hoàn trả Client 90% nếu hủy thành công
            report.EscrowPayExpert = 0;
        }

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

        report.Status = "Awaiting Partner"; // Chuyển trạng thái chờ đối tác phản hồi
        report.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Đơn hủy đã được phê duyệt, đang chờ đối tác phản hồi.", Report = report });
    }

    // API 2.2.2 (Phần 2): Admin bác bỏ đơn hủy (Mở lại dự án)
    [HttpPut("{id}/admin-reject-cancel")]
    public async Task<IActionResult> AdminRejectCancel(Guid id, [FromBody] AdminRejectRequest request)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Không tìm thấy đơn yêu cầu hủy.");

        report.Status = "Rejected";
        report.AdminNote = request.AdminNote;
        report.UpdatedAt = DateTime.UtcNow;

        // Mở khóa dự án quay về trạng thái làm việc bình thường
        var project = await _context.Projects.FindAsync(report.ProjectId);
        if (project != null)
        {
            project.Status = "in_progress";
        }

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Admin đã bác bỏ đơn hủy. Dự án tiếp tục chạy.", Report = report });
    }

    // API 2.2.3 (Phần 1): Đối tác đồng ý hủy -> Phân chia tiền ký quỹ vật lý về ví
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
            project.Status = "cancel_done"; // Kết thúc luồng dự án

            // --- LOGIC DI CHUYỂN TIỀN VẬT LÝ ---
            // Tìm ví của Client để cộng lại tiền hoàn (EscrowRefundClient)
            var clientWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == project.ClientId);
            if (clientWallet != null)
            {
                clientWallet.Balance += report.EscrowRefundClient;
            }

            // Giải phóng quỹ ký quỹ của dự án về 0
            project.EscrowBalance = 0;
        }

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Hủy hợp đồng thành công. Tiền ký quỹ đã hoàn trả về ví các bên.", Report = report });
    }

    // API 2.2.3 (Phần 2): Đối tác từ chối hủy -> Chuyển sang trạng thái đàm phán giải trình
    [HttpPut("{id}/partner-reject-cancel")]
    public async Task<IActionResult> PartnerRejectCancel(Guid id, [FromBody] PartnerRejectRequest request)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Không tìm thấy đơn yêu cầu hủy.");

        report.Status = "Returned"; // Trả đơn về trạng thái đàm phán thương lượng
        report.PartnerRejectionReason = request.PartnerRejectionReason;
        report.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Đối tác từ chối đề xuất hủy. Chuyển sang luồng thương lượng đàm phán.", Report = report });
    }

    // API 2.2.4 (Phần 1): Người gửi đơn chấp nhận kết quả từ chối (Rút đơn, chạy tiếp dự án)
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
            project.Status = "in_progress"; // Mở khóa Workspace
        }

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Đơn hủy đã rút. Dự án hoạt động trở lại bình thường.", Report = report });
    }

    // API 2.2.4 (Phần 2): Người gửi đơn bổ sung bằng chứng mới (Resubmit chờ Admin duyệt lại)
    [HttpPut("{id}/initiator-respond-rejection")]
    public async Task<IActionResult> InitiatorRespondRejection(Guid id, [FromBody] ResubmitRequest request)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Không tìm thấy đơn yêu cầu hủy.");

        // Backup thông tin cũ vào lịch sử log JSON trước khi ghi đè dữ liệu mới
        report.HistoryLogsJson = $"[Backup_{DateTime.UtcNow.Ticks}]: Reason={report.Reason}, Evidence={report.EvidenceUrl}";
        
        report.Reason = request.Reason;
        report.EvidenceUrl = request.EvidenceFileName;
        report.Status = "Pending"; // Quay lại hàng đợi chờ Admin phân xử vòng mới
        report.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { Message = "Bổ sung bằng chứng thành công. Đang chờ Admin thụ lý vòng mới.", Report = report });
    }
}

// Các DTO (Data Transfer Object) hứng dữ liệu Request Body
public class AdminRejectRequest { public string AdminNote { get; set; } = string.Empty; }
public class PartnerRejectRequest { public string PartnerRejectionReason { get; set; } = string.Empty; }
public class ResubmitRequest { public string Reason { get; set; } = string.Empty; public string EvidenceFileName { get; set; } = string.Empty; }