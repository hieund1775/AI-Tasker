using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Helpers;

namespace AITasker_Modular.Modules.ChatModule;

[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly IChatService _service;
    private readonly IUserService _userService;

    public ChatController(IChatService service, IUserService userService)
    {
        _service = service;
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var (_, errorResult) = await this.ValidateAdminOrOwnerAsync(_userService);
        if (errorResult != null)
            return errorResult;

        return Ok(await _service.GetConversationsAsync());
    }

    [HttpPost("send")]
    public async Task<IActionResult> Send(Message message)
    {
        return Ok(await _service.SendMessageAsync(message));
    }
}
