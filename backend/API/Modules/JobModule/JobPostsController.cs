using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.JobModule.DTOs; // Import DTO
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Helpers;

namespace AITasker_Modular.Modules.JobModule;

[ApiController]
[Route("api/jobposts")]
public class JobPostsController : ControllerBase
{
    private readonly IJobService _service;
    private readonly IUserService _userService;

    public JobPostsController(IJobService service, IUserService userService)
    {
        _service = service;
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        return Ok(await _service.GetJobsAsync());
    }

    [HttpGet("{id}")] // New endpoint to get a single job post by ID
    public async Task<IActionResult> Get(string id)
    {
        var jobPost = await _service.GetJobPostByIdAsync(id);
        if (jobPost == null)
        {
            return NotFound(); // Return 404 if job post not found
        }
        return Ok(jobPost);
    }

    [HttpPost] // RESTful POST for creating a new resource
    public async Task<IActionResult> CreateJobPost([FromBody] CreateJobPostDto jobPostDto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState); // Return 400 if DTO is invalid

        var createdJobPost = await _service.CreateJobAsync(jobPostDto);
        // Return 201 Created with a Location header pointing to the newly created resource
        return CreatedAtAction(nameof(Get), new { id = createdJobPost.Id }, createdJobPost);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateJobPost(string id, [FromBody] UpdateJobPostDto jobPostDto)
    {
        var (requesterId, errorResult) = this.GetRequesterId();
        if (errorResult != null)
            return errorResult;

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var jobPost = await _service.GetJobPostByIdAsync(id);
        if (jobPost == null)
            return NotFound(new { message = "Job post not found." });

        var isAdminOrOwner = await _userService.IsAdminOrOwnerAsync(requesterId!);
        var isCreator = jobPost.ClientId.ToString().Equals(requesterId, StringComparison.OrdinalIgnoreCase);

        if (!isAdminOrOwner && !isCreator)
            return StatusCode(403, new { message = "Only Admin, Owner, or the Client who created this job post can modify it." });

        var updated = await _service.UpdateJobPostAsync(id, jobPostDto);
        return Ok(updated);
    }
}
