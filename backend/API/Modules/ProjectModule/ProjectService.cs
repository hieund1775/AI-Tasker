using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using System;
using System.Linq;
using System.Threading.Tasks;
using ProjectTask = AITasker_Modular.Modules.ProjectModule.Task;

namespace AITasker_Modular.Modules.ProjectModule;

public class ProjectService : IProjectService
{
    private readonly DataContext _context;

    public ProjectService(DataContext context)
    {
        _context = context;
    }

    public async Task<MiniTask?> UpdateMiniTaskAsync(Guid miniTaskId, bool isCompleted, string? feedbackContent, Guid? feedbackSenderId, int? deadlineDays)
    {
        var miniTask = await _context.MiniTasks.FirstOrDefaultAsync(x => x.Id == miniTaskId);
        if (miniTask == null) return null;

        miniTask.IsCompleted = isCompleted;
        if (feedbackContent != null)
        {
            miniTask.FeedbackContent = feedbackContent;
        }
        
        // Cập nhật deadline nếu số ngày được truyền vào
        if (deadlineDays.HasValue)
        {
            miniTask.Deadline = DateTime.UtcNow.AddDays(deadlineDays.Value);
        }

        await _context.SaveChangesAsync();
        return miniTask;
    }

    public async Task<ProjectTask?> GetTaskWithTimelineAsync(Guid taskId)
    {
        return null; 
    }

    public async Task<ProjectTask?> UpdateTaskStatusAsync(Guid taskId, string status)
    {
        var task = await _context.ProjectTasks.FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null) return null;

        if (status.Equals("Pending Approval", StringComparison.OrdinalIgnoreCase))
        {
            var hasUncompleted = await _context.MiniTasks.AnyAsync(mt => mt.TaskId == taskId && !mt.IsCompleted);
            if (hasUncompleted)
            {
                throw new InvalidOperationException("Vui lòng hoàn thành tất cả các mini-task trước khi gửi duyệt.");
            }
        }

        task.Status = status;

