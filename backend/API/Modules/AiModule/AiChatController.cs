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

        public AiChatController(AiChatService aiChatService, MiniTaskAnalysisService miniTaskAnalysisService)
        {
            _aiChatService = aiChatService;
            _miniTaskAnalysisService = miniTaskAnalysisService;
        }

        // Sinh/chinh sua User Story tu Use Case
        [HttpPost("send-session")]
        public async Task<IActionResult> SendSession([FromBody] AIChatRequest request)
        {
            if (request == null)
                return BadRequest(new { error = "Request body khong hop le." });

            var result = await _aiChatService.ProcessChatSessionAsync(request);
            return Ok(result);
        }

        // Phan tich mot Use Case thanh danh sach MiniTask chi tiet hon User Story
        [HttpPost("analyze-minitasks")]
        public async Task<IActionResult> AnalyzeMiniTasks([FromBody] MiniTaskAnalysisRequest request)
        {
            if (request == null)
                return BadRequest(new { error = "Request body khong hop le." });

            var result = await _miniTaskAnalysisService.AnalyzeMiniTasksAsync(request);
            return Ok(result);
        }
    }
}