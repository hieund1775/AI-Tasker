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

        public async Task<Guid> SubmitProjectReportAsync(Guid projectId, Guid reporterId, string reason, string? evidenceUrl)
        {
            var projectExists = await _context.Projects.AnyAsync(x => x.Id == projectId);
            if (!projectExists) throw new KeyNotFoundException("Không tìm thấy dự án tương ứng để khiếu nại.");

            var report = new Report
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                ReporterId = reporterId,
                Reason = reason,
                EvidenceUrl = evidenceUrl,
                CreatedAt = DateTime.UtcNow,
                Status = "Pending",
                HandlerStaffId = null
            };

            _context.Reports.Add(report);
            await _context.SaveChangesAsync();
            return report.Id;
        }

        public async Task<List<Report>> GetSharedReportsQueueAsync(Guid staffId)
        {
            var isStaff = await _context.Users.AnyAsync(x => x.Id == staffId && x.Role.ToLower() == "staff" && x.Status == "Active");
            if (!isStaff) throw new UnauthorizedAccessException("Cổng thông tin này chỉ dành riêng cho Staff đang hoạt động.");

            return await _context.Reports
                .Where(r => r.Status == "Pending")
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<object> TriggerProjectDisputeLockAsync(Guid projectId, string reason, Guid staffId)
        {
            var staff = await _context.Users.AnyAsync(x => x.Id == staffId && x.Role.ToLower() == "staff" && x.Status == "Active");
            if (!staff) throw new UnauthorizedAccessException("Chỉ Staff vận hành có quyền kích hoạt lệnh đóng băng tài chính.");

            // TỰ THỰC THI THAY VÌ GỌI QUA PROJECTSERVICE
            var project = await _context.Projects.FirstOrDefaultAsync(x => x.Id == projectId);
            if (project == null) throw new KeyNotFoundException("Không tìm thấy dự án tương ứng để thực thi lệnh khóa tiền.");

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
                NotificationMessage = $"[HỆ THỐNG TÀI PHÁN] Dự án {projectId} đã chuyển trạng thái Disputed. Dòng tiền đóng băng nghiêm ngặt."
            };
        }

        public async Task<object> ExecuteDisputeVerdictAsync(Guid disputeId, string winnerRole, string verdictReason, Guid staffId)
        {
            var staff = await _context.Users.AnyAsync(x => x.Id == staffId && x.Role.ToLower() == "staff" && x.Status == "Active");
            if (!staff) throw new UnauthorizedAccessException("Chỉ Staff có quyền thực thi phán quyết tài chính.");

            var dispute = await _context.Disputes.FirstOrDefaultAsync(x => x.Id == disputeId);
            if (dispute == null) throw new KeyNotFoundException("Không tìm thấy hồ sơ vụ tranh chấp này.");
            if (dispute.Status == "Resolved") throw new InvalidOperationException("Vụ việc tranh chấp này đã được phân xử xong.");

            // TỰ THỰC THI LOGIC DÒNG TIỀN TRỰC TIẾP TẠI ĐÂY
            var project = await _context.Projects.FirstOrDefaultAsync(x => x.Id == dispute.ProjectId);
            if (project == null) throw new KeyNotFoundException("Không tìm thấy dự án liên quan.");

            decimal moneyToTransfer = project.EscrowBalance;
            if (moneyToTransfer <= 0) throw new InvalidOperationException("Số tiền đóng băng bằng 0 hoặc không hợp lệ.");

            if (winnerRole.ToLower() == "expert") {
                project.Status = "Withdrawn"; 
            } else if (winnerRole.ToLower() == "client") {
                project.Status = "Cancelled"; 
            }
            project.EscrowBalance = 0; // Xóa quỹ dự án

            Guid targetUserId = (winnerRole.ToLower() == "expert") ? project.ExpertId : project.ClientId;
            var targetWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == targetUserId);
            if (targetWallet == null) throw new KeyNotFoundException("Không tìm thấy ví tiền trên sàn của người nhận.");

            targetWallet.Balance += moneyToTransfer;

            dispute.Status = "Resolved";
            dispute.ResolutionVerdict = verdictReason;
            dispute.HandlerStaffId = staffId;

            var transaction = new InteractionModule.TransactionLog
            {
                Id = Guid.NewGuid(),
                Amount = moneyToTransfer
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