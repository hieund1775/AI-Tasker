using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using AITasker_Modular.Database; // Dùng đúng Database gốc của nhóm

namespace AITasker.API.Modules.PaymentModule
{
    public class PaymentRequest
    {
        public string order_id { get; set; }
        public decimal amount { get; set; }
    }

    [ApiController]
    [Route("api/payment")]
    public class PaymentController : ControllerBase
    {
        private readonly DataContext _context;

        // Inject DataContext của hệ thống vào để dùng
        public PaymentController(DataContext context)
        {
            _context = context;
        }

        [HttpPost("zalopay-webhook")]
        public async Task<IActionResult> HandleWebhook([FromForm] PaymentRequest request)
        {
            // Kiểm tra dữ liệu đầu vào
            if (request == null || string.IsNullOrEmpty(request.order_id))
            {
                return BadRequest(new { return_code = 0, return_message = "Dữ liệu trống" });
            }

            try
            {
                // VẬN HÀNH THỰC TẾ: Vì chạy giả lập độc lập, ta sẽ cộng tiền trực tiếp vào tài khoản Client Test 
                // có ID cố định đã được Seed sẵn trong hệ thống của nhóm em: 11111111-1111-1111-1111-111111111111
                var targetUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
                
                // Tìm ví của tài khoản đang đăng nhập test
                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == targetUserId);
                
                if (wallet == null)
                {
                    System.Console.WriteLine($"[ERROR] Không tìm thấy ví của User: {targetUserId}");
                    return BadRequest(new { return_code = 0, return_message = "Không tìm thấy ví người dùng" });
                }

                // Thực hiện cộng tiền thật vào thuộc tính Balance trong DB
                wallet.Balance += request.amount;
                
                // Lưu thay đổi xuống MySQL
                await _context.SaveChangesAsync();

                System.Console.WriteLine("==================================================");
                System.Console.WriteLine("[DATABASE UPDATE SUCCESS]");
                System.Console.WriteLine($"[INFO] Mã đơn hàng: {request.order_id}");
                System.Console.WriteLine($"[INFO] Cộng thành công: {request.amount} VND vào ví User: {targetUserId}");
                System.Console.WriteLine($"[STATUS] Số dư hiện tại trong DB: {wallet.Balance} VND");
                System.Console.WriteLine("==================================================");

                return Ok(new { return_code = 1, return_message = "Success" });
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"[DB ERROR] {ex.Message}");
                return StatusCode(500, new { return_code = 0, return_message = ex.Message });
            }
        }
    }
}
