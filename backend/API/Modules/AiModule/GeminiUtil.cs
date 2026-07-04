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

    // Su dung dong model gemini-2.5-flash de xu ly context dai cuc muot va phan hoi nhanh
    private const string GeminiBaseUrl =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    public GeminiUtil(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;

        // Doc API Key tu appsettings.json (section "Gemini:ApiKey") hoac bien moi truong GEMINI_API_KEY
        _apiKey = configuration["Gemini:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY")
            ?? throw new InvalidOperationException(
                "Chua cau hinh Gemini API Key. Hay them vao appsettings.json (Gemini:ApiKey) hoac bien moi truong GEMINI_API_KEY.");
    }

    // Goi Gemini API voi payload contents thuan tuy, khong ep JSON schema (dung cho cac tac vu tu do)
    public async Task<string> CallGeminiApiAsync(object payload)
    {
        return await SendRequestAsync(payload);
    }

    // Goi Gemini API co system instruction rieng + ep buoc tra ve dung JSON (application/json)
    // Day la ham nen dung cho AiChatService de dam bao Gemini KHONG BAO GIO tra loi bang van ban tu do
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