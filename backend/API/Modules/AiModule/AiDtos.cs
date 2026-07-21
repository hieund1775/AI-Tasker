using System.Text.Json.Serialization;

namespace AITasker_Modular.Modules.AiModule;

public class AIChatRequest
{
    [JsonPropertyName("messages_history")]
    public List<AIMessageDto> MessagesHistory { get; set; } = new();

    [JsonPropertyName("context_summary")]
    public string ContextSummary { get; set; } = string.Empty;

    [JsonPropertyName("current_draft")]
    public object? CurrentDraft { get; set; }

    [JsonPropertyName("file_path")]
    public string? FilePath { get; set; }

    [JsonPropertyName("user_role")]
    public string? UserRole { get; set; }
}

public class AIMessageDto
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;
}

// Request cho tinh nang phan tich MiniTask tu Use Case
public class MiniTaskAnalysisRequest
{
    [JsonPropertyName("messages_history")]
    public List<AIMessageDto> MessagesHistory { get; set; } = new();

    [JsonPropertyName("context_summary")]
    public string ContextSummary { get; set; } = string.Empty;

    [JsonPropertyName("file_path")]
    public string? FilePath { get; set; }

    [JsonPropertyName("user_role")]
    public string? UserRole { get; set; }
}

public class AiStructuredResponse
{
    [JsonPropertyName("intent")]
    public string Intent { get; set; } = "collecting_info";

    [JsonPropertyName("chat_message")]
    public string ChatMessage { get; set; } = string.Empty;

    [JsonPropertyName("payload")]
    public object? Payload { get; set; }

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