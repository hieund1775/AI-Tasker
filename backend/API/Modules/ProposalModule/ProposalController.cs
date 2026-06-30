using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; // ── THÊM THƯ VIỆN NÀY ĐỂ TRUY VẤN LỊCH SỬ CHAT
using AITasker_Modular.Database; // ── KẾT NỐI ĐẾN DATACONTEXT ĐỂ GHI DỮ LIỆU CHAT
using AITasker_Modular.Modules.ProposalModule;

namespace AITasker_Modular.Modules.JobModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProposalsController : ControllerBase
    {
        private readonly IProposalService _proposalService;
        private readonly DataContext _context; // ── INJECT DATACONTEXT ĐỂ THAO TÁC BẢNG LƯU VẾT CHAT AI
        private const long MaxFileSizeBytes = 10 * 1024 * 1024; // Giới hạn cứng: 10MB
        private readonly string[] _allowedExtensions = { ".pdf", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg" };

        public ProposalsController(IProposalService proposalService, DataContext context)
        {
            _proposalService = proposalService;
            _context = context;
        }

        [HttpPost("submit-proposal")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> SubmitProposal([FromForm] CreateProposalDto dto)
        {
            try
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                if (dto.Portfolio != null && dto.Portfolio.Length > 0)
                {
                    if (dto.Portfolio.Length > MaxFileSizeBytes) return BadRequest("File Portfolio vượt quá 10MB.");
                    var ext = Path.GetExtension(dto.Portfolio.FileName).ToLower();
                    if (!_allowedExtensions.Contains(ext)) return BadRequest("Định dạng file Portfolio không hợp lệ.");

                    var uniqueFileName = Guid.NewGuid().ToString() + "_" + Path.GetFileName(dto.Portfolio.FileName);
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                    using (var fileStream = new FileStream(filePath, FileMode.Create))
                    {
                        await dto.Portfolio.CopyToAsync(fileStream);
                    }
                    dto.PortfolioUrl = $"/uploads/{uniqueFileName}";
                }

                if (dto.Attachment != null && dto.Attachment.Length > 0)
                {
                    if (dto.Attachment.Length > MaxFileSizeBytes) return BadRequest("File đính kèm vượt quá 10MB.");
                    var ext = Path.GetExtension(dto.Attachment.FileName).ToLower();
                    if (!_allowedExtensions.Contains(ext)) return BadRequest("Định dạng file đính kèm không hợp lệ.");

                    var uniqueFileName = Guid.NewGuid().ToString() + "_" + Path.GetFileName(dto.Attachment.FileName);
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                    using (var fileStream = new FileStream(filePath, FileMode.Create))
                    {
                        await dto.Attachment.CopyToAsync(fileStream);
                    }
                    dto.AttachmentUrl = $"/uploads/{uniqueFileName}";
                }

                var result = await _proposalService.SubmitProposalAsync(dto);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("job/{jobPostId:guid}")]
        public async Task<IActionResult> GetProposalsByJob(Guid jobPostId)
        {
            var result = await _proposalService.GetProposalsByJobPostIdAsync(jobPostId);
            if (result == null || !result.Any())
            {
                return NotFound("Không tìm thấy hồ sơ đấu thầu nào cho công việc này.");
            }
            return Ok(result);
        }

        [HttpGet("expert/{expertId:guid}")]
        public async Task<IActionResult> GetProposalsByExpert(Guid expertId)
        {
            var result = await _proposalService.GetProposalsByExpertIdAsync(expertId);
            if (result == null || !result.Any())
            {
                return NotFound("Không tìm thấy hồ sơ đấu thầu nào của chuyên gia này.");
            }
            return Ok(result);
        }

        [HttpPut("{id:guid}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] string status)
        {
            if (string.IsNullOrEmpty(status)) return BadRequest("Trạng thái không được để trống.");
            
            var result = await _proposalService.UpdateProposalStatusAsync(id, status);
            if (result == null) return NotFound("Không tìm thấy hồ sơ đấu thầu tương ứng.");

            return Ok(result);
        }

        [HttpPut("{id:guid}")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateProposal(Guid id, [FromForm] UpdateProposalDto dto)
        {
            try
            {
                if (dto.Portfolio != null && dto.Portfolio.Length > 0)
                {
                    var uploadsFolder = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                    if (!System.IO.Directory.Exists(uploadsFolder))
                    {
                        System.IO.Directory.CreateDirectory(uploadsFolder);
                    }
                    var uniqueFileName = Guid.NewGuid().ToString() + "_" + System.IO.Path.GetFileName(dto.Portfolio.FileName);
                    var filePath = System.IO.Path.Combine(uploadsFolder, uniqueFileName);
                    using (var fileStream = new System.IO.FileStream(filePath, System.IO.FileMode.Create))
                    {
                        await dto.Portfolio.CopyToAsync(fileStream);
                    }
                    dto.PortfolioUrl = $"/uploads/{uniqueFileName}";
                }

                var result = await _proposalService.UpdateProposalAsync(id, dto);
                if (result == null) return NotFound("Không tìm thấy hồ sơ đấu thầu tương ứng.");

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("{id:guid}/generate-milestone-md")]
        public async Task<IActionResult> GenerateMilestoneMarkdown(Guid id, [FromQuery] int taskCount, [FromQuery] int deadlineDays)
        {
            var fileUrl = await _proposalService.GenerateProposalMilestoneMarkdownAsync(id, taskCount, deadlineDays);
            if (fileUrl == null)
            {
                return NotFound("Không tìm thấy thông tin hồ sơ đấu thầu (Proposal) yêu cầu.");
            }
            return Ok(new { FileUrl = fileUrl });
        }

        [HttpPost("analyze-job-to-usecases/{jobPostId:guid}")]
        public async Task<IActionResult> AnalyzeJobToUseCases(Guid jobPostId)
        {
            var analysisResult = await _proposalService.AnalyzeAndSplitUseCasesAsync(jobPostId);
            if (analysisResult == null)
            {
                return NotFound("Không tìm thấy bài đăng tuyển dụng (JobPost) yêu cầu để tiến hành phân tích.");
            }
            return Ok(analysisResult);
        }

        // ======================================================================
        // CỔNG MỚI CHAT 1: ĐỘNG CƠ CHAT TƯƠNG TÁC SỬA USE CASE VỚI AI THEO NGỮ CẢNH
        // ======================================================================
        [HttpPost("expert-ai-chat-session")]
        public async Task<IActionResult> SendExpertAiMessage([FromBody] ExpertAiChatRequest request)
        {
            var job = await _context.JobPosts.FirstOrDefaultAsync(x => x.Id == request.JobPostId);
            if (job == null) return NotFound("Không tìm thấy thông tin bài đăng dự án.");

            // Động cơ suy luận phản hồi (Mock AI LLM Contextual Stream Engine)
            string promptLower = request.Message.ToLower();
            string responseText = $"[Trợ lý Nghiệp vụ AI AITasker]: Thầy đã ghi nhận phản hồi cho dự án \"{job.Title}\". ";

            if (promptLower.Contains("sửa") || promptLower.Contains("tăng") || promptLower.Contains("giảm"))
            {
                responseText += "Yêu cầu điều chỉnh Use Case và phân bổ thời gian thực thi của chuyên gia hợp lệ. Hệ thống đã cập nhật lại trọng số phân rã phần mềm.";
            }
            else if (promptLower.Contains("giải thích") || promptLower.Contains("rõ hơn"))
            {
                responseText += "Đặc tả Use Case này đòi hỏi hạ tầng kết nối API bảo mật cao, mã hóa đầu cuối bằng JWT Token và phân quyền chi tiết cho từng vai trò người dùng.";
            }
            else
            {
                responseText += "Kịch bản phân rã Use Case hiện tại đã tối ưu. Chuyên gia có thể trực tiếp bấm nút 'Đăng ký đấu thầu' để nộp giải pháp kỹ thuật này sang cho Client duyệt.";
            }

            // Ghi vết vật lý cuộc hội thoại vào bảng để bảo toàn lịch sử Context
            var chatLog = new ProposalAiChat
            {
                Id = Guid.NewGuid(),
                JobPostId = request.JobPostId,
                ExpertId = request.ExpertId,
                UserMessage = request.Message.Trim(),
                AiResponse = responseText,
                CreatedAt = DateTime.UtcNow
            };

            _context.ProposalAiChats.Add(chatLog);
            await _context.SaveChangesAsync();

            return Ok(new { AiResponse = responseText, Timestamp = chatLog.CreatedAt });
        }

        // ======================================================================
        // CỔNG MỚI CHAT 2: LẤY LẠI LỊCH SỬ CHAT CŨ GIỮA EXPERT VÀ AI ĐỂ FE RENDER UI
        // ======================================================================
        [HttpGet("expert-ai-chat-history")]
        public async Task<IActionResult> GetExpertAiChatHistory([FromQuery] Guid jobPostId, [FromQuery] Guid expertId)
        {
            var history = await _context.ProposalAiChats
                .Where(x => x.JobPostId == jobPostId && x.ExpertId == expertId)
                .OrderBy(x => x.CreatedAt)
                .Select(x => new {
                    x.Id,
                    Sender = "Expert",
                    Message = x.UserMessage,
                    AiReply = x.AiResponse,
                    x.CreatedAt
                })
                .ToListAsync();

            return Ok(history);
        }
    }

    // DTO bọc dữ liệu chat đầu vào truyền từ Front-End
    public class ExpertAiChatRequest
    {
        public Guid JobPostId { get; set; }
        public Guid ExpertId { get; set; }
        public string Message { get; set; } = string.Empty;
    }


    public class CreateProposalDto
    {
        public Guid JobPostId { get; set; }
        public Guid ExpertId { get; set; }
        public decimal BidAmount { get; set; }
        public int EstimatedDuration { get; set; }
        public string Introduction { get; set; } = string.Empty;
        public string Implementation { get; set; } = string.Empty;
        public Microsoft.AspNetCore.Http.IFormFile? Portfolio { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public string? PortfolioUrl { get; set; }
        public Microsoft.AspNetCore.Http.IFormFile? Attachment { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public string? AttachmentUrl { get; set; }
    }
}