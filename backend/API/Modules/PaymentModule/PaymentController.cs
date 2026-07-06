using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.InteractionModule;
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Helpers;

namespace AITasker.API.Modules.PaymentModule
{
    /// <summary>
    /// DTO nhận yêu cầu tạo đơn hàng ZaloPay từ Frontend
    /// </summary>
    public class CreateZaloPayOrderRequest
    {
        public Guid UserId { get; set; }
        public long Amount { get; set; } // Đơn vị: VND (tối thiểu 1000)
        public string Description { get; set; } = "Nạp tiền vào ví AI-Tasker";
    }

    /// <summary>
    /// DTO nhận callback từ ZaloPay Webhook (POST form-data)
    /// </summary>
    public class ZaloPayCallbackDto
    {
        public string data { get; set; } = string.Empty;
        public string mac { get; set; } = string.Empty;
        public int type { get; set; }
    }

    [ApiController]
    [Route("api/payment")]
    public class PaymentController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IUserService _userService;

        private string AppId  => _config["ZaloPay:AppId"]  ?? "2554";
        private string Key1   => _config["ZaloPay:Key1"]   ?? string.Empty;
        private string Key2   => _config["ZaloPay:Key2"]   ?? string.Empty;
        private string CallbackUrl => _config["ZaloPay:CallbackUrl"] ?? string.Empty;
        private string ZaloPayCreateUrl => "https://sb-openapi.zalopay.vn/v2/create";

        public PaymentController(DataContext context, IConfiguration config, IHttpClientFactory httpClientFactory, IUserService userService)
        {
            _context = context;
            _config = config;
            _httpClientFactory = httpClientFactory;
            _userService = userService;
        }

