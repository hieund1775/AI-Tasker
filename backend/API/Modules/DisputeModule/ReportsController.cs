using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.InteractionModule;
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
public class AdminAcceptReportRequest { public string? AdminNote { get; set; } }
public class AdminRejectReportRequest { public string Reason { get; set; } = string.Empty; }
public class PartnerSubmitResponseRequest
{
    public string Explanation { get; set; } = string.Empty;
    public string? EvidenceUrl { get; set; }
    public string? DesiredResolution { get; set; }
    public Guid? UserId { get; set; }
}
public class AdminRequestMoreEvidenceRequest
{
    public string Target { get; set; } = "both"; // "both" | "client" | "expert"
    public string AdminNote { get; set; } = string.Empty;
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

    // =========================================================================
    // THÊM MỚI ENDPOINT GET ĐỂ TRẢ VỀ ĐƠN HỦY (RẤT QUAN TRỌNG)
    // =========================================================================
    [HttpGet]
    public async Task<IActionResult> GetReports([FromQuery] Guid? projectId)
    {
        var query = _context.Reports
            .Include(r => r.Project)
                .ThenInclude(p => p!.JobPost)
            .AsQueryable();

        if (projectId != null)
        {
            query = query.Where(r => r.ProjectId == projectId);
        }

        var reports = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        var dtos = reports.Select(MapToDetailDto).ToList();
        return Ok(dtos);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetReportById(Guid id)
    {
        var report = await _context.Reports
            .Include(r => r.Project)
                .ThenInclude(p => p!.JobPost)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (report == null)
            return NotFound("Report/Dispute not found.");

        return Ok(MapToDetailDto(report));
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
        return Ok(new { Message = "Test data reset successfully." });
    }

    // API 2.2.1: Gửi đơn yêu cầu hủy
    [HttpPost]
    public async Task<IActionResult> CreateReport([FromBody] Report report)
    {
        report.Id = Guid.NewGuid();
        report.Status = "Pending"; 
        report.CreatedAt = DateTime.UtcNow;
        report.UpdatedAt = DateTime.UtcNow.AddDays(30);

        var isClient = (report.ReporterRole ?? string.Empty).ToLower() == "client";
        report.CurrentRoundClientSubmitted = isClient;
        report.CurrentRoundExpertSubmitted = !isClient;
        
        if (isClient)
        {
            report.ClientExplanation = report.Description;
            report.ClientExplanationReason = report.Reason;
            report.ClientExplanationDescription = report.Description;
            report.ClientExplanationEvidence = report.EvidenceUrl;
            report.ClientExplanationDesiredResolution = report.DesiredResolution;
        }
        else
        {
            report.ExpertExplanation = report.Description;
            report.ExpertExplanationReason = report.Reason;
            report.ExpertExplanationDescription = report.Description;
            report.ExpertExplanationEvidence = report.EvidenceUrl;
            report.ExpertExplanationDesiredResolution = report.DesiredResolution;
        }

        var project = await _context.Projects.FindAsync(report.ProjectId);
        if (project == null) return NotFound("Project not found.");

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

        // Load project and jobpost for DTO mapping
        await _context.Entry(report).Reference(r => r.Project).LoadAsync();
        if (report.Project != null)
        {
            await _context.Entry(report.Project).Reference(p => p.JobPost).LoadAsync();
        }

        return Ok(MapToDetailDto(report));
    }

    // API 2.2.2 (Phần 1): Admin duyệt đơn chuyển sang cho đối tác
    [HttpPut("{id}/admin-approve-cancel")]
    public async Task<IActionResult> AdminApproveCancel(Guid id)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Cancellation report not found.");

        report.Status = "Awaiting Partner"; 
        report.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _context.Entry(report).Reference(r => r.Project).LoadAsync();
        if (report.Project != null)
        {
            await _context.Entry(report.Project).Reference(p => p.JobPost).LoadAsync();
        }

        return Ok(new { Message = "Admin has approved the cancellation. Awaiting partner response.", Report = MapToDetailDto(report) });
    }

