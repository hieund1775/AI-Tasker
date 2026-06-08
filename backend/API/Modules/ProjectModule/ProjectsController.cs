using Microsoft.AspNetCore.Mvc;

namespace AITasker_Modular.Modules.ProjectModule;

[ApiController]
[Route("api/projects")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _service;

    public ProjectsController(IProjectService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        return Ok(await _service.GetProjectsAsync());
    }

    [HttpPost("progress")]
    public async Task<IActionResult> Progress(string projectId, string status) // Changed Guid to string
    {
        return Ok(await _service.UpdateProgressAsync(projectId, status));
    }
}
