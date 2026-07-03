using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;

namespace AITasker_Modular.Modules.AiModule;

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
    public async Task<IActionResult> SendSession([FromForm] AIChatRequest request, IFormFile? file)
    {
        if (request.MessagesHistory == null || request.MessagesHistory.Count == 0)
            return BadRequest(new { error = "Lịch sử phiên chat trống." });

        try
        {
            var structured = await _aiChatService.ProcessChatSessionAsync(request, file);
            return Ok(structured);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Lỗi xử lý AI: {ex.Message}" });
        }
    }
}