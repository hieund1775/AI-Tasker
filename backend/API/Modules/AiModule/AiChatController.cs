using Microsoft.AspNetCore.Mvc;
 
namespace AITasker_Modular.Modules.AiModule;
 
[ApiController]
[Route("api/[controller]")]
public class AiChatController : ControllerBase
{
    private readonly AiChatService _aiChatService;
 
    public AiChatController(AiChatService aiChatService)
    {
        _aiChatService = aiChatService;
    }
 
    /// <summary>
    /// Gửi tin nhắn và nhận response có cấu trúc.
    ///
    /// FE xử lý response:
    ///   - Hiển thị "chat_message" trong chat bubble (role: assistant)
    ///   - Render "job_post_draft" thành card preview bên cạnh
    ///   - Render "form_suggestions" thành các input có sẵn options
    ///   - Highlight "validation_errors" nếu có
    ///   - Khi "is_complete" = true → enable nút "Đăng bài"
    ///
    /// FE gửi request:
    ///   - "messages_history": toàn bộ lịch sử (role: user/assistant, content: string)
    ///   - "current_draft": object JobPostDraft hiện tại (null nếu lần đầu)
    /// </summary>
    [HttpPost("send-session")]
    public async Task<IActionResult> SendSession([FromBody] AIChatRequest request)
    {
        if (request.MessagesHistory == null || request.MessagesHistory.Count == 0)
            return BadRequest(new { error = "Lịch sử phiên chat trống." });
 
        try
        {
            var structured = await _aiChatService.ProcessChatSessionAsync(request);
 
            // Trả về cả object đầy đủ:
            // - "role" + "chat_message"   → FE dùng để render chat bubble
            // - "job_post_draft"          → FE dùng để render card/preview
            // - "form_suggestions"        → FE dùng để render form gợi ý
            // - "validation_errors"       → FE hiển thị lỗi
            // - "is_complete"             → FE enable/disable nút submit
            return Ok(new
            {
                role = "assistant",
                chat_message = structured.ChatMessage,
                intent = structured.Intent,
                job_post_draft = structured.JobPostDraft,
                form_suggestions = structured.FormSuggestions,
                validation_errors = structured.ValidationErrors,
                missing_fields = structured.MissingFields,
                is_complete = structured.IsComplete,
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Lỗi xử lý AI: {ex.Message}" });
        }
    }
 
    /// <summary>
    /// Trả về danh sách kỹ năng chuẩn hóa để FE render dropdown/tag picker.
    /// FE dùng endpoint này thay vì hard-code, tránh lệch với catalog AI đang dùng.
    /// </summary>
    [HttpGet("skill-catalog")]
    public IActionResult GetSkillCatalog()
    {
        var skills = AiContraint.SkillCatalog.Select(s => new
        {
            id = s.Id,
            name = s.Name,
            aliases = s.Aliases
        });
 
        return Ok(skills);
    }
}