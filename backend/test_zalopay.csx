using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Collections.Generic;

// ============================================================
//  ZALOPAY SANDBOX TESTER - AI-TASKER BACKEND
//  Chạy: dotnet script test_zalopay.csx
//        hoặc copy vào LINQPad / dotnet-script
// ============================================================

const string BACKEND_URL = "http://localhost:5175";
const string APP_ID      = "2554";
const string KEY1        = "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn";
const string KEY2        = "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf";
const string ZALOPAY_CREATE_ORDER_URL = "https://sb-openapi.zalopay.vn/v2/create";

// ⚠️ Thay bằng UserId thực tế trong DB của bạn
const string TEST_USER_ID = "11111111-1111-1111-1111-111111111111";
const long   DEPOSIT_AMOUNT = 10000; // 10,000 VND

var http = new HttpClient();
http.Timeout = TimeSpan.FromSeconds(30);

Console.WriteLine("==============================================");
Console.WriteLine(" ZaloPay Sandbox - AI-Tasker Deposit Tester  ");
Console.WriteLine("==============================================\n");

// ---- STEP 1: Tạo đơn hàng ZaloPay Sandbox ----
Console.WriteLine("📦 STEP 1: Tạo đơn hàng ZaloPay Sandbox...");

string datePrefix   = DateTime.Now.ToString("yyyyMMdd");
string appTransId   = $"{datePrefix}_{TEST_USER_ID}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
long   appTime      = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
string appUser      = "test_user";
string description  = $"AI-Tasker: Nap tien {DEPOSIT_AMOUNT:N0} VND";
string bankCode     = "zalopayapp";
string embedData    = JsonSerializer.Serialize(new { redirecturl = "http://localhost:5173/" });
string item         = "[]";

// Tạo MAC cho Create Order: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
string macData      = $"{APP_ID}|{appTransId}|{appUser}|{DEPOSIT_AMOUNT}|{appTime}|{embedData}|{item}";
string mac          = ComputeHmac(macData, KEY1);

Console.WriteLine($"   app_trans_id : {appTransId}");
Console.WriteLine($"   amount       : {DEPOSIT_AMOUNT:N0} VND");
Console.WriteLine($"   mac_data     : {macData}");
Console.WriteLine($"   mac          : {mac}");

var createOrderParams = new Dictionary<string, string>
{
    ["app_id"]       = APP_ID,
    ["app_trans_id"] = appTransId,
    ["app_user"]     = appUser,
    ["amount"]       = DEPOSIT_AMOUNT.ToString(),
    ["app_time"]     = appTime.ToString(),
    ["embed_data"]   = embedData,
    ["item"]         = item,
    ["description"]  = description,
    ["bank_code"]    = bankCode,
    ["mac"]          = mac,
    ["callback_url"] = $"{BACKEND_URL}/api/payment/zalopay-webhook"
};

try
{
    var createResp = await http.PostAsync(ZALOPAY_CREATE_ORDER_URL, new FormUrlEncodedContent(createOrderParams));
    var createBody = await createResp.Content.ReadAsStringAsync();
    Console.WriteLine($"\n✅ ZaloPay Response ({(int)createResp.StatusCode}):");
    
    var parsed = JsonSerializer.Deserialize<JsonElement>(createBody);
    Console.WriteLine($"   return_code    : {parsed.GetProperty("return_code")}");
    Console.WriteLine($"   return_message : {parsed.GetProperty("return_message")}");
    
    if (parsed.GetProperty("return_code").GetInt32() == 1)
    {
        Console.WriteLine($"   order_token    : {parsed.GetProperty("order_token")}");
        Console.WriteLine($"   order_url      : {parsed.GetProperty("order_url")}");
        Console.WriteLine("\n🎉 Đơn hàng tạo thành công! Mở link order_url để test thanh toán sandbox.");
    }
    else
    {
        Console.WriteLine($"   sub_return_code    : {parsed.GetProperty("sub_return_code")}");
        Console.WriteLine($"   sub_return_message : {parsed.GetProperty("sub_return_message")}");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Lỗi tạo đơn hàng: {ex.Message}");
}

Console.WriteLine("\n----------------------------------------------");

// ---- STEP 2: Test webhook backend trực tiếp (giả lập callback) ----
Console.WriteLine("\n🔔 STEP 2: Giả lập ZaloPay Webhook gọi về backend...");

var webhookData = JsonSerializer.Serialize(new
{
    app_id       = int.Parse(APP_ID),
    app_trans_id = appTransId,
    app_time     = appTime,
    amount       = DEPOSIT_AMOUNT,
    embed_data   = embedData,
    item         = item,
    zp_trans_id  = new Random().NextInt64(1_000_000_000, 9_999_999_999),
    server_time  = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
    channel      = 38,
    merchant_user_id = appUser,
    user_fee_amount  = 0,
    discount_amount  = 0
});

// Tạo MAC cho callback: data → HMAC-SHA256(data, Key2)
string webhookMac = ComputeHmac(webhookData, KEY2);

Console.WriteLine($"   webhook_data : {webhookData[..Math.Min(100, webhookData.Length)]}...");
Console.WriteLine($"   webhook_mac  : {webhookMac}");

var webhookPayload = JsonSerializer.Serialize(new
{
    data = webhookData,
    mac  = webhookMac,
    type = 1
});

try
{
    var webhookResp = await http.PostAsync(
        $"{BACKEND_URL}/api/payment/zalopay-webhook",
        new StringContent(webhookPayload, Encoding.UTF8, "application/json")
    );
    var webhookBody = await webhookResp.Content.ReadAsStringAsync();
    Console.WriteLine($"\n✅ Backend Webhook Response ({(int)webhookResp.StatusCode}):");
    Console.WriteLine($"   {webhookBody}");

    if ((int)webhookResp.StatusCode == 200)
    {
        var respParsed = JsonSerializer.Deserialize<JsonElement>(webhookBody);
        if (respParsed.TryGetProperty("return_code", out var rc) && rc.GetInt32() == 1)
        {
            Console.WriteLine("\n🎉 WEBHOOK TEST PASSED - Tiền đã được cộng vào ví!");
        }
    }
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Backend không thể kết nối ({BACKEND_URL}): {ex.Message}");
    Console.WriteLine("   → Hãy chạy backend trước: dotnet run");
}

Console.WriteLine("\n----------------------------------------------");

// ---- STEP 3: Verify số dư bằng Manual Deposit test endpoint ----
Console.WriteLine("\n🧪 STEP 3: Test Manual Deposit endpoint (không cần ZaloPay)...");
var manualPayload = JsonSerializer.Serialize(new
{
    userId  = TEST_USER_ID,
    amount  = 50000,
    description = "Test manual deposit"
});

try
{
    var manualResp = await http.PostAsync(
        $"{BACKEND_URL}/api/payment/dev/manual-deposit",
        new StringContent(manualPayload, Encoding.UTF8, "application/json")
    );
    var manualBody = await manualResp.Content.ReadAsStringAsync();
    Console.WriteLine($"\n✅ Manual Deposit Response ({(int)manualResp.StatusCode}):");
    Console.WriteLine($"   {manualBody}");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ {ex.Message}");
}

Console.WriteLine("\n==============================================");
Console.WriteLine(" Test hoàn tất!");
Console.WriteLine("==============================================");

// ---- Helper ----
static string ComputeHmac(string data, string key)
{
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
    var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
    return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
}
