using System;
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
        public async Task<IActionResult> SubmitProposal([FromBody] CreateProposalDto dto)
        {
            var result = await _proposalService.SubmitProposalAsync(dto);
            return Ok(result);
        }

        [HttpGet("job/{jobPostId:guid}")]
        public async Task<IActionResult> GetProposalsByJob(Guid jobPostId)
        {
            var result = await _proposalService.GetProposalsByJobPostIdAsync(jobPostId);
            return Ok(result);
        }

        // Endpoint 3: Lấy danh sách hồ sơ mà Expert đã nộp
        [HttpGet("expert/{expertId:guid}")]
        public async Task<IActionResult> GetProposalsByExpert(Guid expertId)
        {
            var result = await _proposalService.GetProposalsByExpertIdAsync(expertId);
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
        public string CoverLetter { get; set; } = string.Empty;
    }
}