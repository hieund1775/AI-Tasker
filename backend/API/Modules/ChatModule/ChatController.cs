using Microsoft.AspNetCore.Mvc;

namespace AITasker_Modular.Modules.ChatModule;

[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly IChatService _service;

    public ChatController(IChatService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        return Ok(await _service.GetConversationsAsync());
    }

    [HttpPost("send")]
    public async Task<IActionResult> Send(Message message)
    {
        return Ok(await _service.SendMessageAsync(message));
    }
}
