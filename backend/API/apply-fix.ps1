# Script tu dong ghi de 4 file cho AiChatService feature
# Chay script nay tu thu muc: backend\API
# Cach chay: powershell -ExecutionPolicy Bypass -File .\apply-fix.ps1

$ErrorActionPreference = "Stop"
$base = Join-Path (Get-Location) "Modules\AiModule"

if (-not (Test-Path $base)) {
    Write-Host "KHONG TIM THAY thu muc Modules\AiModule. Hay dam bao ban dang dung o thu muc backend\API" -ForegroundColor Red
    exit 1
}

Write-Host "Dang cai package NPOI..." -ForegroundColor Cyan
dotnet add package NPOI --version 2.7.1

Write-Host "Dang tao thu muc upload..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path ".\wwwroot\uploads\chat-files" | Out-Null

# ---------- Airesponedto.cs ----------
$airesponedto = @'
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
'@

# ---------- AiChatService.cs ----------
$aichatservice = @'
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

    public AiChatService(GeminiUtil geminiUtil, IWebHostEnvironment env)
    {
        _geminiUtil = geminiUtil;
        _env = env;
    }

    // Xu ly mot luot chat: nhan van ban nguoi dung nhap + (tuy chon) file da upload san tren server
    public async Task<AiStructuredResponse> ProcessChatSessionAsync(AIChatRequest request)
    {
        var partsList = new List<object>();

        // 1. Neu co chuoi tom tat context cua cac luot truoc, nap vao dau luong de AI biet lich su du lieu cu
        if (!string.IsNullOrEmpty(request.ContextSummary))
        {
            partsList.Add(new { text = $"[CONTEXT_SUMMARY_TRANG_THAI_CU]:\n{request.ContextSummary}" });
        }

        // 2. Lay tin nhan moi nhat cua User gui len
        var lastUserMsg = request.MessagesHistory?
            .LastOrDefault(m => m.Role.Equals("user", StringComparison.OrdinalIgnoreCase));
        string currentInputText = lastUserMsg?.Content ?? string.Empty;

        // 3. Neu co file_path (nguoi dung da keo-tha file kem theo), doc noi dung file do va nap vao luong
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

        // 4. Them yeu cau van ban hien tai cua user (neu co)
        if (!string.IsNullOrEmpty(currentInputText))
        {
            partsList.Add(new { text = $"[YEU_CAU_HIEN_TAI]:\n{currentInputText}" });
        }

        // 5. Dong goi payload gui len Gemini API thong qua GeminiUtil co san cua nhom
        var payload = new
        {
            contents = new[]
            {
                new { role = "user", parts = partsList }
            }
        };

        var rawJson = await _geminiUtil.CallGeminiApiAsync(payload);

        // 6. Trich xuat van ban tho tu cau truc phong bi response envelope cua Google
        var aiText = ExtractTextFromGeminiResponse(rawJson);

        // 7. Parse JSON an toan ra DTO sach
        return ParseStructuredResponse(aiText);
    }

    // -------------------------------------------------------
    // DOC FILE .docx / .txt TU DUONG DAN DA UPLOAD SAN
    // -------------------------------------------------------
    private string ReadTextFromFile(string relativePath)
    {
        // Chong path traversal: chi cho phep doc file nam trong wwwroot
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
'@

# ---------- AiChatController.cs ----------
$aichatcontroller = @'
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using AITasker_Modular.Modules.AiModule;

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

        [HttpPost("send-session")]
        public async Task<IActionResult> SendSession([FromBody] AIChatRequest request)
        {
            if (request == null)
                return BadRequest(new { error = "Request body khong hop le." });

            var result = await _aiChatService.ProcessChatSessionAsync(request);
            return Ok(result);
        }
    }
}
'@

# ---------- FileUploadController.cs ----------
$fileuploadcontroller = @'
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;

namespace API.Modules.AiModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class FileUploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        // Chi cho phep cac dinh dang da ho tro doc o AiChatService
        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".docx", ".txt"
        };

        // Gioi han dung luong file: 10MB
        private const long MaxFileSizeBytes = 10 * 1024 * 1024;

        public FileUploadController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpPost("upload")]
        [RequestSizeLimit(MaxFileSizeBytes)]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "Chua co file nao duoc gui len." });

            if (file.Length > MaxFileSizeBytes)
                return BadRequest(new { error = "File vuot qua dung luong cho phep (toi da 10MB)." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(new { error = $"Dinh dang file '{ext}' khong duoc ho tro. Chi chap nhan .docx, .txt." });

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var uploadFolderRelative = Path.Combine("uploads", "chat-files");
            var uploadFolderFull = Path.Combine(webRoot, uploadFolderRelative);

            Directory.CreateDirectory(uploadFolderFull);

            // Dat ten file duy nhat de tranh trung/ghi de
            var safeFileName = $"{Guid.NewGuid():N}{ext}";
            var fullSavePath = Path.Combine(uploadFolderFull, safeFileName);

            using (var stream = new FileStream(fullSavePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Tra ve duong dan tuong doi (dung lai trong request send-session o field file_path)
            var relativePath = Path.Combine(uploadFolderRelative, safeFileName).Replace("\\", "/");

            return Ok(new { file_path = relativePath, original_name = file.FileName });
        }
    }
}
'@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText((Join-Path $base "Airesponedto.cs"), $airesponedto, $utf8NoBom)
Write-Host "Da ghi: Airesponedto.cs" -ForegroundColor Green

[System.IO.File]::WriteAllText((Join-Path $base "AiChatService.cs"), $aichatservice, $utf8NoBom)
Write-Host "Da ghi: AiChatService.cs" -ForegroundColor Green

[System.IO.File]::WriteAllText((Join-Path $base "AiChatController.cs"), $aichatcontroller, $utf8NoBom)
Write-Host "Da ghi: AiChatController.cs" -ForegroundColor Green

[System.IO.File]::WriteAllText((Join-Path $base "FileUploadController.cs"), $fileuploadcontroller, $utf8NoBom)
Write-Host "Da ghi: FileUploadController.cs" -ForegroundColor Green

Write-Host ""
Write-Host "HOAN TAT. Dang build de kiem tra..." -ForegroundColor Cyan
dotnet build
