using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http; // ── THAO TÁC CƠ HỌC: BẮT BUỘC PHẢI THÊM ĐỂ HỆ THỐNG HIỂU IFormFile
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using AITasker_Modular.Modules.JobModule; 
using AITasker_Modular.Modules.JobPostModule; 

namespace AITasker_Modular.Modules.JobPostModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class JobPostsController : ControllerBase
    {
        private readonly IJobPostService _jobService; 
        private readonly IMemoryCache _cache;

        public JobPostsController(IJobPostService jobService, IMemoryCache cache)
        {
            _jobService = jobService;
            _cache = cache;
        }

        // ======================================================================
        // CỔNG THÊM MỚI 1: API UPLOAD TẬP TIN ĐA ĐỊNH DẠNG (GIỚI HẠN CỨNG 10MB)
        // ======================================================================
        [HttpPost("upload-file")]
        public async Task<IActionResult> UploadAttachment(IFormFile file)
        {
            try
            {
                var fileUrl = await _jobService.UploadAttachmentAsync(file);
                if (fileUrl == null) 
                {
                    return BadRequest("Tải tệp tin thất bại hoặc tệp dữ liệu rỗng.");
                }
                return Ok(new { Url = fileUrl });
            }
            catch (Exception ex)
            {
                // Bắt toàn bộ các ngoại lệ Validation (Sai extension, quá dung lượng) từ Service ném lên
                return BadRequest(ex.Message);
            }
        }

        // ======================================================================
        // CỔNG THÊM MỚI 2: API AI MILESTONE ENGINE - XUẤT PHÂN RÃ TÁC VỤ SANG FILE .MD
        // ======================================================================
        [HttpPost("generate-milestone-md/{proposalId:guid}")]
        public async Task<IActionResult> GenerateMilestoneMarkdown(Guid proposalId, [FromQuery] int taskCount, [FromQuery] int deadlineDays)
        {
            var fileUrl = await _jobService.GenerateMilestoneMarkdownAsync(proposalId, taskCount, deadlineDays);
            if (fileUrl == null) 
            {
                return NotFound("Không tìm thấy thông tin đề xuất (Proposal) hoặc bài đăng tương ứng.");
            }
            return Ok(new { FileUrl = fileUrl });
        }

        // ======================================================================
        // HỆ THỐNG API CRUD CŨ CỦA BẠN HÙNG (ĐƯỢC BẢO TOÀN NGUYÊN VẸN 100%)
        // ======================================================================
        [HttpGet("search-filter")]
        public async Task<IActionResult> GetFilteredJobs(
            [FromQuery] string? search, 
            [FromQuery] decimal? minBudget, 
            [FromQuery] decimal? maxBudget, 
            [FromQuery] string? status, 
            [FromQuery] Guid? categoryDomainId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _jobService.GetFilteredJobsAsync(search, minBudget, maxBudget, status, categoryDomainId, page, pageSize);
            if (result == null || result.Data == null || !result.Data.Any())
            {
                return NotFound("Không tìm thấy bài đăng tuyển dụng nào phù hợp với bộ lọc.");
            }
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllJobs([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var cacheKey = $"job_posts_p{page}_s{pageSize}";
            if (_cache.TryGetValue(cacheKey, out PagedResult<JobPost>? cachedResult))
            {
                return Ok(cachedResult);
            }

            var result = await _jobService.GetJobsAsync(page, pageSize);
            if (result == null || result.Data == null || !result.Data.Any())
            {
                return NotFound("Không tìm thấy bài đăng tuyển dụng nào.");
            }

            _cache.Set(cacheKey, result, TimeSpan.FromSeconds(30));
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
        public async Task<IActionResult> CreateJob([FromBody] CreateJobPostDto dto)
        {
            var result = await _jobService.CreateJobAsync(dto);
            return Ok(result);
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateJob(Guid id, [FromBody] UpdateJobPostDto dto)
        {
            try
            {
                var result = await _jobService.UpdateJobPostAsync(id, dto);
                if (result == null) return NotFound("Không tìm thấy bài đăng để cập nhật.");
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("client/{clientId:guid}")]
        public async Task<IActionResult> GetJobPostsByClientId(Guid clientId)
        {
            var result = await _jobService.GetJobPostsByClientIdAsync(clientId);
            if (result == null || !result.Any())
            {
                return NotFound("Không tìm thấy bài đăng nào của client này.");
            }
            return Ok(result);
        }
        [HttpPost("recommend-experts")]
        public async Task<IActionResult> RecommendExperts([FromBody] ExpertRecommendationRequestDto dto)
        {
            if (!dto.JobPostId.HasValue && (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Description)))
            {
                return BadRequest(new { error = "Vui lòng cung cấp JobPostId hoặc nhập đầy đủ tiêu đề (Title) và mô tả (Description) của công việc." });
            }

            try
            {
                var recommendations = await _jobService.RecommendExpertsAsync(dto);
                return Ok(recommendations);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi hệ thống khi phân tích gợi ý: {ex.Message}" });
            }
        }

        [HttpGet("recommend-for-expert/{expertId:guid}")]
        public async Task<IActionResult> RecommendJobPostsForExpert(Guid expertId)
        {
            try
            {
                var recommendations = await _jobService.RecommendJobPostsForExpertAsync(expertId);
                return Ok(recommendations);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }
}
