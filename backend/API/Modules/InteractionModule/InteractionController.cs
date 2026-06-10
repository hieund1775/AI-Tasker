using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Helpers;

namespace AITasker_Modular.Modules.InteractionModule;

[ApiController]
[Route("api/interactions")]
public class InteractionController : ControllerBase
{
    private readonly IInteractionService _service;
    private readonly IUserService _userService;

    public InteractionController(IInteractionService service, IUserService userService)
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

        return Ok(await _service.GetReviewsAsync());
    }

    [HttpPost("transaction")]
    public async Task<IActionResult> Transaction(TransactionLog transactionLog)
    {
        return Ok(await _service.RecordTransactionAsync(transactionLog));
    }
}
