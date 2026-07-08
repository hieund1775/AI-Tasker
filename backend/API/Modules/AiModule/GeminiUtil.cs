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

    public GeminiUtil(IConfiguration configuration)
    {
        _httpClient = new HttpClient();

        _apiKey = configuration["Gemini:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY")
            ?? throw new InvalidOperationException(
                "Chua cau hinh Gemini API Key. Hay them vao appsettings.json (Gemini:ApiKey).");
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