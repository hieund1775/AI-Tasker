using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

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

        [HttpGet("client/{clientId:guid}")]
        public async Task<IActionResult> GetByClient(Guid clientId)
        {
            var result = await _projectService.GetProjectsByClientAsync(clientId);
            return Ok(result);
        }

        [HttpGet("expert/{expertId:guid}")]
        public async Task<IActionResult> GetByExpert(Guid expertId)
        {
            var result = await _projectService.GetProjectsByExpertAsync(expertId);
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
    }
}