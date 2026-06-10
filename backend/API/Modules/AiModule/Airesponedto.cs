using System.Text.Json.Serialization;
 
namespace AITasker_Modular.Modules.AiModule;
 
// =========================================================
// REQUEST DTO
// FE gửi lên: lịch sử chat + draft hiện tại để AI giữ ngữ cảnh
// =========================================================
public class AIChatRequest
{
    /// <summary>Lịch sử toàn bộ phiên chat (role: "user" hoặc "assistant")</summary>
    public List<AIMessageDto> MessagesHistory { get; set; } = new();
 
    /// <summary>
    /// Draft job post hiện tại — FE gửi lại để AI không hỏi lại thông tin cũ.
    /// Null nếu là lượt đầu tiên.
    /// </summary>
    public JobPostDraft? CurrentDraft { get; set; }
}
 
public class AIMessageDto
{
    public string Role { get; set; } = string.Empty;    // "user" | "assistant"
    public string Content { get; set; } = string.Empty;
}
 
// =========================================================
// RESPONSE DTO — AI luôn trả theo cấu trúc này
// =========================================================
 
/// <summary>
/// Response cấu trúc đầy đủ sau khi parse JSON từ Gemini.
/// Controller trả cả object này về FE.
/// FE chỉ hiển thị "chat_message" trong chat bubble,
/// còn lại dùng để vẽ form/tag/card.
/// </summary>
public class AiStructuredResponse
{
    /// <summary>collecting_info | confirming | complete | error</summary>
    [JsonPropertyName("intent")]
    public string Intent { get; set; } = "collecting_info";
 
    /// <summary>Nội dung hiển thị trong chat bubble — ĐÂY LÀ PHẦN DUY NHẤT USER ĐỌC</summary>
    [JsonPropertyName("chat_message")]
    public string ChatMessage { get; set; } = string.Empty;
 
    /// <summary>Draft job post đang được thu thập — FE render thành card preview</summary>
    [JsonPropertyName("job_post_draft")]
    public JobPostDraft? JobPostDraft { get; set; }
 
    /// <summary>Các field AI muốn FE render thành form input có sẵn options</summary>
    [JsonPropertyName("form_suggestions")]
    public List<FormSuggestion> FormSuggestions { get; set; } = new();
 
    /// <summary>Lỗi validation nếu có</summary>
    [JsonPropertyName("validation_errors")]
    public List<string> ValidationErrors { get; set; } = new();
 
    /// <summary>Các field còn thiếu để hoàn tất job post</summary>
    [JsonPropertyName("missing_fields")]
    public List<string> MissingFields { get; set; } = new();
 
    /// <summary>True khi job post đã đủ thông tin và hợp lệ</summary>
    [JsonPropertyName("is_complete")]
    public bool IsComplete { get; set; }
 
    // ---- Helper: Khi parse fail, trả về error response mặc định ----
    public static AiStructuredResponse ParseError(string rawText) => new()
    {
        Intent = "error",
        ChatMessage = "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại.",
        ValidationErrors = new List<string> { $"Không parse được JSON từ AI: {rawText[..Math.Min(rawText.Length, 100)]}" }
    };
}
 
// =========================================================
// JOB POST DRAFT — khớp với các cột trong DB JobPost
// =========================================================
public class JobPostDraft
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }
 
    [JsonPropertyName("description")]
    public string? Description { get; set; }
 
    /// <summary>Danh sách ID kỹ năng chuẩn hóa, ví dụ ["SKILL_001", "SKILL_007"]</summary>
    [JsonPropertyName("skill_ids")]
    public List<string> SkillIds { get; set; } = new();
 
    [JsonPropertyName("salary_min")]
    public decimal? SalaryMin { get; set; }
 
    [JsonPropertyName("salary_max")]
    public decimal? SalaryMax { get; set; }
 
    [JsonPropertyName("location")]
    public string? Location { get; set; }
 
    /// <summary>Full-time | Part-time | Freelance | Internship</summary>
    [JsonPropertyName("job_type")]
    public string? JobType { get; set; }
 
    /// <summary>Junior | Mid | Senior | Lead</summary>
    [JsonPropertyName("experience_level")]
    public string? ExperienceLevel { get; set; }
 
    /// <summary>ISO 8601, ví dụ "2025-12-31"</summary>
    [JsonPropertyName("deadline")]
    public string? Deadline { get; set; }
}
 
// =========================================================
// FORM SUGGESTION — AI gợi ý field nào cần điền, FE render thành UI
// =========================================================
public class FormSuggestion
{
    /// <summary>Tên field khớp với property của JobPostDraft</summary>
    [JsonPropertyName("field_name")]
    public string FieldName { get; set; } = string.Empty;
 
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;
 
    /// <summary>text | textarea | single_select | multi_select | date | number</summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = "text";
 
    /// <summary>Danh sách options nếu type là select</summary>
    [JsonPropertyName("options")]
    public List<string> Options { get; set; } = new();
 
    /// <summary>Giá trị hiện tại trong draft (nếu có)</summary>
    [JsonPropertyName("current_value")]
    public string? CurrentValue { get; set; }
}
 