        /// <summary>
        /// Tạo đơn hàng ZaloPay và trả về order_url cho Frontend.
        /// Frontend chỉ cần gửi userId + amount, backend tự tính HMAC.
        /// </summary>
        [HttpPost("create-order")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateZaloPayOrderRequest req)
        {
            if (req.UserId == Guid.Empty || req.Amount < 1000)
                return BadRequest(new { message = "UserId không hợp lệ hoặc số tiền tối thiểu là 1,000 VND." });

            // Kiểm tra user tồn tại
            var walletExists = await _context.Wallets.AnyAsync(w => w.UserId == req.UserId);
            if (!walletExists)
                return NotFound(new { message = $"Không tìm thấy ví của user {req.UserId}." });

            // Tạo app_trans_id: yyMMdd_timestamp (format chuẩn ZaloPay)
            var now        = DateTimeOffset.UtcNow;
            var appTransId = now.ToString("yyMMdd") + "_" + now.ToUnixTimeSeconds();
            var appTime    = now.ToUnixTimeMilliseconds();

            // embed_data chứa userId để webhook đọc ra sau
            var embedData = JsonSerializer.Serialize(new
            {
                userId      = req.UserId.ToString(),
                redirecturl = "http://localhost:5173/wallet"
            });

            const string item    = "[]";
            var description      = req.Description;

            // Tính MAC = HMAC-SHA256(app_id|app_trans_id|app_user|amount|app_time|embed_data|item, Key1)
            var macInput = $"{AppId}|{appTransId}|{req.UserId}|{req.Amount}|{appTime}|{embedData}|{item}";
            var mac      = ComputeHmacSha256(macInput, Key1);

            var formData = new Dictionary<string, string>
            {
                ["app_id"]       = AppId,
                ["app_trans_id"] = appTransId,
                ["app_user"]     = req.UserId.ToString(),
                ["amount"]       = req.Amount.ToString(),
                ["app_time"]     = appTime.ToString(),
                ["embed_data"]   = embedData,
                ["item"]         = item,
                ["description"]  = description,
                ["bank_code"]    = "",  // Để trống → user tự chọn phương thức
                ["mac"]          = mac,
                ["callback_url"] = CallbackUrl
            };

            try
            {
                var client   = _httpClientFactory.CreateClient();
                var response = await client.PostAsync(ZaloPayCreateUrl, new FormUrlEncodedContent(formData));
                var body     = await response.Content.ReadAsStringAsync();
                var result   = JsonSerializer.Deserialize<JsonElement>(body);

                var returnCode = result.GetProperty("return_code").GetInt32();
                if (returnCode != 1)
                {
                    var msg = result.TryGetProperty("sub_return_message", out var subMsg)
                        ? subMsg.GetString() : "Tạo đơn hàng ZaloPay thất bại.";
                    return BadRequest(new { message = msg, returnCode, raw = body });
                }

                var orderUrl   = result.GetProperty("order_url").GetString();
                var orderToken = result.GetProperty("order_token").GetString();

                return Ok(new
                {
                    orderUrl,
                    orderToken,
                    appTransId,
                    amount      = req.Amount,
                    userId      = req.UserId
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi kết nối ZaloPay: " + ex.Message });
            }
        }

        /// <summary>
        /// [BUG FIX] Webhook ZaloPay gọi về sau khi user thanh toán thành công.
        /// - Xác minh chữ ký HMAC-SHA256 để đảm bảo request đến từ ZaloPay thật sự.
        /// - Parse UserId từ app_trans_id (format: userId_timestamp).
        /// - Cộng tiền vào ví đúng user và ghi TransactionLog.
        /// </summary>
        [HttpPost("zalopay-webhook")]
        public async Task<IActionResult> HandleWebhook([FromBody] ZaloPayCallbackDto callback)
        {
            if (callback == null || string.IsNullOrEmpty(callback.data) || string.IsNullOrEmpty(callback.mac))
            {
                return BadRequest(new { return_code = 0, return_message = "Thiếu dữ liệu callback" });
            }

            // ===== BƯỚC 1: XÁC MINH CHỮ KÝ HMAC-SHA256 =====
            string computedMac = ComputeHmacSha256(callback.data, Key2);
            if (!computedMac.Equals(callback.mac, StringComparison.OrdinalIgnoreCase))
            {
                Console.WriteLine($"[SECURITY] MAC không khớp! Expected: {computedMac}, Got: {callback.mac}");
                return Ok(new { return_code = -1, return_message = "MAC verification failed" });
            }

            try
            {
                // ===== BƯỚC 2: PARSE DỮ LIỆU TỪ JSON CALLBACK =====
                var dataObj = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(callback.data);

                long amount = 0;
                string appTransId = string.Empty;

                if (dataObj.TryGetProperty("amount", out var amtProp)) amount = amtProp.GetInt64();
                if (dataObj.TryGetProperty("app_trans_id", out var transProp)) appTransId = transProp.GetString() ?? string.Empty;

                // ===== BƯỚC 3: LẤY UserId ĐỘNG TỪ embed_data =====
                // embed_data format: {"userId":"guid", "redirecturl":"..."}
                // Frontend phải truyền userId vào embed_data khi tạo đơn hàng ZaloPay
                Guid targetUserId = Guid.Empty;
                try
                {
                    if (dataObj.TryGetProperty("embed_data", out var embedProp))
                    {
                        var embedStr = embedProp.GetString() ?? "{}";
                        var embedObj = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(embedStr);
                        if (embedObj.TryGetProperty("userId", out var userIdProp) &&
                            Guid.TryParse(userIdProp.GetString(), out var parsedId))
                        {
                            targetUserId = parsedId;
                        }
                    }
                }
                catch { /* embed_data parse error - ignore */ }

                if (targetUserId == Guid.Empty)
                {
                    Console.WriteLine($"[ERROR] Không parse được UserId từ app_trans_id: {appTransId}");
                    return Ok(new { return_code = 0, return_message = "Không xác định được người dùng" });
                }

                // ===== BƯỚC 4: KIỂM TRA VÍ VÀ CỘNG SỐ DƯ =====
                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == targetUserId);
                if (wallet == null)
                {
                    Console.WriteLine($"[ERROR] Không tìm thấy ví của User: {targetUserId}");
                    return Ok(new { return_code = 0, return_message = "Không tìm thấy ví người dùng" });
                }

                decimal depositAmount = (decimal)amount;
                wallet.Balance += depositAmount;

                // ===== BƯỚC 5: GHI TRANSACTION LOG =====
                var txLog = new TransactionLog
                {
                    Id = Guid.NewGuid(),
                    ProjectId = null,
                    SourceWalletId = null,
                    DestinationWalletId = wallet.UserId,
                    Amount = depositAmount,
                    Type = "Deposit",
                    CreatedAt = DateTime.UtcNow
                };
                _context.TransactionLogs.Add(txLog);

                await _context.SaveChangesAsync();

                Console.WriteLine("==================================================");
                Console.WriteLine("[WEBHOOK SUCCESS] Nạp tiền ZaloPay thành công!");
                Console.WriteLine($"[INFO] app_trans_id: {appTransId}");
                Console.WriteLine($"[INFO] UserId: {targetUserId}");
                Console.WriteLine($"[INFO] Số tiền nạp: {depositAmount:N0} VND");
                Console.WriteLine($"[INFO] Số dư mới: {wallet.Balance:N0} VND");
                Console.WriteLine("==================================================");

                return Ok(new { return_code = 1, return_message = "Success" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DB ERROR] {ex.Message}");
                return StatusCode(500, new { return_code = 0, return_message = ex.Message });
            }
        }

        /// <summary>
        /// [DEV ONLY] Endpoint test nội bộ: nạp tiền thủ công không cần ZaloPay (chỉ dùng trong môi trường dev)
        /// </summary>
        [HttpPost("dev/manual-deposit")]
        public async Task<IActionResult> ManualDeposit([FromBody] CreateZaloPayOrderRequest req)
        {
            // Kiểm tra Token của Admin/Owner/Staff
            var (requesterId, errorResult) = await this.ValidateStaffOrOwnerAsync(_userService);
            if (errorResult != null) return errorResult;

            if (req == null || req.UserId == Guid.Empty || req.Amount <= 0)
                return BadRequest("UserId và Amount không hợp lệ.");

            var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == req.UserId);
            if (wallet == null) return NotFound($"Không tìm thấy ví của user {req.UserId}");

            wallet.Balance += (decimal)req.Amount;

            _context.TransactionLogs.Add(new TransactionLog
            {
                Id = Guid.NewGuid(),
                ProjectId = null,
                SourceWalletId = null,
                DestinationWalletId = wallet.UserId,
                Amount = (decimal)req.Amount,
                Type = "ManualDeposit",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Nạp tiền thủ công thành công (DEV ONLY).",
                UserId = req.UserId,
                Amount = req.Amount,
                NewBalance = wallet.Balance
            });
        }

        // ===== HELPER: Tính HMAC-SHA256 =====
        private static string ComputeHmacSha256(string data, string key)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        }

        /// <summary>
        /// [FIX] GET /api/payment/transactions?userId={guid}
        /// Trả về lịch sử giao dịch kèm theo ProjectTitle để Frontend hiển thị trực tiếp.
        /// </summary>
        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] Guid? userId)
        {
            var query = _context.TransactionLogs
                .Include(t => t.Project)
                    .ThenInclude(p => p != null ? p.JobPost : null)
                .AsQueryable();

            if (userId.HasValue)
            {
                query = query.Where(t =>
                    t.SourceWalletId == userId.Value ||
                    t.DestinationWalletId == userId.Value);
            }

            var logs = await query
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            var result = logs.Select(t => new
            {
                t.Id,
                t.ProjectId,
                ProjectTitle = t.Project != null && t.Project.JobPost != null ? t.Project.JobPost.Title : null,
                t.SourceWalletId,
                t.DestinationWalletId,
                t.Amount,
                t.Type,
                t.CreatedAt
            });

            return Ok(result);
        }
    }
}