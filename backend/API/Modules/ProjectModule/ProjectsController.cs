using System;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Modules.ProjectModule.DTOs;
using AITasker_Modular.Modules.InteractionModule;
using AITasker_Modular.Database;

namespace AITasker_Modular.Modules.ProjectModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;
        private readonly DataContext _context;

        public ProjectsController(IProjectService projectService, DataContext context)
        {
            _projectService = projectService;
            _context = context;
        }

        #region Project Endpoints

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id, [FromQuery] string role = "expert")
        {
            var project = await _projectService.GetProjectByIdAsync(id);
            if (project == null) return NotFound("Project not found.");

            if (role?.Trim().ToLowerInvariant() == "client")
            {
                return Ok(MapToClientView(project));
            }
            return Ok(MapToExpertView(project));
        }

        [HttpGet("client/{clientId:guid}")]
        public async Task<IActionResult> GetByClient(Guid clientId)
        {
            var projects = await _projectService.GetProjectsByClientAsync(clientId);
            var result = projects.Select(MapToClientView).ToList();
            return Ok(result);
        }

        [HttpGet("expert/{expertId:guid}")]
        public async Task<IActionResult> GetByExpert(Guid expertId)
        {
            var projects = await _projectService.GetProjectsByExpertAsync(expertId);
            var result = projects.Select(MapToExpertView).ToList();
            return Ok(result);
        }

        [HttpPut("{id:guid}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] string status)
        {
            var result = await _projectService.UpdateProjectStatusAsync(id, status);
            if (result == null) return NotFound("Project not found.");
            return Ok(result);
        }

        [HttpPost("{id:guid}/submit-work")]
        public async Task<IActionResult> SubmitWork(Guid id, [FromBody] SubmitWorkDto dto)
        {
            if (dto == null || string.IsNullOrEmpty(dto.ProjectLink)) return BadRequest("Product link cannot be empty.");
            
            var result = await _projectService.SubmitProjectLinkAsync(id, dto.ProjectLink);
            if (result == null) return NotFound("Project not found.");
            return Ok(result);
        }

        [HttpPost("proposal/{proposalId:guid}")]
        public async Task<IActionResult> CreateProjectFromProposal(Guid proposalId)
        {
            try
            {
                var result = await _projectService.CreateProjectFromProposalAsync(proposalId);
                if (result == null) return NotFound("Proposal not found.");
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// [FIX] Ký quỹ: Client trả tiền escrow cho dự án.
        /// - Trừ Balance của Client.
        /// - Cộng vào EscrowBalance của ví Client.
        /// - Tự động cập nhật trạng thái Project, JobPost, Proposal.
        /// </summary>
        [HttpPost("{id:guid}/escrow-deposit")]
        public async Task<IActionResult> EscrowDeposit(Guid id, [FromBody] EscrowDepositDto dto)
        {
            if (dto == null || dto.ClientId == Guid.Empty)
                return BadRequest("Invalid escrow data.");

            var project = await _context.Projects
                .Include(p => p.JobPost)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (project == null) return NotFound("Project not found.");

            var amount = dto.Amount > 0 ? dto.Amount : project.EscrowBalance;
            if (amount <= 0)
                return BadRequest("Escrow amount must be greater than 0.");

            var clientWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == dto.ClientId);
            if (clientWallet == null) return NotFound("Client wallet not found.");

            if (clientWallet.Balance < amount)
                return BadRequest($"Insufficient balance. Need {amount:N0} VND but only have {clientWallet.Balance:N0} VND.");

            // Trừ tiền khả dụng và cộng vào escrow của ví Client
            clientWallet.Balance -= amount;
            clientWallet.EscrowBalance += amount;

            // Cập nhật trạng thái đồng bộ
            project.Status = "In Progress";
            project.EscrowBalance = amount;

            if (project.JobPostId.HasValue)
            {
                var jobPost = await _context.JobPosts.FindAsync(project.JobPostId.Value);
                if (jobPost != null) jobPost.Status = "In Progress";

                // Đánh dấu Proposal được chấp nhận
                var proposal = await _context.Proposals
                    .FirstOrDefaultAsync(p => p.JobPostId == project.JobPostId.Value && p.ExpertId == project.ExpertId);
                if (proposal != null) proposal.Status = "Accepted";
            }

            // Ghi lịch sử giao dịch
            _context.TransactionLogs.Add(new TransactionLog
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                SourceWalletId = clientWallet.UserId,
                DestinationWalletId = null, // Giữ trong escrow
                Amount = amount,
                Type = "EscrowDeposit",
                CreatedAt = DateTime.UtcNow,
                Status = "Success",
                Description = $"Ký quỹ dự án: {project.JobPost?.Title ?? "Dự án"}"
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Escrow funded successfully.",
                ProjectId = project.Id,
                Amount = amount,
                ClientBalance = clientWallet.Balance,
                ClientEscrowBalance = clientWallet.EscrowBalance,
                ProjectStatus = project.Status
            });
        }

        /// <summary>
        /// [FIX] Giải ngân: Client xác nhận nghiệm thu, chuyển tiền escrow cho Expert.
        /// - Trừ EscrowBalance của Project.
        /// - Trừ EscrowBalance của ví Client.
        /// - Cộng tiền (sau khi trừ phí 5%) vào Balance + TotalEarned của ví Expert.
        /// </summary>
        [HttpPost("{id:guid}/release-payment")]
        public async Task<IActionResult> ReleasePayment(Guid id)
        {
            var project = await _context.Projects
                .Include(p => p.JobPost)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (project == null) return NotFound("Project not found.");

            if (project.EscrowBalance <= 0)
                return BadRequest("Project has no escrow balance to release.");

            var clientWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == project.ClientId);
            var expertWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == project.ExpertId);

            if (clientWallet == null) return NotFound("Client wallet not found.");
            if (expertWallet == null) return NotFound("Expert wallet not found.");

            decimal totalBudget = project.EscrowBalance;
            decimal platformFee = Math.Round(totalBudget * 0.05m, 2); // 5% phí sàn
            decimal expertNetPay = totalBudget - platformFee;

            // Trừ escrow của ví Client
            clientWallet.EscrowBalance = Math.Max(0, clientWallet.EscrowBalance - totalBudget);

            // Cộng vào ví Expert
            expertWallet.Balance += expertNetPay;
            expertWallet.TotalEarned += expertNetPay;

            // Thu phí sàn vào SystemWallet
            var systemWallet = await _context.SystemWallets
                .FirstOrDefaultAsync(w => w.Id == Guid.Parse("11111111-1111-1111-1111-111111111111"));
            if (systemWallet != null)
            {
                systemWallet.TotalBalance += platformFee;
                systemWallet.UpdatedAt = DateTime.UtcNow;
            }

            // Cập nhật dự án
            project.EscrowBalance = 0;
            project.Status = "Completed";

            if (project.JobPostId.HasValue)
            {
                var jobPost = await _context.JobPosts.FindAsync(project.JobPostId.Value);
                if (jobPost != null) jobPost.Status = "Completed";
            }

            // Ghi lịch sử giao dịch
            _context.TransactionLogs.Add(new TransactionLog
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                SourceWalletId = clientWallet.UserId,
                DestinationWalletId = expertWallet.UserId,
                Amount = expertNetPay,
                Type = "ReleasePayment",
                CreatedAt = DateTime.UtcNow,
                Status = "Success",
                PlatformFee = platformFee,
                Description = $"Giải ngân dự án: {project.JobPost?.Title ?? "Dự án"}"
            });

            // Ghi phí sàn vào SystemTransactionLogs
            _context.SystemTransactionLogs.Add(new SystemTransactionLog
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                Amount = platformFee,
                Type = "PlatformFee",
                Description = $"Thu phí dịch vụ sàn 5% từ dự án {project.Id} - giải ngân.",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Payment released successfully.",
                ProjectId = project.Id,
                TotalBudget = totalBudget,
                PlatformFee = platformFee,
                ExpertNetPay = expertNetPay,
                ExpertBalance = expertWallet.Balance,
                ExpertTotalEarned = expertWallet.TotalEarned,
                ProjectStatus = project.Status
            });
        }

        [HttpGet("{projectId:guid}/tasks")]
        public async Task<IActionResult> GetProjectTasks(Guid projectId)
        {
            var project = await _projectService.GetProjectByIdAsync(projectId);
            if (project == null) return NotFound("Project not found.");
            
            var tasks = project.Tasks.Select(t => new ExpertTaskDto
            {
                Id = t.Id,
                ProjectId = t.ProjectId,
                Title = t.Title,
                Status = t.Status,
                UpdatedAt = t.UpdatedAt,
                FeedbackContent = t.FeedbackContent,
                FeedbackSenderId = t.FeedbackSenderId,
                Deadline = t.Deadline,
                Notes = t.Notes,
                MiniTasks = t.MiniTasks.Select(mt => new ProjectMiniTaskDto
                {
                    Id = mt.Id,
                    TaskId = mt.TaskId,
                    Title = mt.Title,
                    IsCompleted = mt.IsCompleted,
                    FeedbackContent = mt.FeedbackContent,
                    FeedbackSenderId = mt.FeedbackSenderId,
                    CreatedAt = mt.CreatedAt,
                    Deadline = mt.Deadline,
                    ProductLink = mt.ProductLink, // THÊM MỚI MAPPING
                    ProductFile = mt.ProductFile  // THÊM MỚI MAPPING
                }).ToList()
            }).ToList();
            
            return Ok(tasks);
        }

        #endregion

        #region Task Endpoints

        [HttpGet("tasks/{taskId:guid}")]
        public async Task<IActionResult> GetTaskById(Guid taskId)
        {
            var result = await _projectService.GetTaskWithTimelineAsync(taskId);
            if (result == null) return NotFound("Task not found.");
            return Ok(result);
        }

        [HttpPost("{projectId:guid}/tasks")]
        public async Task<IActionResult> CreateTask(Guid projectId, [FromBody] CreateTaskDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Task title cannot be empty.");

            var result = await _projectService.CreateTaskAsync(projectId, dto.Title);
            if (result == null)
                return NotFound("Project not found.");

            return CreatedAtAction(nameof(GetTaskById), new { taskId = result.Id }, result);
        }

        [HttpPut("tasks/{taskId:guid}/status")]
        public async Task<IActionResult> UpdateTaskStatus(Guid taskId, [FromQuery] string status)
        {
            if (string.IsNullOrEmpty(status)) return BadRequest("Status cannot be empty.");
            var result = await _projectService.UpdateTaskStatusAsync(taskId, status);
            if (result == null) return NotFound("Task not found.");
            return Ok(result);
        }

        [HttpPost("tasks/{taskId:guid}/submit")]
        public async Task<IActionResult> SubmitTaskForReview(Guid taskId, [FromBody] SubmitTaskDto dto)
        {
            try
            {
                // Pass dto.Notes to save the submitted notes
                var result = await _projectService.SubmitTaskForReviewAsync(taskId, dto?.Notes);
                if (result == null)
                    return NotFound("Task not found.");

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("tasks/{taskId:guid}/review")]
        public async Task<IActionResult> ReviewTask(Guid taskId, [FromBody] ReviewTaskDto dto)
        {
            if (dto == null)
                return BadRequest("Invalid review data.");

            if (!dto.Approve && string.IsNullOrWhiteSpace(dto.FeedbackContent))
                return BadRequest("Please provide feedback when declining a task.");

            var result = await _projectService.ReviewTaskAsync(taskId, dto.Approve, dto.FeedbackContent, dto.FeedbackSenderId);
            if (result == null)
                return NotFound("Task not found.");

            return Ok(result);
        }

        #endregion

        #region MiniTask Endpoints

        [HttpPost("tasks/{taskId:guid}/minitasks")]
        public async Task<IActionResult> CreateMiniTask(Guid taskId, [FromBody] CreateMiniTaskDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Mini-task title cannot be empty.");

            var result = await _projectService.CreateMiniTaskAsync(taskId, dto.Title, dto.DeadlineDays);
            if (result == null)
                return NotFound("Task not found.");

            return Ok(result);
        }

        [HttpPut("minitasks/{miniTaskId:guid}")]
        public async Task<IActionResult> UpdateMiniTask(Guid miniTaskId, [FromBody] DTOs.UpdateMiniTaskDto dto)
        {
            var result = await _projectService.UpdateMiniTaskAsync(
                miniTaskId, 
                dto.Title, 
                dto.IsCompleted, 
                dto.FeedbackContent, 
                dto.FeedbackSenderId, 
                dto.DeadlineDays, 
                dto.ProductLink, 
                dto.ProductFile);
            if (result == null) return NotFound("Mini-task not found.");
            return Ok(result);
        }

        [HttpDelete("minitasks/{miniTaskId:guid}")]
        public async Task<IActionResult> DeleteMiniTask(Guid miniTaskId)
        {
            var success = await _projectService.DeleteMiniTaskAsync(miniTaskId);
            if (!success)
                return NotFound("Mini-task not found.");

            return NoContent();
        }

        #endregion

        #region Private Helper Methods

        private ClientViewProjectDto MapToClientView(Project project)
        {
            return new ClientViewProjectDto
            {
                Id = project.Id,
                JobPostId = project.JobPostId,
                ClientId = project.ClientId,
                ClientName = project.ClientName,
                ExpertId = project.ExpertId,
                Expert = project.ExpertName,
                EscrowBalance = project.EscrowBalance,
                Status = project.Status,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
                ProjectLink = project.ProjectLink,
                ConversationId = project.ConversationId,
                Title = project.JobPost?.Title ?? string.Empty,
                Budget = project.JobPost?.Budget ?? 0,
                Category = project.JobPost?.Domain?.Name,
                ProjectSkills = project.ProjectSkills.Select(ps => new ProjectSkillDto
                {
                    SkillId = ps.SkillsId,
                    SkillName = ps.Skill?.Name ?? string.Empty
                }).ToList(),
                Tasks = project.Tasks.Select(t => new ClientTaskDto
                {
                    Id = t.Id,
                    ProjectId = t.ProjectId,
                    Title = t.Title,
                    Status = t.Status,
                    UpdatedAt = t.UpdatedAt,
                    FeedbackContent = t.FeedbackContent,
                    FeedbackSenderId = t.FeedbackSenderId,
                    Deadline = t.Deadline,
                    Notes = t.Notes,
                    MiniTasks = t.MiniTasks.Select(mt => new ProjectMiniTaskDto
                    {
                        Id = mt.Id,
                        TaskId = mt.TaskId,
                        Title = mt.Title,
                        IsCompleted = mt.IsCompleted,
                        FeedbackContent = mt.FeedbackContent,
                        FeedbackSenderId = mt.FeedbackSenderId,
                        CreatedAt = mt.CreatedAt,
                        Deadline = mt.Deadline,
                        ProductLink = mt.ProductLink, // THÊM MỚI MAPPING
                        ProductFile = mt.ProductFile  // THÊM MỚI MAPPING
                    }).ToList()
                }).ToList()
            };
        }

        private ExpertViewProjectDto MapToExpertView(Project project)
        {
            return new ExpertViewProjectDto
            {
                Id = project.Id,
                JobPostId = project.JobPostId,
                ClientId = project.ClientId,
                ClientName = project.ClientName,
                ExpertId = project.ExpertId,
                Expert = project.ExpertName,
                EscrowBalance = project.EscrowBalance,
                Status = project.Status,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
                ProjectLink = project.ProjectLink,
                ConversationId = project.ConversationId,
                Title = project.JobPost?.Title ?? string.Empty,
                Budget = project.JobPost?.Budget ?? 0,
                Category = project.JobPost?.Domain?.Name,
                ProjectSkills = project.ProjectSkills.Select(ps => new ProjectSkillDto
                {
                    SkillId = ps.SkillsId,
                    SkillName = ps.Skill?.Name ?? string.Empty
                }).ToList(),
                Tasks = project.Tasks.Select(t => new ExpertTaskDto
                {
                    Id = t.Id,
                    ProjectId = t.ProjectId,
                    Title = t.Title,
                    Status = t.Status,
                    UpdatedAt = t.UpdatedAt,
                    FeedbackContent = t.FeedbackContent,
                    FeedbackSenderId = t.FeedbackSenderId,
                    Deadline = t.Deadline,
                    Notes = t.Notes,
                    MiniTasks = t.MiniTasks.Select(mt => new ProjectMiniTaskDto
                    {
                        Id = mt.Id,
                        TaskId = mt.TaskId,
                        Title = mt.Title,
                        IsCompleted = mt.IsCompleted,
                        FeedbackContent = mt.FeedbackContent,
                        FeedbackSenderId = mt.FeedbackSenderId,
                        CreatedAt = mt.CreatedAt,
                        Deadline = mt.Deadline,
                        ProductLink = mt.ProductLink, // THÊM MỚI MAPPING
                        ProductFile = mt.ProductFile  // THÊM MỚI MAPPING
                    }).ToList()
                }).ToList()
            };
        }

        #endregion
    }
}