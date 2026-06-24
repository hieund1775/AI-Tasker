using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace AITasker_Modular.Modules.DisputeModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class DisputeController : ControllerBase
    {
        private readonly IDisputeService _disputeService;

        public DisputeController(IDisputeService disputeService)
        {
            _disputeService = disputeService;
        }

        [HttpPost("user/submit-report")]
        public async Task<IActionResult> SubmitReport([FromBody] SubmitReportInputDto dto)
        {
            try {
                var reportId = await _disputeService.SubmitProjectReportAsync(dto.ProjectId, dto.ReporterId, dto.Reason, dto.EvidenceUrl);
                return Ok(new { ReportId = reportId, Message = "Đơn khiếu nại của bạn đã được gửi tới Ban quản trị sàn." });
            } catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("staff/shared-reports-queue")]
        public async Task<IActionResult> GetSharedReportsQueue([FromQuery] Guid staffId)
        {
            try {
                var queue = await _disputeService.GetSharedReportsQueueAsync(staffId);
                return Ok(queue);
            } catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }

        [HttpPost("staff/trigger-dispute-lock/{projectId:guid}")]
        public async Task<IActionResult> TriggerDisputeLock(Guid projectId, [FromQuery] string reason, [FromQuery] Guid staffId)
        {
            try {
                var result = await _disputeService.TriggerProjectDisputeLockAsync(projectId, reason, staffId);
                return Ok(result);
            } catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
              catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpPost("staff/execute-verdict/{disputeId:guid}")]
        public async Task<IActionResult> ExecuteVerdict(Guid disputeId, [FromQuery] string winnerRole, [FromQuery] string verdictReason, [FromQuery] Guid staffId)
        {
            try {
                var result = await _disputeService.ExecuteDisputeVerdictAsync(disputeId, winnerRole, verdictReason, staffId);
                return Ok(new { Message = "Thực thi phán quyết tài chính thành công.", Data = result });
            } catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
              catch (Exception ex) { return BadRequest(ex.Message); }
        }
    }

    public class SubmitReportInputDto 
    { 
        public Guid ProjectId { get; set; } 
        public Guid ReporterId { get; set; } 
        public string Reason { get; set; } = string.Empty; 
        public string? EvidenceUrl { get; set; } 
    }
}