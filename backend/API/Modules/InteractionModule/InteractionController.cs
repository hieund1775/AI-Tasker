using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Helpers;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.InteractionModule
{
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
            // [FIX] Trả về danh sách giao dịch kèm theo ProjectTitle để Frontend không cần load thêm
            var logs = await _service.GetAllTransactionLogsWithTitleAsync();
            return Ok(logs);
        }

        [HttpPost("transaction")]
        public async Task<IActionResult> Transaction([FromBody] TransactionLog transactionLog)
        {
            return Ok(await _service.RecordTransactionAsync(transactionLog));
        }
    }
}