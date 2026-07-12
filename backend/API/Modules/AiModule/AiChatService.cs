using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using AITasker_Modular.Modules.AiModule;
using NPOI.XWPF.UserModel;

namespace AITasker_Modular.Modules.AiModule;

public class AiChatService
{
    private readonly GeminiUtil _geminiUtil;
    private readonly IWebHostEnvironment _env;

    // Cache system prompt trong bộ nhớ, chỉ đọc file 1 lần duy nhất lúc cần (lazy init, thread-safe)
    private static string? _cachedSystemPrompt;
    private static readonly object _cacheLock = new();

    public AiChatService(GeminiUtil geminiUtil, IWebHostEnvironment env)
    {
        _geminiUtil = geminiUtil;
        _env = env;
    }

    // Xử lý một lượt chat: nhận văn bản người dùng nhập + (tùy chọn) file đã upload sẵn trên server hoặc file form-data gửi trực tiếp
    public async Task<AiStructuredResponse> ProcessChatSessionAsync(AIChatRequest request, IFormFile? file = null)
    {
        var systemPrompt = GetSystemPrompt();
        var partsList = new List<object>();

        // 1. Nếu có chuỗi tóm tắt context (danh sách User Story hiện tại) của các lượt trước,
        //    nạp vào đầu luồng để AI biết mà sửa/thêm/xóa, không tạo mới hoàn toàn
        if (!string.IsNullOrEmpty(request.ContextSummary))
        {
            partsList.Add(new { text = $"[CONTEXT_SUMMARY_TRANG_THAI_CU]:\n{request.ContextSummary}" });
        }

        // 2. Lấy tin nhắn mới nhất của User (Expert) gửi lên
        var lastUserMsg = request.MessagesHistory?
            .LastOrDefault(m => m.Role.Equals("user", StringComparison.OrdinalIgnoreCase));
        string currentInputText = lastUserMsg?.Content ?? string.Empty;

        // 3. Xử lý File đính kèm (trực tiếp từ form-data hoặc từ relative path)
        if (file != null)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext == ".docx")
            {
                try
                {
                    using var stream = file.OpenReadStream();
                    var text = ReadDocxFromStream(stream);
                    partsList.Add(new { text = $"[NOI_DUNG_FILE_DINH_KEM]:\n{text}" });
                }
                catch (Exception ex)
                {
                    partsList.Add(new { text = $"[FILE READ ERROR DOCX: {ex.Message}]" });
                }
            }
            else if (ext == ".txt")
            {
                try
                {
                    using var stream = file.OpenReadStream();
                    var text = ReadTextFromStream(stream);
                    partsList.Add(new { text = $"[NOI_DUNG_FILE_DINH_KEM]:\n{text}" });
                }
                catch (Exception ex)
                {
                    partsList.Add(new { text = $"[FILE READ ERROR TXT: {ex.Message}]" });
                }
            }
            else if (ext == ".pdf" || ext == ".png" || ext == ".jpg" || ext == ".jpeg")
            {
                try
                {
                    var mimeType = ext switch
                    {
                        ".pdf" => "application/pdf",
                        ".png" => "image/png",
                        ".jpg" => "image/jpeg",
                        ".jpeg" => "image/jpeg",
                        _ => "application/octet-stream"
                    };
                    using var ms = new MemoryStream();
                    await file.CopyToAsync(ms);
                    var fileBytes = ms.ToArray();
                    partsList.Add(new
                    {
                        inlineData = new
                        {
                            mimeType = mimeType,
                            data = Convert.ToBase64String(fileBytes)
                        }
                    });
                }
                catch (Exception ex)
                {
                    partsList.Add(new { text = $"[FILE READ ERROR BINARY: {ex.Message}]" });
                }
            }
            else
            {
                partsList.Add(new { text = $"[FILE READ ERROR: File format {ext} is not supported for Gemini.]" });
            }
        }
        else if (!string.IsNullOrEmpty(request.FilePath))
        {
            try
            {
                var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
                var fullPath = Path.GetFullPath(Path.Combine(webRoot, request.FilePath));
                if (File.Exists(fullPath))
                {
                    var ext = Path.GetExtension(fullPath).ToLowerInvariant();
                    if (ext == ".docx")
                    {
                        var text = ReadDocx(fullPath);
                        partsList.Add(new { text = $"[NOI_DUNG_FILE_DINH_KEM]:\n{text}" });
                    }
                    else if (ext == ".txt")
                    {
                        var text = File.ReadAllText(fullPath, Encoding.UTF8);
                        partsList.Add(new { text = $"[NOI_DUNG_FILE_DINH_KEM]:\n{text}" });
                    }
                    else if (ext == ".pdf" || ext == ".png" || ext == ".jpg" || ext == ".jpeg")
                    {
                        var mimeType = ext switch
                        {
                            ".pdf" => "application/pdf",
                            ".png" => "image/png",
                            ".jpg" => "image/jpeg",
                            ".jpeg" => "image/jpeg",
                            _ => "application/octet-stream"
                        };
                        var fileBytes = File.ReadAllBytes(fullPath);
                        partsList.Add(new
                        {
                            inlineData = new
                            {
                                mimeType = mimeType,
                                data = Convert.ToBase64String(fileBytes)
                            }
                        });
                    }
                    else
                    {
                        partsList.Add(new { text = $"[FILE READ ERROR: File format {ext} is not supported for Gemini.]" });
                    }
                }
                else
                {
                    partsList.Add(new { text = $"[FILE READ ERROR: File not found at {request.FilePath}]" });
                }
            }
            catch (Exception ex)
            {
                partsList.Add(new { text = $"[FILE READ ERROR PRE-SAVED: {ex.Message}]" });
            }
        }

        // 4. Thêm yêu cầu văn bản hiện tại của Expert (Use Case gốc hoặc yêu cầu chỉnh sửa)
        if (!string.IsNullOrEmpty(currentInputText))
        {
            partsList.Add(new { text = $"[YEU_CAU_HIEN_TAI]:\n{currentInputText}" });
        }

        // 5. Gọi Gemini với system instruction riêng + ép buộc trả về đúng JSON schema
        var contents = new object[]
        {
            new { role = "user", parts = partsList }
        };

        var rawJson = await _geminiUtil.CallGeminiApiWithJsonModeAsync(systemPrompt, contents);

        // 6. Trích xuất văn bản thô từ cấu trúc phong bì response envelope của Google
        var aiText = ExtractTextFromGeminiResponse(rawJson);

        // 7. Parse JSON an toàn ra DTO sạch
        return ParseStructuredResponse(aiText);
    }

    private static string ReadTextFromStream(Stream stream)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    private static string ReadDocxFromStream(Stream stream)
    {
        var document = new XWPFDocument(stream);
        var sb = new StringBuilder();
        foreach (var para in document.Paragraphs)
        {
            sb.AppendLine(para.Text);
        }
        return sb.ToString();
    }

    // -------------------------------------------------------
    // ĐỌC & CACHE FILE SYSTEM PROMPT (chỉ đọc từ đĩa 1 lần)
    // -------------------------------------------------------
    private string GetSystemPrompt()
    {
        if (_cachedSystemPrompt != null) return _cachedSystemPrompt;

        lock (_cacheLock)
        {
            if (_cachedSystemPrompt != null) return _cachedSystemPrompt;

            var pathsToTry = new[]
            {
                Path.Combine(_env.ContentRootPath, "Modules", "AiModule", "Prompts", "ai-system-prompt.md"),
                Path.Combine(AppContext.BaseDirectory, "Modules", "AiModule", "Prompts", "ai-system-prompt.md"),
                Path.Combine(Directory.GetCurrentDirectory(), "Modules", "AiModule", "Prompts", "ai-system-prompt.md"),
                Path.Combine(Directory.GetCurrentDirectory(), "API", "Modules", "AiModule", "Prompts", "ai-system-prompt.md"),
                "Modules/AiModule/Prompts/ai-system-prompt.md"
            };

            string? promptPath = null;
            foreach (var path in pathsToTry)
            {
                if (File.Exists(path))
                {
                    promptPath = path;
                    break;
                }
            }

            if (promptPath == null)
            {
                throw new FileNotFoundException($"System prompt file not found at the tried paths:\n- " + string.Join("\n- ", pathsToTry));
            }

            _cachedSystemPrompt = File.ReadAllText(promptPath, Encoding.UTF8);
            return _cachedSystemPrompt;
        }
    }

    // -------------------------------------------------------
    // ĐỌC FILE .docx / .txt TỪ ĐƯỜNG DẪN ĐÃ UPLOAD SẴN
    // -------------------------------------------------------
    private string ReadTextFromFile(string relativePath)
    {
        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var fullPath = Path.GetFullPath(Path.Combine(webRoot, relativePath));

        if (!fullPath.StartsWith(Path.GetFullPath(webRoot), StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Invalid file path.");

        if (!File.Exists(fullPath))
            throw new FileNotFoundException("File not found on server.", fullPath);

        var ext = Path.GetExtension(fullPath).ToLowerInvariant();

        return ext switch
        {
            ".txt" => File.ReadAllText(fullPath, Encoding.UTF8),
            ".docx" => ReadDocx(fullPath),
            _ => throw new NotSupportedException($"File format '{ext}' is not supported. Only .docx, .txt are supported.")
        };
    }

    private static string ReadDocx(string fullPath)
    {
        using var fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read);
        var document = new XWPFDocument(fs);
        var sb = new StringBuilder();
        foreach (var para in document.Paragraphs)
        {
            sb.AppendLine(para.Text);
        }
        return sb.ToString();
    }

    // -------------------------------------------------------
    // CÁC HÀM BỔ TRỢ PHÂN TÍCH RESPONSE CỦA GEMINI
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