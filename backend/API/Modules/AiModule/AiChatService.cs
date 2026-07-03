using System.Text;
using System.Text.Json;
using System.IO;
using Microsoft.AspNetCore.Http;
using AITasker_Modular.Modules.AiModule;

namespace AITasker_Modular.Modules.AiModule;

public class AiChatService
{
    private readonly GeminiUtil _geminiUtil;

    public AiChatService(GeminiUtil geminiUtil)
    {
        _geminiUtil = geminiUtil;
    }

    // NÂNG CẤP HÀM: Nhận diện linh hoạt văn bản hoặc File đính kèm thả trực tiếp từ giao diện
    public async Task<AiStructuredResponse> ProcessChatSessionAsync(AIChatRequest request, IFormFile? file)
    {
        var partsList = new List<object>();

        // 1. Nếu có chuỗi tóm tắt context của các lượt trước, nạp vào đầu luồng để AI biết lịch sử dữ liệu cũ
        if (!string.IsNullOrEmpty(request.ContextSummary))
        {
            partsList.Add(new { text = $"[CONTEXT_SUMMARY_TRẠNG_THÁI_CŨ]:\n{request.ContextSummary}" });
        }

        // 2. Lấy tin nhắn mới nhất của User gửi lên
        var lastUserMsg = request.MessagesHistory?
            .LastOrDefault(m => m.Role.Equals("user", StringComparison.OrdinalIgnoreCase));
        string currentInputText = lastUserMsg?.Content ?? string.Empty;

        // 3. XỬ LÝ ĐỌC FILE LỰC TIẾP: Nếu phát hiện người dùng thả file vào ô chat
        if (file != null && file.Length > 0)
        {
            // Bung luồng StreamReader bóc tách toàn bộ ký tự bên trong file
            using var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8);
            string fileTextContent = await reader.ReadToEndAsync();

            partsList.Add(new { text = $"[INPUT_MỚI_NỘI_DUNG_FILE_ĐÍNH_KÈM]:\n{fileTextContent}" });
            
            if (!string.IsNullOrEmpty(currentInputText))
            {
                partsList.Add(new { text = $"[YÊU_CẦU_HIỆU_CHỈNH_ĐI_KÈM]:\n{currentInputText}" });
            }
        }
        else
        {
            // Nếu không có file thả vào, xử lý chuỗi text nghiệp vụ như bình thường
            partsList.Add(new { text = $"[INPUT_MỚI_DẠNG_TEXT]:\n{currentInputText}" });
        }

        // 4. Build payload gửi Gemini (Bảo toàn cơ chế chuyển dữ liệu của GeminiUtil)
        var payload = new
        {
            contents = new[]
            {
                new { role = "user", parts = partsList.ToArray() }
            },
            systemInstruction = new
            {
                parts = new[]
                {
                    new { text = AiContraint.BuildSystemPrompt() }
                }
            },
            generationConfig = new
            {
                temperature = 0.2, // Giảm sáng tạo để AI tập trung chỉnh sửa mảng cấu trúc JSON chính xác
                responseMimeType = "application/json"
            }
        };

        // 5. Gọi API thông qua GeminiUtil có sẵn của nhóm
        var rawJson = await _geminiUtil.CallGeminiApiAsync(payload);

        // 6. Trích xuất văn bản thô từ cấu trúc phong bì response envelope của Google
        var aiText = ExtractTextFromGeminiResponse(rawJson);

        // 7. Sửa lỗi cú pháp dở dang cũ của nhóm, parse JSON an toàn ra DTO sạch
        return ParseStructuredResponse(aiText);
    }

    // -------------------------------------------------------
    // BẢO TOÀN NGUYÊN VẸN CÁC HÀM BỎ TRỢ PHÂN TÁCH CHUỖI CỦA CÓ CŨ
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

    private static string StripMarkdownFences(string text)
    {
        var trimmed = text.Trim();

        if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            trimmed = trimmed[7..]; 
        else if (trimmed.StartsWith("```"))
            trimmed = trimmed[3..]; 

        if (trimmed.EndsWith("```"))
            trimmed = trimmed[..^3]; 

        return trimmed.Trim();
    }

    // SỬA LỖI CÚ PHÁP: Khôi phục lại định nghĩa hàm private chuẩn xác
    private static AiStructuredResponse ParseStructuredResponse(string aiText)
    {
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
            return AiStructuredResponse.ParseError(aiText);
        }
    }
}