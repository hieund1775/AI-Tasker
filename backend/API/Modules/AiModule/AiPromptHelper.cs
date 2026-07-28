using System.Text;
using System.Text.Json;
using NPOI.XWPF.UserModel;

namespace AITasker_Modular.Modules.AiModule;

// Cac ham dung chung cho moi tinh nang AI trong module nay: doc/cache prompt file,
// doc file dinh kem, xu ly response tho tu Gemini. Tach rieng de tai su dung
// giua AiChatService (User Story) va MiniTaskAnalysisService (MiniTask) khong bi trung code.
public class AiPromptHelper
{
    private readonly IWebHostEnvironment _env;
    private static readonly Dictionary<string, string> _cachedPrompts = new();
    private static readonly object _cacheLock = new();

    public AiPromptHelper(IWebHostEnvironment env)
    {
        _env = env;
    }

    // Doc va cache noi dung 1 file system prompt theo ten file, chi doc tu dia 1 lan cho moi ten file
    public string GetSystemPrompt(string promptFileName)
    {
        if (_cachedPrompts.TryGetValue(promptFileName, out var cached)) return cached;

        lock (_cacheLock)
        {
            if (_cachedPrompts.TryGetValue(promptFileName, out cached)) return cached;

            var promptPath = Path.Combine(_env.ContentRootPath, "Modules", "AiModule", "Prompts", promptFileName);

            if (!File.Exists(promptPath))
                throw new FileNotFoundException($"Khong tim thay file system prompt tai: {promptPath}");

            var content = File.ReadAllText(promptPath, Encoding.UTF8);
            _cachedPrompts[promptFileName] = content;
            return content;
        }
    }

    // Doc file .docx / .txt tu duong dan da upload san qua FileUploadController
    public string ReadTextFromFile(string relativePath)
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

    public static string ExtractTextFromGeminiResponse(string rawJson)
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

    public static AiStructuredResponse ParseStructuredResponse(string aiText)
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