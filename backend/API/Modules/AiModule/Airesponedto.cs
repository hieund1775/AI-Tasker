using System.Text.Json.Serialization;

namespace AITasker_Modular.Modules.AiModule;

public class AIChatRequest
{
    [JsonPropertyName("messages_history")]
    public List<AIMessageDto> MessagesHistory { get; set; } = new();

    // Hộp chứa chuỗi tóm tắt ngữ cảnh cũ do FE lưu trữ và gửi ngược lên
    [JsonPropertyName("context_summary")]
    public string ContextSummary { get; set; } = string.Empty;

    // Giữ lại để không lỗi code FrontEnd cũ
    [JsonPropertyName("current_draft")]
    public object? CurrentDraft { get; set; }
}

public class AIMessageDto
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty; // "user" | "assistant"
    
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

public class AiStructuredResponse
{
    [JsonPropertyName("intent")]
    public string Intent { get; set; } = "collecting_info";

    [JsonPropertyName("chat_message")]
    public string ChatMessage { get; set; } = string.Empty;

    // ĐỐI TƯỢNG ĐỘNG: Chứa bất kỳ cấu trúc JSON nào (Hợp đồng, Use Case, User Story...) dựa trên đề bài mới nhất
    [JsonPropertyName("payload")]
    public object? Payload { get; set; }

    // Trả chuỗi tóm tắt context mới về cho FE lưu trữ để phục vụ lượt gọi sau
    [JsonPropertyName("context_summary")]
    public string ContextSummary { get; set; } = string.Empty;

    [JsonPropertyName("validation_errors")]
    public List<string> ValidationErrors { get; set; } = new();

    [JsonPropertyName("is_complete")]
    public bool IsComplete { get; set; }

    public static AiStructuredResponse ParseError(string rawText) => new()
    {
        Intent = "error",
        ChatMessage = "Hệ thống AI không thể đồng bộ hóa cấu trúc dữ liệu động. Vui lòng gửi lại câu lệnh.",
        ValidationErrors = new List<string> { $"Lỗi cấu trúc dữ liệu: {rawText[..Math.Min(rawText.Length, 40)]}" }
    };
}