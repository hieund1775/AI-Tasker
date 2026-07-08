using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http; // â”€â”€ THAO TÃC CÆ  Há»ŒC: Báº®T BUá»˜C PHáº¢I THÃŠM Äá»‚ Há»† THá»NG HIá»‚U IFormFile
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
        // Cá»”NG THÃŠM Má»šI 1: API UPLOAD Táº¬P TIN ÄA Äá»ŠNH Dáº NG (GIá»šI Háº N Cá»¨NG 10MB)
        // ======================================================================
        [HttpPost("upload-file")]
        public async Task<IActionResult> UploadAttachment(IFormFile file)
        {
            try
            {
                var fileUrl = await _jobService.UploadAttachmentAsync(file);
                if (fileUrl == null) 
                {
                    return BadRequest("Táº£i tá»‡p tin tháº¥t báº¡i hoáº·c tá»‡p dá»¯ liá»‡u rá»—ng.");
                }
                return Ok(new { Url = fileUrl });
            }
            catch (Exception ex)
            {
                // Báº¯t toÃ n bá»™ cÃ¡c ngoáº¡i lá»‡ Validation (Sai extension, quÃ¡ dung lÆ°á»£ng) tá»« Service nÃ©m lÃªn
                return BadRequest(ex.Message);
            }
        }

        // ======================================================================
        // Cá»”NG THÃŠM Má»šI 2: API AI MILESTONE ENGINE - XUáº¤T PHÃ‚N RÃƒ TÃC Vá»¤ SANG FILE .MD
        // ======================================================================
        [HttpPost("generate-milestone-md/{proposalId:guid}")]
        public async Task<IActionResult> GenerateMilestoneMarkdown(Guid proposalId, [FromQuery] int taskCount, [FromQuery] int deadlineDays)
        {
            var fileUrl = await _jobService.GenerateMilestoneMarkdownAsync(proposalId, taskCount, deadlineDays);
            if (fileUrl == null) 
            {
                return NotFound("KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin Ä‘á» xuáº¥t (Proposal) hoáº·c bÃ i Ä‘Äƒng tÆ°Æ¡ng á»©ng.");
            }
            return Ok(new { FileUrl = fileUrl });
        }

        // ======================================================================
        // Há»† THá»NG API CRUD CÅ¨ Cá»¦A Báº N HÃ™NG (ÄÆ¯á»¢C Báº¢O TOÃ€N NGUYÃŠN Váº¸N 100%)
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
                return NotFound("KhÃ´ng tÃ¬m tháº¥y bÃ i Ä‘Äƒng tuyá»ƒn dá»¥ng nÃ o phÃ¹ há»£p vá»›i bá»™ lá»c.");
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
                return NotFound("KhÃ´ng tÃ¬m tháº¥y bÃ i Ä‘Äƒng tuyá»ƒn dá»¥ng nÃ o.");
            }

            _cache.Set(cacheKey, result, TimeSpan.FromSeconds(30));
            return Ok(result);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetJobById(Guid id)
        {
            var result = await _jobService.GetJobPostByIdAsync(id);
            if (result == null) return NotFound("KhÃ´ng tÃ¬m tháº¥y bÃ i Ä‘Äƒng yÃªu cáº§u.");
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
                return NotFound("KhÃ´ng tÃ¬m tháº¥y bÃ i Ä‘Äƒng nÃ o cá»§a client nÃ y.");
            }
            return Ok(result);
        }
        [HttpPost("recommend-experts")]
        public async Task<IActionResult> RecommendExperts([FromBody] ExpertRecommendationRequestDto dto)
        {
            if (!dto.JobPostId.HasValue && (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Description)))
            {
                return BadRequest(new { error = "Vui lÃ²ng cung cáº¥p JobPostId hoáº·c nháº­p Ä‘áº§y Ä‘á»§ tiÃªu Ä‘á» (Title) vÃ  mÃ´ táº£ (Description) cá»§a cÃ´ng viá»‡c." });
            }

            try
            {
                var recommendations = await _jobService.RecommendExpertsAsync(dto);
                return Ok(recommendations);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lá»—i há»‡ thá»‘ng khi phÃ¢n tÃ­ch gá»£i Ã½: {ex.Message}" });
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
