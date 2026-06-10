using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.JobModule.DTOs; // Import DTO

namespace AITasker_Modular.Modules.JobModule;

[ApiController]
[Route("api/jobposts")]
public class JobPostsController : ControllerBase
{
    private readonly IJobService _service;

    public JobPostsController(IJobService service)
    {
        _service = service;
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
}
