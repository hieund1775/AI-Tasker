using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.JobModule; 
using AITasker_Modular.Modules.JobPostModule; 

namespace AITasker_Modular.Modules.JobPostModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class JobPostsController : ControllerBase
    {
        private readonly IJobPostService _jobService; 

        public JobPostsController(IJobPostService jobService)
        {
            _jobService = jobService;
        }

        [HttpGet("search-filter")]
        public async Task<IActionResult> GetFilteredJobs([FromQuery] string? search, [FromQuery] decimal? minBudget, [FromQuery] decimal? maxBudget, [FromQuery] string? status, [FromQuery] Guid? categoryDomainId)
        {
            var result = await _jobService.GetFilteredJobsAsync(search, minBudget, maxBudget, status, categoryDomainId);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllJobs()
        {
            var result = await _jobService.GetJobsAsync();
            return Ok(result);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetJobById(Guid id)
        {
            var result = await _jobService.GetJobPostByIdAsync(id);
            if (result == null) return NotFound("Không tìm thấy bài đăng yêu cầu.");
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> CreateJob([FromBody] JobPost jobPost)
        {
            var result = await _jobService.CreateJobAsync(jobPost);
            return Ok(result);
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateJob(Guid id, [FromBody] JobPost jobPost)
        {
            var result = await _jobService.UpdateJobPostAsync(id, jobPost);
            if (result == null) return NotFound("Không tìm thấy bài đăng để cập nhật.");
            return Ok(result);
        }
    }
}