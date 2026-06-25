using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.JobModule;

namespace AITasker_Modular.Modules.ProjectModule
{
    public class ProjectService : IProjectService
    {
        private readonly DataContext _context;

        public ProjectService(DataContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Project>> GetProjectsByClientAsync(Guid clientId)
        {
            return await _context.Projects
                .Where(x => x.ClientId == clientId)
                .Include(x => x.JobPost)
                .Include(x => x.Client)
                .Include(x => x.Expert)
                .Include(x => x.ProjectSkills)
                    .ThenInclude(ps => ps.Skill)
                .Include(x => x.Tasks)
                    .ThenInclude(t => t.MiniTasks)
                .ToListAsync();
        }

        public async Task<IEnumerable<Project>> GetProjectsByExpertAsync(Guid expertId)
        {
            return await _context.Projects
                .Where(x => x.ExpertId == expertId)
                .Include(x => x.JobPost)
                .Include(x => x.Client)
                .Include(x => x.Expert)
                .Include(x => x.ProjectSkills)
                    .ThenInclude(ps => ps.Skill)
                .Include(x => x.Tasks)
                    .ThenInclude(t => t.MiniTasks)
                .ToListAsync();
        }

        public async Task<Project?> UpdateProjectStatusAsync(Guid projectId, string status)
        {
            var project = await _context.Projects.FirstOrDefaultAsync(x => x.Id == projectId);
            if (project == null) return null;

            project.Status = status.Trim();
            await _context.SaveChangesAsync();
            return project;
        }

        public async Task<Project?> SubmitProjectLinkAsync(Guid projectId, string projectLink)
        {
            var project = await _context.Projects.FirstOrDefaultAsync(x => x.Id == projectId);
            if (project == null) return null;

            project.ProjectLink = projectLink;
            project.Status = "Submitted"; // Chuyển sang trạng thái chờ Client duyệt nghiệm thu
            
            await _context.SaveChangesAsync();
            return project;
        }

        public async Task<Project?> GetProjectByIdAsync(Guid projectId)
        {
            return await _context.Projects
                .Include(x => x.JobPost)
                .Include(x => x.Client)
                .Include(x => x.Expert)
                .Include(x => x.ProjectSkills)
                    .ThenInclude(ps => ps.Skill)
                .Include(x => x.Tasks)
                    .ThenInclude(t => t.MiniTasks)
                .FirstOrDefaultAsync(x => x.Id == projectId);
        }

        public async Task<MiniTask?> UpdateMiniTaskAsync(Guid miniTaskId, bool isCompleted, string? feedbackContent, Guid? feedbackSenderId)
        {
            var miniTask = await _context.MiniTasks.FirstOrDefaultAsync(x => x.Id == miniTaskId);
            if (miniTask == null) return null;

            miniTask.IsCompleted = isCompleted;
            
            if (feedbackContent != null)
            {
                miniTask.FeedbackContent = feedbackContent;
            }
            if (feedbackSenderId != null)
            {
                miniTask.FeedbackSenderId = feedbackSenderId;
            }

            await _context.SaveChangesAsync();
            return miniTask;
        }

        public async Task<Task?> GetTaskWithTimelineAsync(Guid taskId)
        {
            return await _context.ProjectTasks
                .Include(t => t.Project)
                .Include(t => t.MiniTasks)
                .FirstOrDefaultAsync(t => t.Id == taskId);
        }

        public async Task<Task?> UpdateTaskStatusAsync(Guid taskId, string status)
        {
            var task = await _context.ProjectTasks.FirstOrDefaultAsync(x => x.Id == taskId);
            if (task == null) return null;

            task.Status = status;
            task.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return task;
        }

        public async Task<Task?> CreateTaskAsync(Guid projectId, string title)
        {
            var projectExists = await _context.Projects.AnyAsync(x => x.Id == projectId);
            if (!projectExists) return null;

            var task = new Task
            {
                Id = Guid.NewGuid(),
                ProjectId = projectId,
                Title = title.Trim(),
                Status = "In Progress",
                UpdatedAt = DateTime.UtcNow
            };

            _context.ProjectTasks.Add(task);
            await _context.SaveChangesAsync();
            return task;
        }

        public async Task<MiniTask?> CreateMiniTaskAsync(Guid taskId, string title)
        {
            var taskExists = await _context.ProjectTasks.AnyAsync(x => x.Id == taskId);
            if (!taskExists) return null;

            var miniTask = new MiniTask
            {
                Id = Guid.NewGuid(),
                TaskId = taskId,
                Title = title.Trim(),
                IsCompleted = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.MiniTasks.Add(miniTask);
            await _context.SaveChangesAsync();
            return miniTask;
        }

        public async Task<bool> DeleteTaskAsync(Guid taskId)
        {
            var task = await _context.ProjectTasks.FirstOrDefaultAsync(x => x.Id == taskId);
            if (task == null) return false;

            _context.ProjectTasks.Remove(task);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteMiniTaskAsync(Guid miniTaskId)
        {
            var miniTask = await _context.MiniTasks.FirstOrDefaultAsync(x => x.Id == miniTaskId);
            if (miniTask == null) return false;

            _context.MiniTasks.Remove(miniTask);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<Task?> SubmitTaskForReviewAsync(Guid taskId)
        {
            var task = await _context.ProjectTasks
                .Include(t => t.MiniTasks)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null) return null;

            if (task.MiniTasks.Count == 0)
            {
                throw new InvalidOperationException("Không thể gửi duyệt task không có mini-task nào.");
            }

            if (task.MiniTasks.Any(mt => !mt.IsCompleted))
            {
                throw new InvalidOperationException("Vui lòng hoàn thành tất cả các mini-task trước khi gửi duyệt.");
            }

            task.Status = "Pending Approval";
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return task;
        }

        public async Task<Task?> ReviewTaskAsync(Guid taskId, bool approve, string? feedbackContent, Guid feedbackSenderId)
        {
            var task = await _context.ProjectTasks
                .Include(t => t.Project)
                .Include(t => t.MiniTasks)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null) return null;

            if (approve)
            {
                task.Status = "Succeeded";
                task.FeedbackContent = null;
                task.FeedbackSenderId = null;
            }
            else
            {
                task.Status = "In Progress";
                task.FeedbackContent = feedbackContent;
                task.FeedbackSenderId = feedbackSenderId;
            }

            task.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return task;
        }

        public async Task<Project?> CreateProjectFromProposalAsync(Guid proposalId)
        {
            var proposal = await _context.Proposals
                .Include(p => p.JobPost)
                .Include(p => p.Expert)
                .FirstOrDefaultAsync(p => p.Id == proposalId);

            if (proposal == null) return null;

            var isProjectExists = await _context.Projects.AnyAsync(p => p.JobPostId == proposal.JobPostId);
            if (isProjectExists)
            {
                throw new InvalidOperationException("Dự án cho công việc này đã tồn tại.");
            }

            if (proposal.JobPost == null)
            {
                throw new InvalidOperationException("Không tìm thấy thông tin công việc liên quan.");
            }

            // Calculate EscrowBalance prioritizing proposal bid amount, fallback to jobpost budget
            decimal escrowBalance = proposal.BidAmount > 0 
                ? proposal.BidAmount 
                : proposal.JobPost.Budget;

            // Calculate EndDate prioritizing proposal estimated duration (in days)
            DateTime startDate = DateTime.UtcNow;
            DateTime endDate = startDate.AddDays(30); // Default fallback 30 days

            if (proposal.EstimatedDuration > 0)
            {
                endDate = startDate.AddDays(proposal.EstimatedDuration);
            }
            else
            {
                if (proposal.JobPost.DurationValue > 0)
                {
                    var unit = proposal.JobPost.DurationUnit?.Trim().ToLowerInvariant();
                    if (unit == "days" || unit == "day")
                    {
                        endDate = startDate.AddDays(proposal.JobPost.DurationValue);
                    }
                    else if (unit == "weeks" || unit == "week")
                    {
                        endDate = startDate.AddDays(proposal.JobPost.DurationValue * 7);
                    }
                    else if (unit == "months" || unit == "month")
                    {
                        endDate = startDate.AddMonths(proposal.JobPost.DurationValue);
                    }
                    else
                    {
                        endDate = startDate.AddDays(proposal.JobPost.DurationValue);
                    }
                }
                else if (proposal.JobPost.Deadline > 0)
                {
                    endDate = startDate.AddDays(proposal.JobPost.Deadline);
                }
            }

            var newProject = new Project
            {
                Id = Guid.NewGuid(),
                JobPostId = proposal.JobPostId,
                ClientId = proposal.JobPost.ClientId,
                ExpertId = proposal.ExpertId,
                EscrowBalance = escrowBalance,
                Status = "In Progress",
                StartDate = startDate,
                EndDate = endDate
            };

            _context.Projects.Add(newProject);
            proposal.JobPost.Status = "In Progress";
            proposal.Status = "Accepted"; // Mark proposal as accepted too!

            // Copy skills from JobPost to ProjectSkill table
            var jobPostSkills = await _context.JobPostSkills
                .Where(jps => jps.JobPostsId == proposal.JobPostId)
                .ToListAsync();

            foreach (var jps in jobPostSkills)
            {
                var projectSkill = new ProjectSkill
                {
                    ProjectsId = newProject.Id,
                    SkillsId = jps.SkillsId
                };
                _context.ProjectSkills.Add(projectSkill);
            }

            // Tạo ProjectTask từ JobPost JobRequirements (usecases)
            var jobRequirements = await _context.JobRequirements
                .Where(jr => jr.JobPostId == proposal.JobPostId)
                .ToListAsync();

            foreach (var req in jobRequirements)
            {
                var task = new Task
                {
                    Id = Guid.NewGuid(),
                    ProjectId = newProject.Id,
                    Title = req.UseCaseName,
                    Status = "In Progress",
                    UpdatedAt = DateTime.UtcNow
                };
                _context.ProjectTasks.Add(task);
            }

            await _context.SaveChangesAsync();
            return await GetProjectByIdAsync(newProject.Id);
        }

        // ======================================================================
        // ĐỤC THÊM LOGIC ĐẶC QUYỀN TÀI PHÁN ĐỂ ĐỒNG BỘ LIÊN MODULE VỚI DISPUTEMODULE
        // ======================================================================

        public async Task<bool> LockProjectForDisputeAsync(Guid projectId)
        {
            var project = await _context.Projects.FirstOrDefaultAsync(x => x.Id == projectId);
            if (project == null) return false;

            project.Status = "Disputed"; // Đóng băng trạng thái hợp đồng dự án
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<decimal> PayoutDisputeEscrowAsync(Guid projectId, string winnerRole)
        {
            var project = await _context.Projects.FirstOrDefaultAsync(x => x.Id == projectId);
            if (project == null) return 0;

            decimal moneyToTransfer = project.EscrowBalance;
            if (moneyToTransfer <= 0) return 0;

            // Phân định trạng thái kết thúc dự án dựa theo phán quyết của Staff
            if (winnerRole.ToLower() == "expert") {
                project.Status = "Withdrawn"; 
            } else if (winnerRole.ToLower() == "client") {
                project.Status = "Cancelled"; 
            }

            project.EscrowBalance = 0; // Trút sạch tiền ký quỹ đóng băng về 0
            await _context.SaveChangesAsync();

            return moneyToTransfer; // Trả số tiền cào được ra ngoài cho DisputeService đem đi phân phối về Ví
        }
    }
}
