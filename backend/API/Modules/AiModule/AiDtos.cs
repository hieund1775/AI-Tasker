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

// DTO request cho tinh nang tu dong tao Introduction / Bio cho Expert
public class GenerateExpertIntroRequest
{
    [JsonPropertyName("expert_id")]
    public Guid ExpertId { get; set; }

    // Target Project params (optional - dùng khi Expert muốn ứng tuyển vào 1 bài Post / Dự án cụ thể)
    [JsonPropertyName("target_job_post_id")]
    public Guid? TargetJobPostId { get; set; }

    [JsonPropertyName("target_project_title")]
    public string? TargetProjectTitle { get; set; }

    [JsonPropertyName("target_project_description")]
    public string? TargetProjectDescription { get; set; }

    [JsonPropertyName("tone")]
    public string? Tone { get; set; } = "Persuasive"; // E.g. Professional, Persuasive, Technical, Concise

    [JsonPropertyName("purpose")]
    public string? Purpose { get; set; } = "Proposal Introduction"; // E.g. Profile Bio, Proposal Introduction

    [JsonPropertyName("custom_highlights")]
    public string? CustomHighlights { get; set; }

    [JsonPropertyName("language")]
    public string? Language { get; set; } = "vi";
}

// DTO response cho tinh nang tu dong tao Introduction / Bio cho Expert
public class GenerateExpertIntroResponse
{
    [JsonPropertyName("expert_id")]
    public Guid ExpertId { get; set; }

    [JsonPropertyName("generated_introduction")]
    public string GeneratedIntroduction { get; set; } = string.Empty;

    [JsonPropertyName("key_highlights")]
    public List<string> KeyHighlights { get; set; } = new();

    [JsonPropertyName("suggested_tagline")]
    public string SuggestedTagline { get; set; } = string.Empty;

    [JsonPropertyName("match_reasons")]
    public List<string> MatchReasons { get; set; } = new();

    [JsonPropertyName("used_data_summary")]
    public ExpertIntroDataSummary UsedDataSummary { get; set; } = new();
}

public class ExpertIntroDataSummary
{
    [JsonPropertyName("skills_count")]
    public int SkillsCount { get; set; }

    [JsonPropertyName("projects_count")]
    public int ProjectsCount { get; set; }

    [JsonPropertyName("reviews_count")]
    public int ReviewsCount { get; set; }

    [JsonPropertyName("has_target_project")]
    public bool HasTargetProject { get; set; }
}