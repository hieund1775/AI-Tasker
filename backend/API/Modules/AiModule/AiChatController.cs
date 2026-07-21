using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.AiModule;

namespace API.Modules.AiModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class AiChatController : ControllerBase
    {
        private readonly AiChatService _aiChatService;
        private readonly MiniTaskAnalysisService _miniTaskAnalysisService;
        private readonly ExpertIntroService _expertIntroService;

        public AiChatController(
            AiChatService aiChatService,
            MiniTaskAnalysisService miniTaskAnalysisService,
            ExpertIntroService expertIntroService)
        {
            _aiChatService = aiChatService;
            _miniTaskAnalysisService = miniTaskAnalysisService;
            _expertIntroService = expertIntroService;
        }

        // Sinh/chinh sua User Story tu Use Case
        [HttpPost("send-session")]
        public async Task<IActionResult> SendSession([FromBody] AIChatRequest request)
        {
            if (request == null)
                return BadRequest(new { error = "Request body khong hop le." });

            try
            {
                var result = await _aiChatService.ProcessChatSessionAsync(request);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(502, new { error = "Loi ket noi API Gemini: " + ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Loi he thong: " + ex.Message });
            }
        }

        // Phan tich mot Use Case thanh danh sach MiniTask chi tiet hon User Story
        [HttpPost("analyze-minitasks")]
        public async Task<IActionResult> AnalyzeMiniTasks([FromBody] MiniTaskAnalysisRequest request)
        {
            if (request == null)
                return BadRequest(new { error = "Request body khong hop le." });

            try
            {
                var result = await _miniTaskAnalysisService.AnalyzeMiniTasksAsync(request);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(502, new { error = "Loi ket noi API Gemini: " + ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Loi he thong: " + ex.Message });
            }
        }

        // Tu dong tao Introduction/Bio cho Expert dua tren Profile va du lieu du an
        [HttpPost("generate-expert-introduction")]
        public async Task<IActionResult> GenerateExpertIntroduction([FromBody] GenerateExpertIntroRequest request)
        {
            if (request == null || request.ExpertId == Guid.Empty)
                return BadRequest(new { error = "Request body hoặc ExpertId không hợp lệ." });

            try
            {
                var result = await _expertIntroService.GenerateExpertIntroductionAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(502, new { error = "Lỗi kết nối API Gemini: " + ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Lỗi hệ thống: " + ex.Message });
            }
        }
    }
}