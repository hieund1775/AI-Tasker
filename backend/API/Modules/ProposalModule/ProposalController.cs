using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.ProposalModule;

namespace AITasker_Modular.Modules.JobModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProposalsController : ControllerBase
    {
        private readonly IProposalService _proposalService;
        private readonly DataContext _context;
        private const long MaxFileSizeBytes = 10 * 1024 * 1024;
        private readonly string[] _allowedExtensions = { ".pdf", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg" };

        public ProposalsController(IProposalService proposalService, DataContext context)
        {
            _proposalService = proposalService;
            _context = context;
        }

        [HttpPost("submit-proposal")]
        [HttpPost("reapply")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> SubmitProposal([FromForm] CreateProposalDto dto)
        {
            try
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                if (!Directory.Exists(uploadsFolder)) { Directory.CreateDirectory(uploadsFolder); }

                if (dto.Portfolio != null && dto.Portfolio.Length > 0)
                {
                    if (dto.Portfolio.Length > MaxFileSizeBytes) return BadRequest("Portfolio file exceeds 10MB.");
                    var ext = Path.GetExtension(dto.Portfolio.FileName).ToLower();
                    if (!_allowedExtensions.Contains(ext)) return BadRequest("Invalid portfolio file format.");

                    var uniqueFileName = Guid.NewGuid().ToString() + "_" + Path.GetFileName(dto.Portfolio.FileName);
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                    using (var fileStream = new FileStream(filePath, FileMode.Create)) { await dto.Portfolio.CopyToAsync(fileStream); }
                    dto.PortfolioUrl = $"/uploads/{uniqueFileName}";
                }

                if (dto.Attachment != null && dto.Attachment.Length > 0)
                {
                    if (dto.Attachment.Length > MaxFileSizeBytes) return BadRequest("Attachment file exceeds 10MB.");
                    var ext = Path.GetExtension(dto.Attachment.FileName).ToLower();
                    if (!_allowedExtensions.Contains(ext)) return BadRequest("Invalid attachment file format.");

                    var uniqueFileName = Guid.NewGuid().ToString() + "_" + Path.GetFileName(dto.Attachment.FileName);
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                    using (var fileStream = new FileStream(filePath, FileMode.Create)) { await dto.Attachment.CopyToAsync(fileStream); }
                    dto.AttachmentUrl = $"/uploads/{uniqueFileName}";
                }

                var result = await _proposalService.SubmitProposalAsync(dto);
                return Ok(result);
            }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("job/{jobPostId:guid}")]
        public async Task<IActionResult> GetProposalsByJob(Guid jobPostId)
        {
            var result = await _proposalService.GetProposalsByJobPostIdAsync(jobPostId);
            return Ok(result ?? Array.Empty<Proposal>());
        }

        [HttpGet("expert/{expertId:guid}")]
        public async Task<IActionResult> GetProposalsByExpert(Guid expertId)
        {
            var result = await _proposalService.GetProposalsByExpertIdAsync(expertId);
            return Ok(result ?? Array.Empty<Proposal>());
        }

        [HttpPut("{id:guid}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] AcceptProposalStatusDto dto)
        {
            if (dto == null || string.IsNullOrEmpty(dto.Status)) 
                return BadRequest("Status cannot be empty.");
            
            var result = await _proposalService.UpdateProposalStatusAsync(id, dto.Status);
            if (result == null) return NotFound("Proposal not found.");
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
                    var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
                    if (!Directory.Exists(uploadsFolder)) { Directory.CreateDirectory(uploadsFolder); }
                    var uniqueFileName = Guid.NewGuid().ToString() + "_" + Path.GetFileName(dto.Portfolio.FileName);
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                    using (var fileStream = new FileStream(filePath, FileMode.Create)) { await dto.Portfolio.CopyToAsync(fileStream); }
                    dto.PortfolioUrl = $"/uploads/{uniqueFileName}";
                }
                var result = await _proposalService.UpdateProposalAsync(id, dto);
                if (result == null) return NotFound("Proposal not found.");
                return Ok(result);
            }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        [HttpPost("{id:guid}/generate-milestone-md")]
        public async Task<IActionResult> GenerateMilestoneMarkdown(Guid id, [FromQuery] int taskCount, [FromQuery] int deadlineDays)
        {
            var fileUrl = await _proposalService.GenerateProposalMilestoneMarkdownAsync(id, taskCount, deadlineDays);
            if (fileUrl == null) return NotFound("Requested proposal info not found.");
            return Ok(new { FileUrl = fileUrl });
        }


        [HttpPost("expert-ai-chat-session")]
        public async Task<IActionResult> SendExpertAiMessage([FromBody] ExpertAiChatRequest request)
        {
            var job = await _context.JobPosts.FirstOrDefaultAsync(x => x.Id == request.JobPostId);
            if (job == null) return NotFound("Job post info not found.");

            string promptLower = request.Message.ToLower();
            string responseText = $"[Trợ lý Nghiệp vụ AI AITasker]: Thầy đã ghi nhận phản hồi cho dự án \"{job.Title}\". ";

            if (promptLower.Contains("sửa") || promptLower.Contains("tăng") || promptLower.Contains("giảm"))
                responseText += "Yêu cầu điều chỉnh Use Case và phân bổ thời gian thực thi của chuyên gia hợp lệ. Hệ thống đã cập nhật lại trọng số phân rã phần mềm.";
            else if (promptLower.Contains("giải thích") || promptLower.Contains("rõ hơn"))
                responseText += "Đặc tả Use Case này đòi hỏi hạ tầng kết nối API bảo mật cao, mã hóa đầu cuối bằng JWT Token và phân quyền chi tiết cho từng vai trò người dùng.";
            else
                responseText += "Kịch bản phân rã Use Case hiện tại đã tối ưu. Chuyên gia có thể trực tiếp bấm nút 'Đăng ký đấu thầu' để nộp giải pháp kỹ thuật này sang cho Client duyệt.";

            var chatLog = new ProposalAiChat {
                Id = Guid.NewGuid(), JobPostId = request.JobPostId, ExpertId = request.ExpertId,
                UserMessage = request.Message.Trim(), AiResponse = responseText, CreatedAt = DateTime.UtcNow
            };
            _context.ProposalAiChats.Add(chatLog);
            await _context.SaveChangesAsync();
            return Ok(new { AiResponse = responseText, Timestamp = chatLog.CreatedAt });
        }

        [HttpGet("expert-ai-chat-history")]
        public async Task<IActionResult> GetExpertAiChatHistory([FromQuery] Guid jobPostId, [FromQuery] Guid expertId)
        {
            var history = await _context.ProposalAiChats
                .Where(x => x.JobPostId == jobPostId && x.ExpertId == expertId).OrderBy(x => x.CreatedAt)
                .Select(x => new { x.Id, Sender = "Expert", Message = x.UserMessage, AiReply = x.AiResponse, x.CreatedAt })
                .ToListAsync();
            return Ok(history);
        }
    }

    public class AcceptProposalStatusDto { public string Status { get; set; } = string.Empty; }
    public class ExpertAiChatRequest { public Guid JobPostId { get; set; } public Guid ExpertId { get; set; } public string Message { get; set; } = string.Empty; }
    public class CreateProposalDto {
        public Guid JobPostId { get; set; } public Guid ExpertId { get; set; } public decimal BidAmount { get; set; } public int EstimatedDuration { get; set; }
        public string Introduction { get; set; } = string.Empty; public string Implementation { get; set; } = string.Empty;
        public Microsoft.AspNetCore.Http.IFormFile? Portfolio { get; set; }
        [System.Text.Json.Serialization.JsonIgnore] public string? PortfolioUrl { get; set; }
        public Microsoft.AspNetCore.Http.IFormFile? Attachment { get; set; }
        [System.Text.Json.Serialization.JsonIgnore] public string? AttachmentUrl { get; set; }
    }
}
