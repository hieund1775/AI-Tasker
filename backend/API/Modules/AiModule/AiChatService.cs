using System.Text;
using System.Text.Json;
using AITasker_Modular.Modules.AiModule;
 
namespace AITasker_Modular.Modules.AiModule;
 
public class AiChatService
{
    private readonly GeminiUtil _geminiUtil;
 
    public AiChatService(GeminiUtil geminiUtil)
    {
        _geminiUtil = geminiUtil;
    }
 
    public async Task<AiStructuredResponse> ProcessChatSessionAsync(AIChatRequest request)
    {
        // 1. Build contents (lịch sử chat)
        var contentsList = BuildContents(request);
 
        // 2. Nếu có currentDraft, inject vào tin nhắn cuối của user
        //    để AI biết draft hiện tại mà không cần parse lại lịch sử
        if (request.CurrentDraft != null)
        {
            InjectDraftContext(contentsList, request.CurrentDraft);
        }
 
        // 3. Build payload gửi Gemini
        var payload = new
        {
            contents = contentsList,
            systemInstruction = new
            {
                parts = new[]
                {
                    new { text = AiContraint.BuildSystemPrompt() }
                }
            },
            generationConfig = new
            {
                // Tăng nhiệt độ thấp để AI ít "sáng tạo" hơn, dễ ra JSON chuẩn
                temperature = 0.3,
                responseMimeType = "application/json"   // Yêu cầu Gemini trả JSON mode
            }
        };
 
        // 4. Gọi API
        var rawJson = await _geminiUtil.CallGeminiApiAsync(payload);
 
        // 5. Lấy text từ Gemini response envelope
        var aiText = ExtractTextFromGeminiResponse(rawJson);
 
        // 6. Parse JSON cấu trúc từ AI text → AiStructuredResponse
        return ParseStructuredResponse(aiText);
    }
 
    // -------------------------------------------------------
    // Build Gemini contents list từ MessagesHistory
    // -------------------------------------------------------
    private static List<object> BuildContents(AIChatRequest request)
    {
        var list = new List<object>();
 
        foreach (var msg in request.MessagesHistory)
        {
            var geminiRole = msg.Role.Equals("assistant", StringComparison.OrdinalIgnoreCase)
                ? "model"
                : "user";
 
            list.Add(new
            {
                role = geminiRole,
                parts = new[] { new { text = msg.Content } }
            });
        }
 
        return list;
    }
 
    // -------------------------------------------------------
    // Inject draft vào cuối contents để AI có full context
    // Không sửa content gốc của user, thêm 1 "user" turn hệ thống
    // -------------------------------------------------------
    private static void InjectDraftContext(List<object> contentsList, JobPostDraft draft)
    {
        var draftJson = JsonSerializer.Serialize(draft, new JsonSerializerOptions
        {
            WriteIndented = false,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });
 
        var contextMessage = $"[SYSTEM_CONTEXT] Draft job post hiện tại: {draftJson}";
 
        // Chèn vào trước message user cuối cùng (nếu có) hoặc append
        contentsList.Add(new
        {
            role = "user",
            parts = new[] { new { text = contextMessage } }
        });
    }
 
    // -------------------------------------------------------
    // Parse Gemini response envelope, lấy text từ candidates[0]
    // -------------------------------------------------------
    private static string ExtractTextFromGeminiResponse(string rawJson)
    {
        using var doc = JsonDocument.Parse(rawJson);
        return doc.RootElement
                  .GetProperty("candidates")[0]
                  .GetProperty("content")
                  .GetProperty("parts")[0]
                  .GetProperty("text")
                  .GetString() ?? string.Empty;
    }
 
    // -------------------------------------------------------
    // Parse JSON cấu trúc từ text AI trả về → AiStructuredResponse
    // Xử lý trường hợp AI vẫn wrap trong ```json ... ```
    // -------------------------------------------------------
    private static AiStructuredResponse ParseStructuredResponse(string aiText)
    {
        if (string.IsNullOrWhiteSpace(aiText))
            return AiStructuredResponse.ParseError("AI trả về rỗng");
 
        // Strip markdown code fences nếu AI vẫn wrap dù đã bảo không
        var cleaned = StripMarkdownFences(aiText);
 
        try
        {
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                AllowTrailingCommas = true,
            };
 
            var result = JsonSerializer.Deserialize<AiStructuredResponse>(cleaned, options);
            return result ?? AiStructuredResponse.ParseError(aiText);
        }
        catch (JsonException)
        {
            // Nếu vẫn fail: trả error response kèm raw text để FE debug
            return AiStructuredResponse.ParseError(aiText);
        }
    }
 
    private static string StripMarkdownFences(string text)
    {
        var trimmed = text.Trim();
 
        // Xử lý ```json ... ``` hoặc ``` ... ```
        if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            trimmed = trimmed[7..]; // bỏ ```json
        else if (trimmed.StartsWith("```"))
            trimmed = trimmed[3..]; // bỏ ```
 
        if (trimmed.EndsWith("```"))
            trimmed = trimmed[..^3]; // bỏ ``` cuối
 
        return trimmed.Trim();
    }
}
 