        if (status.Equals("Completed", StringComparison.OrdinalIgnoreCase))
        {
            var project = await _context.Projects.FindAsync(task.ProjectId);
            if (project != null && project.Status != "Completed")
            {
                project.Status = "Completed"; 
                decimal totalBudget = project.EscrowBalance;

                decimal platformFee = totalBudget * 0.05m; 
                decimal expertNetPay = totalBudget - platformFee;

                var expertWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == project.ExpertId);
                if (expertWallet != null)
                {
                    expertWallet.Balance += expertNetPay;
                }

                var systemWallet = await _context.SystemWallets
                    .FirstOrDefaultAsync(w => w.Id == Guid.Parse("11111111-1111-1111-1111-111111111111"));
                if (systemWallet != null)
                {
                    systemWallet.TotalBalance += platformFee;
                    systemWallet.UpdatedAt = DateTime.UtcNow;
                }

                var log = new SystemTransactionLog
                {
                    Id = Guid.NewGuid(),
                    ProjectId = project.Id,
                    Amount = platformFee,
                    Type = "PlatformFee",
                    Description = $"Thu phí dịch vụ sàn 5% từ dự án {project.Id} hoàn thành.",
                    CreatedAt = DateTime.UtcNow
                };
                _context.SystemTransactionLogs.Add(log);

                project.EscrowBalance = 0; 
            }
        }

        await _context.SaveChangesAsync();
        return task;
    }

    public async Task<ProjectTask?> CreateTaskAsync(Guid projectId, string title)
    {
        return null;
    }

    public async Task<MiniTask?> CreateMiniTaskAsync(Guid taskId, string title, int? deadlineDays)
    {
        var miniTask = new MiniTask
        {
            Id = Guid.NewGuid(),
            TaskId = taskId,
            Title = title,
            IsCompleted = false,
            CreatedAt = DateTime.UtcNow,
            Deadline = deadlineDays.HasValue ? DateTime.UtcNow.AddDays(deadlineDays.Value) : null
        };

        _context.MiniTasks.Add(miniTask);
        await _context.SaveChangesAsync();
        return miniTask;
    }

    public async Task<bool> DeleteTaskAsync(Guid taskId)
    {
        var task = await _context.ProjectTasks.FindAsync(taskId);
        if (task == null) return false;
        _context.ProjectTasks.Remove(task);
        await _context.SaveChangesAsync();
        return true;
    }

    // ===================================================================================
    // KHỚP NỐI CHÍNH XÁC KIỂU TRẢ VỀ CỦA INTERFACE ĐỂ BUILD THÀNH CÔNG THẦN TỐC
    // ===================================================================================
    public async Task<System.Collections.Generic.IEnumerable<Project>> GetProjectsByClientAsync(Guid clientId) => await _context.Projects.Where(p => p.ClientId == clientId).ToListAsync();
    public async Task<System.Collections.Generic.IEnumerable<Project>> GetProjectsByExpertAsync(Guid expertId) => await _context.Projects.Where(p => p.ExpertId == expertId).ToListAsync();
    public async Task<Project?> UpdateProjectStatusAsync(Guid projectId, string status) => null;
    public async Task<Project?> SubmitProjectLinkAsync(Guid projectId, string projectLink) => null;
    public async Task<Project?> GetProjectByIdAsync(Guid projectId) => await _context.Projects
        .Include(p => p.Tasks)
        .ThenInclude(t => t.MiniTasks)
        .FirstOrDefaultAsync(p => p.Id == projectId);
        
    public async Task<bool> DeleteMiniTaskAsync(Guid miniTaskId)
    {
        var miniTask = await _context.MiniTasks.FindAsync(miniTaskId);
        if (miniTask == null) return false;
        _context.MiniTasks.Remove(miniTask);
        await _context.SaveChangesAsync();
        return true;
    }
    
    public async Task<ProjectTask?> SubmitTaskForReviewAsync(Guid taskId) => null;
    public async Task<ProjectTask?> ReviewTaskAsync(Guid taskId, bool isApproved, string? feedback, Guid reviewerId) => null;
    
    public async Task<Project?> CreateProjectFromProposalAsync(Guid proposalId)
    {
        var proposal = await _context.Proposals
            .Include(p => p.JobPost)
            .Include(p => p.ProposalTasks)
            .ThenInclude(pt => pt.ProposalMiniTasks)
            .FirstOrDefaultAsync(p => p.Id == proposalId);
            
        if (proposal == null) return null;

        // Check if project already exists for this job post
        var existingProject = await _context.Projects.FirstOrDefaultAsync(p => p.JobPostId == proposal.JobPostId);
        if (existingProject != null) return existingProject;

        // Create Project
        var project = new Project
        {
            Id = Guid.NewGuid(),
            JobPostId = proposal.JobPostId,
            ClientId = proposal.JobPost?.ClientId ?? Guid.Empty,
            ExpertId = proposal.ExpertId,
            EscrowBalance = proposal.BidAmount,
            Status = "In Progress",
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(proposal.EstimatedDuration)
        };

        _context.Projects.Add(project);

        // Copy WBS items (ProposalTasks and ProposalMiniTasks) to ProjectTasks and MiniTasks
        if (proposal.ProposalTasks != null && proposal.ProposalTasks.Any())
        {
            foreach (var propTask in proposal.ProposalTasks)
            {
                var projectTask = new ProjectTask
                {
                    Id = Guid.NewGuid(),
                    ProjectId = project.Id,
                    Title = propTask.Title,
                    Status = "In Progress",
                    UpdatedAt = DateTime.UtcNow
                };
                _context.ProjectTasks.Add(projectTask);

                if (propTask.ProposalMiniTasks != null && propTask.ProposalMiniTasks.Any())
                {
                    foreach (var propMini in propTask.ProposalMiniTasks)
                    {
                        var miniTask = new MiniTask
                        {
                            Id = Guid.NewGuid(),
                            TaskId = projectTask.Id,
                            Title = propMini.Title,
                            IsCompleted = false,
                            CreatedAt = DateTime.UtcNow,
                            Deadline = DateTime.UtcNow.AddDays(propMini.Duration)
                        };
                        _context.MiniTasks.Add(miniTask);
                    }
                }
            }
        }

        await _context.SaveChangesAsync();
        return project;
    }
    public async Task<bool> LockProjectForDisputeAsync(Guid projectId) => true;
    public async Task<decimal> PayoutDisputeEscrowAsync(Guid projectId, string decision) => 0m;
}
