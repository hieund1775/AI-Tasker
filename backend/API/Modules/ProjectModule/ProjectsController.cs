using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Helpers;

namespace AITasker_Modular.Modules.ProjectModule;

[ApiController]
[Route("api/projects")]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _service;
    private readonly IUserService _userService;

    public ProjectsController(IProjectService service, IUserService userService)
    {
        _service = service;
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var (_, errorResult) = await this.ValidateAdminOrOwnerAsync(_userService);
        if (errorResult != null)
            return errorResult;

        return Ok(await _service.GetProjectsAsync());
    }

    [HttpPost("progress")]
    public async Task<IActionResult> Progress(string projectId, string status) // Changed Guid to string
    {
        try
        {
            var project = await _service.UpdateProgressAsync(projectId, status);
            return Ok(project);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
