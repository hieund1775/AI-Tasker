using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
 
namespace AITasker_Modular.Modules.AiModule;
 
public class GeminiUtil
{
    private readonly HttpClient _httpClient;
 
    // Model flash cho nhanh, hoặc đổi thành gemini-1.5-pro nếu cần chính xác hơn
    private const string GeminiBaseUrl =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
 
    // TODO: chuyển sang environment variable hoặc IConfiguration, đừng để key trong code
    private const string ApiKey = "gen-lang-client-0551836681";
 
    private static readonly JsonSerializerOptions SerializeOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };
 
    public GeminiUtil(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }
 
    public async Task<string> CallGeminiApiAsync(object payload)
    {
        var requestUrl = $"{GeminiBaseUrl}?key={ApiKey}";
 
        var json = JsonSerializer.Serialize(payload, SerializeOptions);
 
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, requestUrl)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
 
        var response = await _httpClient.SendAsync(httpRequest);
 
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException(
                $"Gemini API Error [{response.StatusCode}]: {errorBody}");
        }
 
        return await response.Content.ReadAsStringAsync();
    }
}