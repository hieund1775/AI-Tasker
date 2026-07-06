using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using AITasker_Modular.Modules.AiModule;

namespace API.Modules.AiModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class AiChatController : ControllerBase
    {
        private readonly AiChatService _aiChatService;

        public AiChatController(AiChatService aiChatService)
        {
            _aiChatService = aiChatService;
        }

        [HttpPost("send-session")]
        public async Task<IActionResult> SendSession([FromBody] AIChatRequest request)
        {
            if (request == null)
                return BadRequest(new { error = "Request body khong hop le." });

            var result = await _aiChatService.ProcessChatSessionAsync(request);
            return Ok(result);
        }
    }
}