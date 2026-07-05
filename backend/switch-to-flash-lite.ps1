# Script doi model sang gemini-3.1-flash-lite (500 RPD thay vi 20 RPD)
# Chay tu thu muc: backend\API
# Cach chay: powershell -ExecutionPolicy Bypass -File .\switch-to-flash-lite.ps1

$ErrorActionPreference = "Stop"
$base = Join-Path (Get-Location) "Modules\AiModule"

if (-not (Test-Path $base)) {
    Write-Host "KHONG TIM THAY thu muc Modules\AiModule. Hay dam bao ban dang dung o thu muc backend\API" -ForegroundColor Red
    exit 1
}

$geminiUtil = @'
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace AITasker_Modular.Modules.AiModule;

public class GeminiUtil
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    // gemini-3.1-flash-lite: GA (khong phai preview), quota rong rai hon nhieu cho free tier
    // (500 RPD / 15 RPM so voi 20 RPD / 5 RPM cua gemini-2.5-flash) -- phu hop cho qua trinh
    // code + test + demo lien tuc trong do an
    private const string GeminiBaseUrl =
        "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-lite:generateContent";

    public GeminiUtil(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;

        _apiKey = configuration["Gemini:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY")
            ?? throw new InvalidOperationException(
                "Chua cau hinh Gemini API Key. Hay them vao appsettings.json (Gemini:ApiKey) hoac bien moi truong GEMINI_API_KEY.");
    }

    public async Task<string> CallGeminiApiAsync(object payload)
    {
        return await SendRequestAsync(payload);
    }

    public async Task<string> CallGeminiApiWithJsonModeAsync(string systemInstructionText, object[] contents)
    {
        var payload = new
        {
            systemInstruction = new
            {
                parts = new[] { new { text = systemInstructionText } }
            },
            contents = contents,
            generationConfig = new
            {
                responseMimeType = "application/json"
            }
        };

        return await SendRequestAsync(payload);
    }

    private async Task<string> SendRequestAsync(object payload)
    {
        var requestUrl = $"{GeminiBaseUrl}?key={_apiKey}";

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, requestUrl)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        var response = await _httpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"Gemini API Error [{response.StatusCode}]: {responseBody}");
        }

        return responseBody;
    }
}
'@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $base "GeminiUtil.cs"), $geminiUtil, $utf8NoBom)
Write-Host "Da ghi: GeminiUtil.cs (doi sang model gemini-3.1-flash-lite, 500 RPD)" -ForegroundColor Green

Write-Host ""
Write-Host "Dang build de kiem tra..." -ForegroundColor Cyan
dotnet build
