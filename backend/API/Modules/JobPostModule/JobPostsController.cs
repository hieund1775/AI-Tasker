using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http; // ── THAO TÁC CƠ HỌC: BẮT BUỘC PHẢI THÊM ĐỂ HỆ THỐNG HIỂU IFormFile
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
        public async Task<IActionResult> GetFilteredJobs([FromQuery] string? search, [FromQuery] decimal? minBudget, [FromQuery] decimal? maxBudget, [FromQuery] string? status, [FromQuery] Guid? categoryDomainId)
        {
            var result = await _jobService.GetFilteredJobsAsync(search, minBudget, maxBudget, status, categoryDomainId);
            if (result == null || !result.Any())
            {
                return NotFound("Không tìm thấy bài đăng tuyển dụng nào phù hợp với bộ lọc.");
            }
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllJobs()
        {
            var result = await _jobService.GetJobsAsync();
            if (result == null || !result.Any())
            {
                return NotFound("Không tìm thấy bài đăng tuyển dụng nào.");
            }
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
            var result = await _jobService.UpdateJobPostAsync(id, dto);
            if (result == null) return NotFound("Không tìm thấy bài đăng để cập nhật.");
            return Ok(result);
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
    }
}