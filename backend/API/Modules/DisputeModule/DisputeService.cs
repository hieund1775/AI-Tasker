using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.ProjectModule;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.DisputeModule
{
    public class DisputeService : IDisputeService
    {
        private readonly DataContext _context;
        // Giữ lại để không lỗi DI injection của hệ thống
        private readonly IProjectService _projectService; 

        public DisputeService(DataContext context, IProjectService projectService)
        {
            _context = context;
            _projectService = projectService;
        }

        public async Task<Guid> SubmitProjectReportAsync(Guid projectId, Guid reporterId, string reason, string? evidenceUrl, string? reporterRole, string? reportType, string? description, string? disputeType, string? desiredResolution)
        {
            var projectExists = await _context.Projects.AnyAsync(x => x.Id == projectId);
            if (!projectExists) throw new KeyNotFoundException("Project to report/dispute not found.");

            var isClient = (reporterRole ?? string.Empty).ToLower() == "client";

            var report = new Report
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                ReporterId = reporterId,
                Reason = reason,
                EvidenceUrl = evidenceUrl,
                ReporterRole = reporterRole ?? string.Empty,
                ReportType = reportType ?? string.Empty,
                Description = description,
                DisputeType = disputeType,
                DesiredResolution = desiredResolution,
                CreatedAt = DateTime.UtcNow,
                Status = "Pending",
                HandlerStaffId = null,
                CurrentRoundClientSubmitted = isClient,
                CurrentRoundExpertSubmitted = !isClient,
                
                ClientExplanation = isClient ? description : null,
                ClientExplanationReason = isClient ? reason : null,
                ClientExplanationDescription = isClient ? description : null,
                ClientExplanationEvidence = isClient ? evidenceUrl : null,
                ClientExplanationDesiredResolution = isClient ? desiredResolution : null,

                ExpertExplanation = !isClient ? description : null,
                ExpertExplanationReason = !isClient ? reason : null,
                ExpertExplanationDescription = !isClient ? description : null,
                ExpertExplanationEvidence = !isClient ? evidenceUrl : null,
                ExpertExplanationDesiredResolution = !isClient ? desiredResolution : null
            };

            _context.Reports.Add(report);
            await _context.SaveChangesAsync();
            return report.Id;
        }

        public async Task<List<ReportDto>> GetSharedReportsQueueAsync(Guid staffId)
        {
            // CẬP NHẬT ĐIỀU KIỆN KIỂM TRA ROLE (CHẤP NHẬN CẢ STAFF, ADMIN VÀ OWNER):
            var isValidRole = await _context.Users.AnyAsync(x => 
                x.Id == staffId && 
                (x.Role.ToLower() == "staff" || x.Role.ToLower() == "admin" || x.Role.ToLower() == "owner") && 
                x.Status == "Active");
            if (!isValidRole) throw new UnauthorizedAccessException("This portal is restricted to active administration only.");

            return await _context.Reports
                .Include(r => r.Project).ThenInclude(p => p!.JobPost)
                .Include(r => r.Reporter)
                .Where(r => r.Status == "Pending")
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReportDto
                {
                    Id = r.Id,
                    ProjectId = r.ProjectId,
                    ProjectTitle = r.Project != null && r.Project.JobPost != null ? r.Project.JobPost.Title : string.Empty,
                    ProjectStartDate = r.Project != null ? r.Project.StartDate : null,
                    ProjectEndDate = r.Project != null ? r.Project.EndDate : null,
                    ReporterId = r.ReporterId,
                    ReporterName = r.Reporter != null ? r.Reporter.FullName : string.Empty,
                    ReporterRole = r.ReporterRole,
                    ReportType = r.ReportType,
                    Reason = r.Reason,
                    Description = r.Description,
                    DisputeType = r.DisputeType,
                    DesiredResolution = r.DesiredResolution,
                    EvidenceUrl = r.EvidenceUrl,
                    Status = r.Status,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<object> TriggerProjectDisputeLockAsync(Guid projectId, string reason, Guid staffId)
        {
            var staff = await _context.Users.AnyAsync(x => x.Id == staffId && (x.Role.ToLower() == "staff" || x.Role.ToLower() == "admin") && x.Status == "Active");
            if (!staff) throw new UnauthorizedAccessException("Only operating Staff have permission to trigger a finance lock.");

            // TỰ THỰC THI THAY VÌ GỌI QUA PROJECTSERVICE
            var project = await _context.Projects.FirstOrDefaultAsync(x => x.Id == projectId);
            if (project == null) throw new KeyNotFoundException("Project to execute escrow lock not found.");

            project.Status = "Disputed"; // Tự update trực tiếp

            var dispute = new Dispute
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                Reason = reason,
                CreatedAt = DateTime.UtcNow,
                EvidenceDeadline = DateTime.UtcNow.AddDays(3),
                Status = "Pending",
                HandlerStaffId = staffId
            };

            _context.Disputes.Add(dispute);
            await _context.SaveChangesAsync();

            return new {
                DisputeId = dispute.Id,
                Deadline = dispute.EvidenceDeadline,
                NotificationMessage = $"[ESCROW SYSTEM] Project {projectId} has transitioned to Disputed status. Escrow balance strictly locked."
            };
        }

        public async Task<object> ExecuteDisputeVerdictAsync(Guid disputeId, string winnerRole, string verdictReason, Guid staffId)
        {
            var staff = await _context.Users.AnyAsync(x => x.Id == staffId && (x.Role.ToLower() == "staff" || x.Role.ToLower() == "admin") && x.Status == "Active");
            if (!staff) throw new UnauthorizedAccessException("Only Staff have permission to execute financial verdicts.");

            var dispute = await _context.Disputes.FirstOrDefaultAsync(x => x.Id == disputeId);
            if (dispute == null) throw new KeyNotFoundException("Dispute record not found.");
            if (dispute.Status == "Resolved") throw new InvalidOperationException("This dispute has already been resolved.");

            // TỰ THỰC THI LOGIC DÒNG TIỀN TRỰC TIẾP TẠI ĐÂY
            var project = await _context.Projects.FirstOrDefaultAsync(x => x.Id == dispute.ProjectId);
            if (project == null) throw new KeyNotFoundException("Related project not found.");

            decimal moneyToTransfer = project.EscrowBalance;
            if (moneyToTransfer <= 0) throw new InvalidOperationException("Locked escrow balance is 0 or invalid.");

            if (winnerRole.ToLower() == "expert") {
                project.Status = "Withdrawn"; 
            } else if (winnerRole.ToLower() == "client") {
                project.Status = "Cancelled"; 
            }
            project.EscrowBalance = 0; // Xóa quỹ dự án

            Guid targetUserId = (winnerRole.ToLower() == "expert") ? project.ExpertId : project.ClientId;
            var targetWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == targetUserId);
            if (targetWallet == null) throw new KeyNotFoundException("Recipient's platform wallet not found.");

            targetWallet.Balance += moneyToTransfer;

            dispute.Status = "Resolved";
            dispute.ResolutionVerdict = verdictReason;
            dispute.HandlerStaffId = staffId;

            var transaction = new InteractionModule.TransactionLog
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                SourceWalletId = project.ClientId, // Tiền từ ký quỹ của Client
                DestinationWalletId = targetWallet.UserId, // Chuyển về ví người thắng
                Amount = moneyToTransfer,
                Type = (winnerRole.ToLower() == "expert") ? "ReleasePayment" : "EscrowRefund",
                CreatedAt = DateTime.UtcNow
            };

            _context.TransactionLogs.Add(transaction);
            await _context.SaveChangesAsync();

            return new {
                TransferredAmount = moneyToTransfer,
                WinnerWalletBalance = targetWallet.Balance
            };
        }
    }
}