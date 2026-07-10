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

    // Cache system prompt trong bo nho, chi doc file 1 lan duy nhat luc can (lazy init, thread-safe)
    private static string? _cachedSystemPrompt;
    private static readonly object _cacheLock = new();

    public AiChatService(GeminiUtil geminiUtil, IWebHostEnvironment env)
    {
        _geminiUtil = geminiUtil;
        _env = env;
    }

    // Xu ly mot luot chat: nhan van ban nguoi dung nhap + (tuy chon) file da upload san tren server
    public async Task<AiStructuredResponse> ProcessChatSessionAsync(AIChatRequest request)
    {
        var systemPrompt = GetSystemPrompt();
        var partsList = new List<object>();

        // 1. Neu co chuoi tom tat context (danh sach User Story hien tai) cua cac luot truoc,
        //    nap vao dau luong de AI biet ma sua/them/xoa, khong tao moi hoan toan
        if (!string.IsNullOrEmpty(request.ContextSummary))
        {
            partsList.Add(new { text = $"[CONTEXT_SUMMARY_TRANG_THAI_CU]:\n{request.ContextSummary}" });
        }

        // 2. Lay tin nhan moi nhat cua User (Expert) gui len
        var lastUserMsg = request.MessagesHistory?
            .LastOrDefault(m => m.Role.Equals("user", StringComparison.OrdinalIgnoreCase));
        string currentInputText = lastUserMsg?.Content ?? string.Empty;

        // 3. Neu co file_path (Expert da keo-tha file kem theo), doc noi dung file do va nap vao luong
        if (!string.IsNullOrEmpty(request.FilePath))
        {
            string fileTextContent;
            try
            {
                fileTextContent = ReadTextFromFile(request.FilePath);
            }
            catch (Exception ex)
            {
                fileTextContent = $"[LOI DOC FILE: {ex.Message}]";
            }

            partsList.Add(new { text = $"[NOI_DUNG_FILE_DINH_KEM]:\n{fileTextContent}" });
        }

        // 4. Them yeu cau van ban hien tai cua Expert (Use Case goc hoac yeu cau chinh sua)
        if (!string.IsNullOrEmpty(currentInputText))
        {
            partsList.Add(new { text = $"[YEU_CAU_HIEN_TAI]:\n{currentInputText}" });
        }

        // 5. Goi Gemini voi system instruction rieng + ep buoc tra ve dung JSON schema
        var contents = new object[]
        {
            new { role = "user", parts = partsList }
        };

        var rawJson = await _geminiUtil.CallGeminiApiWithJsonModeAsync(systemPrompt, contents);

        // 6. Trich xuat van ban tho tu cau truc phong bi response envelope cua Google
        var aiText = ExtractTextFromGeminiResponse(rawJson);

        // 7. Parse JSON an toan ra DTO sach
        return ParseStructuredResponse(aiText);
    }

    // -------------------------------------------------------
    // DOC & CACHE FILE SYSTEM PROMPT (chi doc tu dia 1 lan)
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
                throw new FileNotFoundException($"Khong tim thay file system prompt tai cac duong dan da thu:\n- " + string.Join("\n- ", pathsToTry));
            }

            _cachedSystemPrompt = File.ReadAllText(promptPath, Encoding.UTF8);
            return _cachedSystemPrompt;
        }
    }

    // -------------------------------------------------------
    // DOC FILE .docx / .txt TU DUONG DAN DA UPLOAD SAN
    // -------------------------------------------------------
    private string ReadTextFromFile(string relativePath)
    {
        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var fullPath = Path.GetFullPath(Path.Combine(webRoot, relativePath));

        if (!fullPath.StartsWith(Path.GetFullPath(webRoot), StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Duong dan file khong hop le.");

        if (!File.Exists(fullPath))
            throw new FileNotFoundException("Khong tim thay file tren server.", fullPath);

        var ext = Path.GetExtension(fullPath).ToLowerInvariant();

        return ext switch
        {
            ".txt" => File.ReadAllText(fullPath, Encoding.UTF8),
            ".docx" => ReadDocx(fullPath),
            _ => throw new NotSupportedException($"Dinh dang file '{ext}' chua duoc ho tro. Chi ho tro .docx, .txt.")
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
    // CAC HAM BO TRO PHAN TICH RESPONSE CUA GEMINI
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