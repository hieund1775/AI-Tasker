using System;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.ProjectModule.DTOs;

namespace AITasker_Modular.Modules.ProjectModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;

        public ProjectsController(IProjectService projectService)
        {
            _projectService = projectService;
        }

        #region Project Endpoints

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id, [FromQuery] string role = "expert")
        {
            var project = await _projectService.GetProjectByIdAsync(id);
            if (project == null) return NotFound("Không tìm thấy dự án tương ứng.");

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
            if (result == null) return NotFound("Không tìm thấy dự án tương ứng.");
            return Ok(result);
        }

        [HttpPut("{id:guid}/submit-work")]
        public async Task<IActionResult> SubmitWork(Guid id, [FromQuery] string projectLink)
        {
            if (string.IsNullOrEmpty(projectLink)) return BadRequest("Đường dẫn sản phẩm không được trống.");
            
            var result = await _projectService.SubmitProjectLinkAsync(id, projectLink);
            if (result == null) return NotFound("Không tìm thấy dự án tương ứng.");
            return Ok(result);
        }

        [HttpPost("proposal/{proposalId:guid}")]
        public async Task<IActionResult> CreateProjectFromProposal(Guid proposalId)
        {
            try
            {
                var result = await _projectService.CreateProjectFromProposalAsync(proposalId);
                if (result == null) return NotFound("Không tìm thấy hồ sơ đấu thầu tương ứng.");
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        #endregion

        #region Task Endpoints

        [HttpGet("tasks/{taskId:guid}")]
        public async Task<IActionResult> GetTaskById(Guid taskId)
        {
            var result = await _projectService.GetTaskWithTimelineAsync(taskId);
            if (result == null) return NotFound("Không tìm thấy task tương ứng.");
            return Ok(result);
        }

        [HttpPost("{projectId:guid}/tasks")]
        public async Task<IActionResult> CreateTask(Guid projectId, [FromBody] CreateTaskDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Tiêu đề task không được để trống.");

            var result = await _projectService.CreateTaskAsync(projectId, dto.Title);
            if (result == null)
                return NotFound("Không tìm thấy dự án tương ứng.");

            return CreatedAtAction(nameof(GetTaskById), new { taskId = result.Id }, result);
        }

        [HttpPut("tasks/{taskId:guid}/status")]
        public async Task<IActionResult> UpdateTaskStatus(Guid taskId, [FromQuery] string status)
        {
            if (string.IsNullOrEmpty(status)) return BadRequest("Trạng thái không được để trống.");
            var result = await _projectService.UpdateTaskStatusAsync(taskId, status);
            if (result == null) return NotFound("Không tìm thấy task tương ứng.");
            return Ok(result);
        }

        [HttpPost("tasks/{taskId:guid}/submit")]
        public async Task<IActionResult> SubmitTaskForReview(Guid taskId)
        {
            try
            {
                var result = await _projectService.SubmitTaskForReviewAsync(taskId);
                if (result == null)
                    return NotFound("Không tìm thấy task tương ứng.");

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
                return BadRequest("Dữ liệu đánh giá không hợp lệ.");

            if (!dto.Approve && string.IsNullOrWhiteSpace(dto.FeedbackContent))
                return BadRequest("Vui lòng cung cấp phản hồi (feedback) khi không duyệt task.");

            var result = await _projectService.ReviewTaskAsync(taskId, dto.Approve, dto.FeedbackContent, dto.FeedbackSenderId);
            if (result == null)
                return NotFound("Không tìm thấy task tương ứng.");

            return Ok(result);
        }

        #endregion

        #region MiniTask Endpoints

        [HttpPost("tasks/{taskId:guid}/minitasks")]
        public async Task<IActionResult> CreateMiniTask(Guid taskId, [FromBody] CreateMiniTaskDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Tiêu đề mini-task không được để trống.");

            var result = await _projectService.CreateMiniTaskAsync(taskId, dto.Title);
            if (result == null)
                return NotFound("Không tìm thấy task tương ứng.");

            return Ok(result);
        }

        [HttpPut("minitasks/{miniTaskId:guid}")]
        public async Task<IActionResult> UpdateMiniTask(Guid miniTaskId, [FromBody] DTOs.UpdateMiniTaskDto dto)
        {
            var result = await _projectService.UpdateMiniTaskAsync(miniTaskId, dto.IsCompleted, dto.FeedbackContent, dto.FeedbackSenderId);
            if (result == null) return NotFound("Không tìm thấy mini-task tương ứng.");
            return Ok(result);
        }

        [HttpDelete("minitasks/{miniTaskId:guid}")]
        public async Task<IActionResult> DeleteMiniTask(Guid miniTaskId)
        {
            var success = await _projectService.DeleteMiniTaskAsync(miniTaskId);
            if (!success)
                return NotFound("Không tìm thấy mini-task tương ứng.");

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
                    FeedbackSenderId = t.FeedbackSenderId
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
                    MiniTasks = t.MiniTasks.Select(mt => new ProjectMiniTaskDto
                    {
                        Id = mt.Id,
                        TaskId = mt.TaskId,
                        Title = mt.Title,
                        IsCompleted = mt.IsCompleted,
                        FeedbackContent = mt.FeedbackContent,
                        FeedbackSenderId = mt.FeedbackSenderId,
                        CreatedAt = mt.CreatedAt
                    }).ToList()
                }).ToList()
            };
        }

        #endregion
    }
}