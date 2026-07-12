using System.Text.Json.Serialization;

namespace AITasker_Modular.Modules.AiModule;

public class AIChatRequest
{
    [JsonPropertyName("messages_history")]
    public List<AIMessageDto> MessagesHistory { get; set; } = new();

    // Chuỗi tóm tắt ngữ cảnh cũ do FE lưu trữ và gửi ngược lên
    [JsonPropertyName("context_summary")]
    public string ContextSummary { get; set; } = string.Empty;

    // Giữ lại để không lỗi code FrontEnd cũ
    [JsonPropertyName("current_draft")]
    public object? CurrentDraft { get; set; }

    // Đường dẫn tương đối của file đã upload sẵn qua /api/FileUpload/upload
    // Ví dụ: "uploads/chat-files/abc123.docx"
    [JsonPropertyName("file_path")]
    public string? FilePath { get; set; }
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

    // Chứa bất kỳ cấu trúc JSON nào (Hợp đồng, Use Case, User Story...) dựa trên đề bài mới nhất
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
        ChatMessage = "The AI system cannot synchronize the dynamic data structure. Please resubmit the command.",
        ValidationErrors = new List<string> { $"Data structure error: {rawText[..Math.Min(rawText.Length, 40)]}" }
    };
}