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

    // Thử tự động các model theo thứ tự ưu tiên: 3.1 Flash Lite -> 2.5 Flash -> 1.5 Flash
    private static readonly string[] ModelList = new[]
    {
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash"
    };

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
        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });

        string lastResponseBody = string.Empty;
        System.Net.HttpStatusCode lastStatusCode = System.Net.HttpStatusCode.OK;

        foreach (var model in ModelList)
        {
            var requestUrl = $"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={_apiKey}";

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, requestUrl)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };

            try
            {
                var response = await _httpClient.SendAsync(httpRequest);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return responseBody;
                }

                lastStatusCode = response.StatusCode;
                lastResponseBody = responseBody;

                // Nếu gặp lỗi rate limit (429 Too Many Requests) hoặc hết quota (Resource Exhausted)
                // ta sẽ tự động chuyển sang model tiếp theo trong danh sách.
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests ||
                    responseBody.Contains("RESOURCE_EXHAUSTED", StringComparison.OrdinalIgnoreCase))
                {
                    // Ghi log để theo dõi việc chuyển đổi model
                    System.Console.WriteLine($"[GeminiUtil] Model {model} exceeded quota/rate limit (Status: {response.StatusCode}). Trying fallback model...");
                    continue;
                }

                // Nếu là lỗi khác (như lỗi xác thực, payload không hợp lệ...), ném lỗi luôn để tránh lặp vô ích
                throw new HttpRequestException($"Gemini API Error [{response.StatusCode}]: {responseBody}");
            }
            catch (System.Exception ex) when (ex is not HttpRequestException)
            {
                // Nếu là lỗi kết nối mạng hoặc lỗi ngoại lệ khác, ta cũng có thể thử model tiếp theo hoặc ghi log
                System.Console.WriteLine($"[GeminiUtil] Error calling model {model}: {ex.Message}");
                if (model == ModelList[ModelList.Length - 1])
                {
                    throw;
                }
            }
        }

        throw new HttpRequestException($"Gemini API Error: All models exhausted. Last status: {lastStatusCode}, Response: {lastResponseBody}");
    }
}