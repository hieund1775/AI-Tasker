using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using AITasker_Modular.Modules.AiModule;
using Microsoft.AspNetCore.Http;
using System.Text.Json;
using System;
using System.Collections.Generic;

namespace API.Modules.AiModule
{
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
        /// Gửi lượt chat dạng JSON raw trong Body (dùng cho luồng chat thông thường).
        /// </summary>
        [HttpPost("send-session")]
        [Consumes("application/json")]
        public async Task<IActionResult> SendSession([FromBody] AIChatRequest request)
        {
            if (request == null)
                return BadRequest(new { error = "Request body không hợp lệ." });

            try
            {
                var result = await _aiChatService.ProcessChatSessionAsync(request, null);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = "Internal Server Error",
                    message = ex.Message,
                    exceptionType = ex.GetType().FullName,
                    stackTrace = ex.StackTrace
                });
            }
        }

        /// <summary>
        /// Gửi lượt chat kèm file tải lên trực tiếp (multipart/form-data).
        /// </summary>
        [HttpPost("send-session-file")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> SendSessionForm([FromForm] AIChatFormRequest formInput)
        {
            if (formInput == null)
                return BadRequest(new { error = "Form data không hợp lệ." });

            try
            {
                var request = new AIChatRequest();

                // Lấy JSON payload từ trường request, json hoặc data
                var jsonStr = formInput.Request ?? formInput.Json ?? formInput.Data;

                if (!string.IsNullOrEmpty(jsonStr))
                {
                    request = JsonSerializer.Deserialize<AIChatRequest>(jsonStr, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    }) ?? new AIChatRequest();
                }
                else
                {
                    // Fallback: Bind các trường riêng lẻ từ Form
                    request.ContextSummary = formInput.ContextSummary ?? string.Empty;
                    request.FilePath = formInput.FilePath;
                    
                    if (!string.IsNullOrEmpty(formInput.MessagesHistory))
                    {
                        request.MessagesHistory = JsonSerializer.Deserialize<List<AIMessageDto>>(formInput.MessagesHistory, new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        }) ?? new List<AIMessageDto>();
                    }
                }

                var result = await _aiChatService.ProcessChatSessionAsync(request, formInput.File);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = "Internal Server Error",
                    message = ex.Message,
                    exceptionType = ex.GetType().FullName,
                    stackTrace = ex.StackTrace
                });
            }
        }
    }

    public class AIChatFormRequest
    {
        /// <summary>
        /// Chuỗi JSON đầy đủ của AIChatRequest (ví dụ: {"messages_history": [...], "context_summary": ""})
        /// </summary>
        public string? Request { get; set; }
        public string? Json { get; set; }
        public string? Data { get; set; }

        public string? ContextSummary { get; set; }
        public string? FilePath { get; set; }

        /// <summary>
        /// Chuỗi JSON của danh sách tin nhắn (nếu gửi riêng lẻ)
        /// </summary>
        public string? MessagesHistory { get; set; }

        /// <summary>
        /// File tài liệu hoặc hình ảnh đính kèm (hỗ trợ .pdf, .png, .jpg, .jpeg, .docx, .txt)
        /// </summary>
        public IFormFile? File { get; set; }
    }
}