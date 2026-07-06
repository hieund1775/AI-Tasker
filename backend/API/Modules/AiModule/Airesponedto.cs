using System.Text.Json.Serialization;

namespace AITasker_Modular.Modules.AiModule;

public class AIChatRequest
{
    [JsonPropertyName("messages_history")]
    public List<AIMessageDto> MessagesHistory { get; set; } = new();

    // Chuoi tom tat ngu canh cu do FE luu tru va gui nguoc len
    [JsonPropertyName("context_summary")]
    public string ContextSummary { get; set; } = string.Empty;

    // Giu lai de khong loi code FrontEnd cu
    [JsonPropertyName("current_draft")]
    public object? CurrentDraft { get; set; }

    // Duong dan tuong doi cua file da upload san qua /api/FileUpload/upload
    // Vi du: "uploads/chat-files/abc123.docx"
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

    // Chua bat ky cau truc JSON nao (Hop dong, Use Case, User Story...) dua tren de bai moi nhat
    [JsonPropertyName("payload")]
    public object? Payload { get; set; }

    // Tra chuoi tom tat context moi ve cho FE luu tru de phuc vu luot goi sau
    [JsonPropertyName("context_summary")]
    public string ContextSummary { get; set; } = string.Empty;

    [JsonPropertyName("validation_errors")]
    public List<string> ValidationErrors { get; set; } = new();

    [JsonPropertyName("is_complete")]
    public bool IsComplete { get; set; }

    public static AiStructuredResponse ParseError(string rawText) => new()
    {
        Intent = "error",
        ChatMessage = "He thong AI khong the dong bo hoa cau truc du lieu dong. Vui long gui lai cau lenh.",
        ValidationErrors = new List<string> { $"Loi cau truc du lieu: {rawText[..Math.Min(rawText.Length, 40)]}" }
    };
}