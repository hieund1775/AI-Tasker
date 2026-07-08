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

        private class TaskDto
        {
            public string Title { get; set; } = string.Empty;
            public List<MiniTaskDto> MiniTasks { get; set; } = new();
        }

        private class MiniTaskDto
        {
            public string Title { get; set; } = string.Empty;
            public int Duration { get; set; }
        }

        public ProjectService(DataContext context)
        {
        _context = context;
    }

    public async Task<MiniTask?> UpdateMiniTaskAsync(Guid miniTaskId, string? title, bool isCompleted, string? feedbackContent, Guid? feedbackSenderId, int? deadlineDays, string? productLink, string? productFile)
    {
        var miniTask = await _context.MiniTasks.FirstOrDefaultAsync(x => x.Id == miniTaskId);
        if (miniTask == null) return null;

        if (!string.IsNullOrEmpty(title))
        {
            miniTask.Title = title;
        }

        miniTask.IsCompleted = isCompleted;
        if (feedbackContent != null)
        {
            miniTask.FeedbackContent = feedbackContent;
        }
        
        // Cáº­p nháº­t deadline náº¿u sá»‘ ngÃ y Ä‘Æ°á»£c truyá»n vÃ o
        if (deadlineDays.HasValue)
        {
            miniTask.Deadline = DateTime.UtcNow.AddDays(deadlineDays.Value);
        }

        miniTask.ProductLink = productLink;
        miniTask.ProductFile = productFile;

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
                throw new InvalidOperationException("Vui lÃ²ng hoÃ n thÃ nh táº¥t cáº£ cÃ¡c mini-task trÆ°á»›c khi gá»­i duyá»‡t.");
            }
        }

        task.Status = status;

        await _context.SaveChangesAsync();
        return task;
    }

    public async Task<ProjectTask?> CreateTaskAsync(Guid projectId, string title)
    {
        var task = new ProjectTask
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Title = title,
            Status = "In Progress",
            UpdatedAt = DateTime.UtcNow
        };
        _context.ProjectTasks.Add(task);
        await _context.SaveChangesAsync();
        return task;
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
    // KHá»šP Ná»I CHÃNH XÃC KIá»‚U TRáº¢ Vá»€ Cá»¦A INTERFACE Äá»‚ BUILD THÃ€NH CÃ”NG THáº¦N Tá»C
    // ===================================================================================
    public async Task<System.Collections.Generic.IEnumerable<Project>> GetProjectsByClientAsync(Guid clientId) => await _context.Projects
        .Include(p => p.JobPost).ThenInclude(jp => jp!.Domain)
        .Include(p => p.Client)
        .Include(p => p.Expert)
        .Include(p => p.Tasks).ThenInclude(t => t.MiniTasks)
        .Include(p => p.ProjectSkills).ThenInclude(ps => ps.Skill)
        .Where(p => p.ClientId == clientId).ToListAsync();
    public async Task<System.Collections.Generic.IEnumerable<Project>> GetProjectsByExpertAsync(Guid expertId) => await _context.Projects
        .Include(p => p.JobPost).ThenInclude(jp => jp!.Domain)
        .Include(p => p.Client)
        .Include(p => p.Expert)
        .Include(p => p.Tasks).ThenInclude(t => t.MiniTasks)
        .Include(p => p.ProjectSkills).ThenInclude(ps => ps.Skill)
        .Where(p => p.ExpertId == expertId).ToListAsync();
    public async Task<Project?> UpdateProjectStatusAsync(Guid projectId, string status) => null;
    public async Task<Project?> SubmitProjectLinkAsync(Guid projectId, string projectLink)
    {
        var project = await _context.Projects.FindAsync(projectId);
        if (project == null) return null;
        
        project.ProjectLink = projectLink;
        project.Status = "under_review";
        await _context.SaveChangesAsync();
        return project;
    }
    public async Task<Project?> GetProjectByIdAsync(Guid projectId) => await _context.Projects
        .Include(p => p.Tasks)
        .ThenInclude(t => t.MiniTasks)
        .Include(p => p.Client)
        .Include(p => p.Expert)
        .Include(p => p.ProjectSkills).ThenInclude(ps => ps.Skill)
        .FirstOrDefaultAsync(p => p.Id == projectId);
        
    public async Task<bool> DeleteMiniTaskAsync(Guid miniTaskId)
    {
        var miniTask = await _context.MiniTasks.FindAsync(miniTaskId);
        if (miniTask == null) return false;
        _context.MiniTasks.Remove(miniTask);
        await _context.SaveChangesAsync();
        return true;
    }
    
    public async Task<ProjectTask?> SubmitTaskForReviewAsync(Guid taskId, string? notes = null)
    {
        var task = await _context.ProjectTasks.FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null) return null;
        
        task.Status = "Pending Approval";
        if (notes != null)
        {
            task.Notes = notes;
        }
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return task;
    }

    public async Task<ProjectTask?> ReviewTaskAsync(Guid taskId, bool isApproved, string? feedback, Guid reviewerId)
    {
        var task = await _context.ProjectTasks.FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null) return null;
        
        task.FeedbackContent = feedback;
        task.FeedbackSenderId = reviewerId;

        if (isApproved)
        {
            await _context.SaveChangesAsync();
            return await UpdateTaskStatusAsync(taskId, "Completed");
        }
        else
        {
            task.Status = "In Progress";
            task.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return task;
        }
    }
    
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
            Status = "Pending Escrow",
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(proposal.EstimatedDuration)
        };

        _context.Projects.Add(project);

        // [FIX 2.2] Tu dong doi trang thai JobPost sang Pending Escrow de FE an khoi danh sach tuyen
        if (proposal.JobPost != null)
        {
            proposal.JobPost.Status = "Pending Escrow";
        }

        // Copy WBS items (ProposalTasks and ProposalMiniTasks) to ProjectTasks and MiniTasks
        if (proposal.ProposalTasks != null && proposal.ProposalTasks.Any())
        {
            foreach (var propTask in proposal.ProposalTasks)
            {
                if (!string.IsNullOrWhiteSpace(propTask.Title) && propTask.Title.Trim().StartsWith("["))
                {
                    try
                    {
                        var taskDtos = System.Text.Json.JsonSerializer.Deserialize<List<TaskDto>>(propTask.Title);
                        if (taskDtos != null)
                        {
                            foreach (var tDto in taskDtos)
                            {
                                var pt = new ProjectTask
                                {
                                    Id = Guid.NewGuid(),
                                    ProjectId = project.Id,
                                    Title = tDto.Title,
                                    Status = "In Progress",
                                    UpdatedAt = DateTime.UtcNow
                                };
                                _context.ProjectTasks.Add(pt);

                                if (tDto.MiniTasks != null && tDto.MiniTasks.Any())
                                {
                                    foreach (var mDto in tDto.MiniTasks)
                                    {
                                        var mt = new MiniTask
                                        {
                                            Id = Guid.NewGuid(),
                                            TaskId = pt.Id,
                                            Title = mDto.Title,
                                            IsCompleted = false,
                                            CreatedAt = DateTime.UtcNow,
                                            Deadline = DateTime.UtcNow.AddDays(mDto.Duration)
                                        };
                                        _context.MiniTasks.Add(mt);
                                    }
                                }
                            }
                            continue; // Skip the normal fallback creation
                        }
                    }
                    catch
                    {
                        // Fallback below if parsing fails
                    }
                }

                // Normal creation / fallback
                var projectTask = new ProjectTask
                {
                    Id = Guid.NewGuid(),
                    ProjectId = project.Id,
                    Title = propTask.Title ?? "Untitled Task",
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
