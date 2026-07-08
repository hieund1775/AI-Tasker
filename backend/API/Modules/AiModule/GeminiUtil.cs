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

    private const string GeminiBaseUrl =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

    public GeminiUtil(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        var envKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        var configKey = configuration["Gemini:ApiKey"];
        var rawKey = !string.IsNullOrWhiteSpace(envKey) ? envKey : configKey;

        if (string.IsNullOrWhiteSpace(rawKey))
        {
            throw new InvalidOperationException(
                "Chua cau hinh Gemini API Key. Hay them bien moi truong GEMINI_API_KEY tren Railway hoac appsettings.json (Gemini:ApiKey).");
        }

        _apiKey = rawKey.Trim(' ', '"', '\'', '\r', '\n');
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

        // Tránh rò rỉ JWT token cục bộ sang Google API gây lỗi ACCESS_TOKEN_TYPE_UNSUPPORTED
        httpRequest.Headers.Remove("Authorization");
        httpRequest.Headers.Add("x-goog-api-key", _apiKey);

        var response = await _httpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"Gemini API Error [{response.StatusCode}]: {responseBody}");
        }

        return responseBody;
    }
}