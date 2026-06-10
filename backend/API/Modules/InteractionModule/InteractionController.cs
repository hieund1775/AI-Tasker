using Microsoft.AspNetCore.Mvc;

namespace AITasker_Modular.Modules.InteractionModule;

[ApiController]
[Route("api/interactions")]
public class InteractionController : ControllerBase
{
    private readonly IInteractionService _service;

    public InteractionController(IInteractionService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        return Ok(await _service.GetReviewsAsync());
    }

    [HttpPost("transaction")]
    public async Task<IActionResult> Transaction(TransactionLog transactionLog)
    {
        return Ok(await _service.RecordTransactionAsync(transactionLog));
    }
}
