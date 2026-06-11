using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.JobModule; // Giữ lại nếu DTOs vẫn nằm bên folder cũ của Hùng
using AITasker_Modular.Modules.JobModule.DTOs;

namespace AITasker_Modular.Modules.JobPostModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class JobPostsController : ControllerBase
    {
        // Gọi chính xác Interface nằm trong JobPostModule của Minh
        private readonly IJobService _jobService;

        public JobPostsController(IJobService jobService)
        {
            _jobService = jobService;
        }

        // 1. API Bộ lọc nâng cao động bằng LINQ
        [HttpGet("search-filter")]
        public async Task<IActionResult> GetFilteredJobs(
            [FromQuery] string? search,
            [FromQuery] decimal? minBudget,
            [FromQuery] decimal? maxBudget,
            [FromQuery] string? status,
            [FromQuery] Guid? categoryDomainId)
        {
            var result = await _jobService.GetFilteredJobsAsync(search, minBudget, maxBudget, status, categoryDomainId);
            return Ok(result);
        }

        // 2. API Lấy tất cả bài đăng gốc
        [HttpGet]
        public async Task<IActionResult> GetAllJobs()
        {
            var result = await _jobService.GetJobsAsync();
            return Ok(result);
        }

        // 3. API Lấy chi tiết một bài đăng theo ID (Guid sạch)
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetJobById(Guid id)
        {
            var result = await _jobService.GetJobPostByIdAsync(id);
            if (result == null) return NotFound("Không tìm thấy bài đăng yêu cầu.");
            return Ok(result);
        }

        // 4. API Đăng bài tuyển dụng mới
        [HttpPost]
        public async Task<IActionResult> CreateJob([FromBody] CreateJobPostDto dto)
        {
            var result = await _jobService.CreateJobAsync(dto);
            return Ok(result);
        }

        // 5. API Cập nhật nội dung bài đăng tuyển dụng
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateJob(Guid id, [FromBody] UpdateJobPostDto dto)
        {
            var result = await _jobService.UpdateJobPostAsync(id, dto);
            if (result == null) return NotFound("Không tìm thấy bài đăng để cập nhật.");
            return Ok(result);
        }
    }
}