    // API 2.2.2 (Phần 2): Đối tác đồng ý hủy -> TÍCH HỢP KẾT SẮT VÀ NHẬT KÝ DÒNG TIỀN MỚI
    [HttpPut("{id}/partner-accept-cancel")]
    public async Task<IActionResult> PartnerAcceptCancel(Guid id)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Cancellation report not found.");

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
                expertWallet.TotalEarned += report.EscrowPayExpert;
            }

            // 2. Hoàn trả phần tiền còn lại (đã trừ phạt) về ví cho Client
            var clientWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == project.ClientId);
            if (clientWallet != null)
            {
                clientWallet.Balance += report.EscrowRefundClient;
                // Trừ EscrowBalance tương ứng của Client
                clientWallet.EscrowBalance = Math.Max(0, clientWallet.EscrowBalance - totalBudget);
            }

            // Tính toán số tiền thực tế sàn thu được từ vụ hủy đơn này
            decimal penaltyAmount = totalBudget * 0.10m;
            decimal totalPlatformIncome = report.PlatformFee + penaltyAmount;

            // 3. NẠP TIỀN VÀO VÍ FEE CỦA OWNER (SystemWallet 88888888-8888-8888-8888-888888888888)
            var ownerFeeWalletId = Guid.Parse("88888888-8888-8888-8888-888888888888");
            var ownerFeeWallet = await _context.SystemWallets
                .FirstOrDefaultAsync(w => w.Id == ownerFeeWalletId);
            if (ownerFeeWallet == null)
            {
                ownerFeeWallet = new SystemWallet { Id = ownerFeeWalletId, TotalBalance = 0m, UpdatedAt = DateTime.UtcNow };
                _context.SystemWallets.Add(ownerFeeWallet);
            }
            ownerFeeWallet.TotalBalance += totalPlatformIncome;
            ownerFeeWallet.UpdatedAt = DateTime.UtcNow;

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

            // [FIX 2.3.1] Ghi TransactionLog cho từng bên để hiện thị trong lịch sử giao dịch ví
            // Giao dịch hoàn tiền Client (EscrowRefund)
            _context.TransactionLogs.Add(new TransactionLog
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                SourceWalletId = null,
                DestinationWalletId = project.ClientId,
                Amount = report.EscrowRefundClient,
                Type = "EscrowRefund",
                CreatedAt = DateTime.UtcNow,
                Status = "Success",
                Description = $"Hoàn tiền từ khiếu nại {report.Id}",
                ReportId = report.Id
            });

            // Giao dịch giải ngân Expert (ReleasePayment)
            _context.TransactionLogs.Add(new TransactionLog
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                SourceWalletId = project.ClientId,
                DestinationWalletId = project.ExpertId,
                Amount = report.EscrowPayExpert,
                Type = "ReleasePayment",
                CreatedAt = DateTime.UtcNow,
                Status = "Success",
                PlatformFee = report.PlatformFee,
                Description = $"Thanh toán từ khiếu nại {report.Id}",
                ReportId = report.Id
            });

            project.EscrowBalance = 0;
        }

        await _context.SaveChangesAsync();

        await _context.Entry(report).Reference(r => r.Project).LoadAsync();
        if (report.Project != null)
        {
            await _context.Entry(report.Project).Reference(p => p.JobPost).LoadAsync();
        }

        return Ok(new { Message = "Contract cancelled successfully. Escrow funds distributed to wallets and system.", Report = MapToDetailDto(report) });
    }

    // API 2.2.3 (Phần 2): Đối tác từ chối hủy
    [HttpPut("{id}/partner-reject-cancel")]
    public async Task<IActionResult> PartnerRejectCancel(Guid id, [FromBody] PartnerRejectRequest request)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Cancellation report not found.");

        report.Status = "Returned";
        report.PartnerRejectionReason = request.PartnerRejectionReason;
        report.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _context.Entry(report).Reference(r => r.Project).LoadAsync();
        if (report.Project != null)
        {
            await _context.Entry(report.Project).Reference(p => p.JobPost).LoadAsync();
        }

        return Ok(new { Message = "Partner rejected the cancellation. Proceeding to clarification.", Report = MapToDetailDto(report) });
    }

    // API 2.2.2 (Phần 2): Admin bác bỏ đơn hủy
    [HttpPut("{id}/admin-reject-cancel")]
    public async Task<IActionResult> AdminRejectCancel(Guid id, [FromBody] AdminRejectRequest request)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Cancellation report not found.");

        report.Status = "Rejected";
        report.AdminNote = request.AdminNote;
        report.UpdatedAt = DateTime.UtcNow;

        var project = await _context.Projects.FindAsync(report.ProjectId);
        if (project != null)
        {
            project.Status = "In Progress";
        }

        await _context.SaveChangesAsync();

        await _context.Entry(report).Reference(r => r.Project).LoadAsync();
        if (report.Project != null)
        {
            await _context.Entry(report.Project).Reference(p => p.JobPost).LoadAsync();
        }

        return Ok(new { Message = "Admin rejected the cancellation. Project continues.", Report = MapToDetailDto(report) });
    }

    // API 2.2.4 (Phần 1): Người gửi đơn chấp nhận từ chối từ đối tác (Revert chạy tiếp dự án)
    [HttpPut("{id}/initiator-accept-rejection")]
    public async Task<IActionResult> InitiatorAcceptRejection(Guid id)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Cancellation report not found.");

        report.Status = "Rejected";
        report.UpdatedAt = DateTime.UtcNow;

        var project = await _context.Projects.FindAsync(report.ProjectId);
        if (project != null)
        {
            project.Status = "In Progress";
        }

        await _context.SaveChangesAsync();

        await _context.Entry(report).Reference(r => r.Project).LoadAsync();
        if (report.Project != null)
        {
            await _context.Entry(report.Project).Reference(p => p.JobPost).LoadAsync();
        }

        return Ok(new { Message = "Cancellation request withdrawn. Project continues.", Report = MapToDetailDto(report) });
    }

    // API 2.2.4 (Phần 2): Người gửi đơn gửi phản hồi giải trình mới (Resubmit đơn hủy)
    [HttpPut("{id}/initiator-respond-rejection")]
    public async Task<IActionResult> InitiatorRespondRejection(Guid id, [FromBody] InitiatorRespondRequest request)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Cancellation report not found.");

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
        report.UpdatedAt = DateTime.UtcNow;

        var isClient = (report.ReporterRole ?? string.Empty).ToLower() == "client";
        report.CurrentRoundClientSubmitted = isClient;
        report.CurrentRoundExpertSubmitted = !isClient;
        
        if (isClient)
        {
            report.ClientExplanation = request.Reason;
            report.ClientExplanationEvidence = request.EvidenceFileName;
        }
        else
        {
            report.ExpertExplanation = request.Reason;
            report.ExpertExplanationEvidence = request.EvidenceFileName;
        }

        if (report.CurrentRoundClientSubmitted && report.CurrentRoundExpertSubmitted)
        {
            report.Status = "Awaiting Both";
        }
        else
        {
            if (report.ReportType != "cancellation")
            {
                report.Status = !report.CurrentRoundExpertSubmitted ? "Awaiting Expert" : "Awaiting Client";
            }
            else
            {
                report.Status = "Pending";
            }
        }

        await _context.SaveChangesAsync();

        await _context.Entry(report).Reference(r => r.Project).LoadAsync();
        if (report.Project != null)
        {
            await _context.Entry(report.Project).Reference(p => p.JobPost).LoadAsync();
        }

        return Ok(new { Message = "Clarification response submitted. Cancellation request is now pending review.", Report = MapToDetailDto(report) });
    }

    // BUG 3: PUT /api/Reports/{id}/admin-accept-report
    [HttpPut("{id}/admin-accept-report")]
    public async Task<IActionResult> AdminAcceptReport(Guid id, [FromBody] AdminAcceptReportRequest request)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Report/Dispute not found.");

        report.Status = (report.ReporterRole.ToLower() == "client") ? "Awaiting Expert" : "Awaiting Client";
        report.ReplyDeadline = DateTime.UtcNow.AddDays(3);
        report.AdminNote = request?.AdminNote;
        report.UpdatedAt = DateTime.UtcNow;

        var project = await _context.Projects.FindAsync(report.ProjectId);
        if (project != null)
        {
            project.Status = "Disputed";
        }

        await _context.SaveChangesAsync();

        await _context.Entry(report).Reference(r => r.Project).LoadAsync();
        if (report.Project != null)
        {
            await _context.Entry(report.Project).Reference(p => p.JobPost).LoadAsync();
        }

        return Ok(new { Message = "Admin accepted the dispute report. Project is now Disputed.", Report = MapToDetailDto(report) });
    }

    // BUG 3: PUT /api/Reports/{id}/admin-reject-report
    [HttpPut("{id}/admin-reject-report")]
    public async Task<IActionResult> AdminRejectReport(Guid id, [FromBody] AdminRejectReportRequest request)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Report/Dispute not found.");

        report.Status = "Rejected";
        report.AdminNote = request.Reason;
        report.UpdatedAt = DateTime.UtcNow;

        var project = await _context.Projects.FindAsync(report.ProjectId);
        if (project != null)
        {
            project.Status = "In Progress";
        }

        await _context.SaveChangesAsync();

        await _context.Entry(report).Reference(r => r.Project).LoadAsync();
        if (report.Project != null)
        {
            await _context.Entry(report.Project).Reference(p => p.JobPost).LoadAsync();
        }

        return Ok(new { Message = "Admin rejected the dispute report. Project continues normally.", Report = MapToDetailDto(report) });
    }

    // BUG 4: PUT /api/Reports/{id}/partner-submit-response
    [HttpPut("{id}/partner-submit-response")]
    public async Task<IActionResult> PartnerSubmitResponse(Guid id, [FromQuery] Guid? userId, [FromBody] PartnerSubmitResponseRequest request)
    {
        var report = await _context.Reports
            .Include(r => r.Project)
            .FirstOrDefaultAsync(r => r.Id == id);
            
        if (report == null) return NotFound("Report/Dispute not found.");

        // Determine the caller's role
        string? callerRole = null;
        Guid? effectiveUserId = userId ?? request.UserId;

        if (effectiveUserId.HasValue)
        {
            var user = await _context.Users.FindAsync(effectiveUserId.Value);
            if (user != null)
            {
                callerRole = user.Role;
            }
            else if (report.Project != null)
            {
                if (effectiveUserId.Value == report.Project.ClientId)
                {
                    callerRole = "client";
                }
                else if (effectiveUserId.Value == report.Project.ExpertId)
                {
                    callerRole = "expert";
                }
            }
        }

        if (string.IsNullOrEmpty(callerRole))
        {
            // Fallback: assume the partner is calling (opposite of reporter)
            callerRole = report.ReporterRole.Equals("client", StringComparison.OrdinalIgnoreCase) ? "expert" : "client";
        }

        if (callerRole.Equals("client", StringComparison.OrdinalIgnoreCase))
        {
            report.ClientExplanation = request.Explanation;
            report.ClientExplanationEvidence = request.EvidenceUrl;
            report.ClientExplanationDesiredResolution = request.DesiredResolution;
            report.CurrentRoundClientSubmitted = true;
        }
        else if (callerRole.Equals("expert", StringComparison.OrdinalIgnoreCase))
        {
            report.ExpertExplanation = request.Explanation;
            report.ExpertExplanationEvidence = request.EvidenceUrl;
            report.ExpertExplanationDesiredResolution = request.DesiredResolution;
            report.CurrentRoundExpertSubmitted = true;
        }
        else
        {
            return BadRequest("Could not determine the role of the responder.");
        }

        if (report.CurrentRoundClientSubmitted && report.CurrentRoundExpertSubmitted)
        {
            report.Status = "Awaiting Both";
        }
        else
        {
            report.Status = !report.CurrentRoundClientSubmitted ? "Awaiting Client" : "Awaiting Expert";
        }

        report.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (report.Project != null)
        {
            await _context.Entry(report.Project).Reference(p => p.JobPost).LoadAsync();
        }

        return Ok(new { Message = "Clarification response submitted.", Report = MapToDetailDto(report) });
    }

    // BUG 6: PUT /api/Reports/{id}/admin-request-more-evidence
    [HttpPut("{id}/admin-request-more-evidence")]
    public async Task<IActionResult> AdminRequestMoreEvidence(Guid id, [FromBody] AdminRequestMoreEvidenceRequest request)
    {
        var report = await _context.Reports.FindAsync(id);
        if (report == null) return NotFound("Report/Dispute not found.");

        if (request.Target.ToLower() == "client")
        {
            report.CurrentRoundClientSubmitted = false;
        }
        else if (request.Target.ToLower() == "expert")
        {
            report.CurrentRoundExpertSubmitted = false;
        }
        else // both
        {
            report.CurrentRoundClientSubmitted = false;
            report.CurrentRoundExpertSubmitted = false;
        }

        report.Status = "Awaiting Evidence";
        report.ReplyDeadline = DateTime.UtcNow.AddHours(48);
        report.AdminNote = request.AdminNote;
        report.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _context.Entry(report).Reference(r => r.Project).LoadAsync();
        if (report.Project != null)
        {
            await _context.Entry(report.Project).Reference(p => p.JobPost).LoadAsync();
        }

        return Ok(new { Message = "Admin requested additional evidence.", Report = MapToDetailDto(report) });
    }

    private static ReportDetailDto MapToDetailDto(Report r)
    {
        object? historyObj = null;
        if (!string.IsNullOrEmpty(r.HistoryLogsJson))
        {
            try
            {
                historyObj = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<object>>(r.HistoryLogsJson);
            }
            catch { }
        }

        return new ReportDetailDto
        {
            Id = r.Id,
            ProjectId = r.ProjectId,
            ReporterId = r.ReporterId,
            ReporterRole = r.ReporterRole,
            ReportType = r.ReportType,
            Reason = r.Reason,
            Description = r.Description,
            DisputeType = r.DisputeType,
            DesiredResolution = r.DesiredResolution,
            EvidenceUrl = r.EvidenceUrl,
            Status = r.Status,
            EscrowRefundClient = r.EscrowRefundClient,
            EscrowPayExpert = r.EscrowPayExpert,
            PlatformFee = r.PlatformFee,
            PartnerRejectionReason = r.PartnerRejectionReason,
            AdminNote = r.AdminNote,
            ClientExplanation = r.ClientExplanation,
            ClientExplanationReason = r.ClientExplanationReason,
            ClientExplanationDescription = r.ClientExplanationDescription,
            ClientExplanationEvidence = r.ClientExplanationEvidence,
            ClientExplanationDesiredResolution = r.ClientExplanationDesiredResolution,
            ExpertExplanation = r.ExpertExplanation,
            ExpertExplanationReason = r.ExpertExplanationReason,
            ExpertExplanationDescription = r.ExpertExplanationDescription,
            ExpertExplanationEvidence = r.ExpertExplanationEvidence,
            ExpertExplanationDesiredResolution = r.ExpertExplanationDesiredResolution,
            ReplyDeadline = r.ReplyDeadline,
            CurrentRoundClientSubmitted = r.CurrentRoundClientSubmitted,
            CurrentRoundExpertSubmitted = r.CurrentRoundExpertSubmitted,
            ClientId = r.Project != null ? r.Project.ClientId : Guid.Empty,
            ExpertId = r.Project != null ? r.Project.ExpertId : Guid.Empty,
            ProjectTitle = r.Project != null && r.Project.JobPost != null ? r.Project.JobPost.Title : string.Empty,
            ProjectDeadline = r.Project != null ? r.Project.EndDate : null,
            ProjectStartDate = r.Project != null ? r.Project.StartDate : DateTime.MinValue,
            HistoryLogs = historyObj,
            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt
        };
    }
}
