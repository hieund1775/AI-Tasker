using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.ProposalModule;

namespace AITasker_Modular.Modules.JobModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProposalsController : ControllerBase
    {
        private readonly IProposalService _proposalService;

        public ProposalsController(IProposalService proposalService)
        {
            _proposalService = proposalService;
        }

        [HttpPost("submit-proposal")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> SubmitProposal([FromForm] CreateProposalDto dto)
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

        // Endpoint 3: Lấy danh sách hồ sơ mà Expert đã nộp
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

        // Endpoint 4: Client Duyệt/Từ chối hồ sơ đấu thầu
        [HttpPut("{id:guid}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] string status)
        {
            if (string.IsNullOrEmpty(status)) return BadRequest("Trạng thái không được để trống.");
            
            var result = await _proposalService.UpdateProposalStatusAsync(id, status);
            if (result == null) return NotFound("Không tìm thấy hồ sơ đấu thầu tương ứng.");

            return Ok(result);
        }
    }

    public class CreateProposalDto
    {
        public Guid JobPostId { get; set; }
        public Guid ExpertId { get; set; }
        public decimal BidAmount { get; set; }
        public int EstimatedDuration { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Introduction { get; set; } = string.Empty;
        public string Technical { get; set; } = string.Empty;
        public string Implementation { get; set; } = string.Empty;
        public string Dependencies { get; set; } = string.Empty;
        public Microsoft.AspNetCore.Http.IFormFile? Portfolio { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public string? PortfolioUrl { get; set; }
    }
}