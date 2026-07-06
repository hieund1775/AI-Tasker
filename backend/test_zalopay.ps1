# ============================================================
#  ZaloPay Sandbox Tester (PowerShell) - AI-Tasker Backend
# ============================================================

$BACKEND_URL = "http://localhost:5175"
$APP_ID      = "2554"
$KEY1        = "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn"
$KEY2        = "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf"
$ZALOPAY_CREATE_URL = "https://sb-openapi.zalopay.vn/v2/create"
$TEST_USER_ID = "11111111-1111-1111-1111-111111111111"
$DEPOSIT_AMOUNT = 10000

function Get-HmacSha256([string]$Data, [string]$Key) {
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($Key)
    $bytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Data))
    return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

Write-Host "=============================================="
Write-Host " ZaloPay Sandbox - AI-Tasker Deposit Tester  "
Write-Host "=============================================="

# ---- STEP 1: Kiem tra backend ----
Write-Host ""
Write-Host "STEP 1: Kiem tra backend dang chay..." -ForegroundColor Cyan
try {
    $null = Invoke-WebRequest -Uri "$BACKEND_URL/" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   OK: Backend dang chay tai $BACKEND_URL" -ForegroundColor Green
} catch {
    if ($_.Exception.Response -ne $null) {
        Write-Host "   OK: Backend dang chay tai $BACKEND_URL (HTTP $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Green
    } else {
        Write-Host "   FAIL: Backend khong chay! Chay: dotnet run truoc" -ForegroundColor Red
        exit 1
    }
}

# ---- STEP 2: Tao don hang ZaloPay Sandbox ----
Write-Host ""
Write-Host "STEP 2: Tao don hang ZaloPay Sandbox..." -ForegroundColor Cyan

$datePrefix    = (Get-Date).ToString("yyyyMMdd")
$timestamp     = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$appTransId    = $datePrefix + "_" + $TEST_USER_ID + "_" + $timestamp
$appTime       = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$embedData     = '{"redirecturl":"http://localhost:5173/"}'
$item          = "[]"
$description   = "AI-Tasker: Nap tien VND"

$macData = $APP_ID + "|" + $appTransId + "|test_user|" + $DEPOSIT_AMOUNT + "|" + $appTime + "|" + $embedData + "|" + $item
$mac     = Get-HmacSha256 -Data $macData -Key $KEY1

Write-Host ("   app_trans_id : " + $appTransId)
Write-Host ("   amount       : " + $DEPOSIT_AMOUNT + " VND")
Write-Host ("   mac          : " + $mac)

$createBody = "app_id=$APP_ID" +
    "&app_trans_id=" + [uri]::EscapeDataString($appTransId) +
    "&app_user=test_user" +
    "&amount=$DEPOSIT_AMOUNT" +
    "&app_time=$appTime" +
    "&embed_data=" + [uri]::EscapeDataString($embedData) +
    "&item=" + [uri]::EscapeDataString($item) +
    "&description=" + [uri]::EscapeDataString($description) +
    "&bank_code=zalopayapp" +
    "&mac=$mac" +
    "&callback_url=" + [uri]::EscapeDataString("$BACKEND_URL/api/payment/zalopay-webhook")

try {
    $createResp = Invoke-RestMethod -Uri $ZALOPAY_CREATE_URL -Method POST -Body $createBody -ContentType "application/x-www-form-urlencoded" -TimeoutSec 15
    Write-Host "   ZaloPay API Response:" -ForegroundColor Green
    Write-Host ("      return_code    : " + $createResp.return_code)
    Write-Host ("      return_message : " + $createResp.return_message)
    if ($createResp.return_code -eq 1) {
        Write-Host ("      order_url      : " + $createResp.order_url) -ForegroundColor Yellow
        $global:OrderUrl = $createResp.order_url
        Write-Host "   >>> Tao don hang THANH CONG!" -ForegroundColor Green
    } else {
        Write-Host ("      sub_return_code    : " + $createResp.sub_return_code) -ForegroundColor Red
        Write-Host ("      sub_return_message : " + $createResp.sub_return_message) -ForegroundColor Red
    }
} catch {
    Write-Host ("   LOI goi ZaloPay API: " + $_) -ForegroundColor Red
}

