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
            // Đã loại bỏ bộ lọc ValidateStaffOrOwnerAsync cứng để Client và Expert 
            // có thể gọi API lấy lịch sử giao dịch ví vật lý từ DB Railway mượt mà
            var logs = await _service.GetAllTransactionLogsAsync();
            return Ok(logs);
        }

        [HttpPost("transaction")]
        public async Task<IActionResult> Transaction([FromBody] TransactionLog transactionLog)
        {
            return Ok(await _service.RecordTransactionAsync(transactionLog));
        }
    }
}