# ---- STEP 3: Gia lap Webhook callback ----
Write-Host ""
Write-Host "----------------------------------------------"
Write-Host "STEP 3: Gia lap ZaloPay Webhook -> backend..." -ForegroundColor Cyan

$webhookDataObj = [ordered]@{
    app_id           = [int]$APP_ID
    app_trans_id     = $appTransId
    app_time         = $appTime
    amount           = $DEPOSIT_AMOUNT
    embed_data       = $embedData
    item             = $item
    zp_trans_id      = (Get-Random -Minimum 1000000000 -Maximum 9999999999)
    server_time      = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    channel          = 38
    merchant_user_id = "test_user"
    user_fee_amount  = 0
    discount_amount  = 0
}

$webhookDataStr = $webhookDataObj | ConvertTo-Json -Compress
$webhookMac     = Get-HmacSha256 -Data $webhookDataStr -Key $KEY2

$truncated = $webhookDataStr.Substring(0, [Math]::Min(80, $webhookDataStr.Length))
Write-Host ("   data (80 chars): " + $truncated + "...")
Write-Host ("   mac            : " + $webhookMac)

$webhookPayload = @{
    data = $webhookDataStr
    mac  = $webhookMac
    type = 1
} | ConvertTo-Json

try {
    $webhookResp = Invoke-RestMethod -Uri "$BACKEND_URL/api/payment/zalopay-webhook" -Method POST -Body $webhookPayload -ContentType "application/json" -TimeoutSec 15
    Write-Host "   Backend Webhook Response:" -ForegroundColor Green
    Write-Host ("      return_code    : " + $webhookResp.return_code)
    Write-Host ("      return_message : " + $webhookResp.return_message)
    if ($webhookResp.return_code -eq 1) {
        Write-Host "   >>> WEBHOOK TEST PASSED! Tien da duoc cong vao vi!" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: Webhook tra ve loi - kiem tra log backend" -ForegroundColor Yellow
    }
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-Host ("   LOI webhook (HTTP " + $status + "): " + $_) -ForegroundColor Red
}

# ---- STEP 4: Manual Deposit test ----
Write-Host ""
Write-Host "----------------------------------------------"
Write-Host "STEP 4: Test Manual Deposit endpoint..." -ForegroundColor Cyan

$manualBody = @{
    userId  = $TEST_USER_ID
    amount  = 50000
} | ConvertTo-Json

try {
    $manualResp = Invoke-RestMethod -Uri "$BACKEND_URL/api/payment/dev/manual-deposit" -Method POST -Body $manualBody -ContentType "application/json" -TimeoutSec 15
    Write-Host "   Manual Deposit Response:" -ForegroundColor Green
    Write-Host ("      Message    : " + $manualResp.message)
    Write-Host ("      UserId     : " + $manualResp.userId)
    Write-Host ("      Amount     : " + $manualResp.amount)
    Write-Host ("      NewBalance : " + $manualResp.newBalance)
    Write-Host "   >>> MANUAL DEPOSIT PASSED!" -ForegroundColor Green
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-Host ("   LOI manual deposit (HTTP " + $status + "): " + $_) -ForegroundColor Red
}

Write-Host ""
Write-Host "=============================================="
Write-Host " Kiem thu hoan tat!"
Write-Host "=============================================="
if ($global:OrderUrl) {
    Write-Host ""
    Write-Host "Link thanh toan ZaloPay Sandbox:" -ForegroundColor Yellow
    Write-Host $global:OrderUrl -ForegroundColor Cyan
}
