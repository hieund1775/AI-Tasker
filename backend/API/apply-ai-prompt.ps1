# Script tu dong ap dung tinh nang: System Prompt rang buoc + JSON mode cho Gemini
# Chay tu thu muc: backend\API
# Cach chay: powershell -ExecutionPolicy Bypass -File .\apply-ai-prompt.ps1

$ErrorActionPreference = "Stop"
$base = Join-Path (Get-Location) "Modules\AiModule"

if (-not (Test-Path $base)) {
    Write-Host "KHONG TIM THAY thu muc Modules\AiModule. Hay dam bao ban dang dung o thu muc backend\API" -ForegroundColor Red
    exit 1
}

$promptFolder = Join-Path $base "Prompts"
New-Item -ItemType Directory -Force -Path $promptFolder | Out-Null

# ---------- ai-system-prompt.md ----------
$systemPrompt = @'
You are an AI assistant embedded in the AI-Tasker platform, helping a Freelance Expert convert a Client's Use Case into a structured list of User Stories.

## YOUR ROLE
- The Expert selects a Use Case (written by the Client) from a job post.
- The Expert chats with you to generate, refine, add, or remove User Stories based on that Use Case.
- You maintain the FULL, UPDATED list of User Stories on every turn -- never just the delta/diff.

## INPUT YOU WILL RECEIVE
1. A [CONTEXT_SUMMARY_TRANG_THAI_CU] block (optional): a JSON string representing the CURRENT list of User Stories already generated in previous turns. If present, treat this as the baseline to edit (add/remove/modify), not something to discard and regenerate from scratch.
2. A [NOI_DUNG_FILE_DINH_KEM] block (optional): raw text extracted from a file the Expert attached (.docx or .txt).
3. A [YEU_CAU_HIEN_TAI] block: the Expert's latest message. This may be:
   - The original Use Case text (first turn), or
   - A refinement instruction (e.g. "add a story about login", "remove story 2", "make story 3 more detailed").

## OUTPUT FORMAT -- STRICT
You MUST respond with a single JSON object matching exactly this schema (no extra fields, no markdown fences, no commentary outside the JSON):

{
  "intent": "collecting_info" | "success" | "off_topic" | "error",
  "chat_message": "string -- a short conversational reply to the Expert, in the SAME language the Expert used (Vietnamese or English)",
  "payload": null OR an array of Task objects (see schema below),
  "context_summary": "string -- a JSON string (escaped) representing the FULL updated list of User Stories, to be echoed back by the frontend on the next turn",
  "validation_errors": [ "string", ... ],
  "is_complete": true | false
}

### Task object schema (used inside "payload", as an array):
[
  {
    "Title": "string -- short name of a task group / epic",
    "MiniTasks": [
      {
        "Title": "string -- a single User Story, ALWAYS written in English, in the format: 'As a [role], I want [feature], so that [benefit].'",
        "Duration": integer -- your best estimate of the number of days needed to implement this story
      }
    ]
  }
]

## LANGUAGE RULES -- IMPORTANT
- "chat_message" must be written in whatever language the Expert is using (Vietnamese or English).
- Every "MiniTasks[].Title" (the User Story text itself) must ALWAYS be written in English, regardless of the Expert's language. This avoids encoding issues and keeps stored data consistent.
- Never use special Unicode punctuation (curly quotes, em-dashes) inside JSON string values if a plain ASCII equivalent exists -- prefer plain straight quotes and hyphens.

## BEHAVIOR RULES
1. On the first turn (no context_summary provided), generate a fresh list of User Stories from the Use Case / attached file content.
2. On later turns (context_summary provided), interpret the Expert's latest message as an edit instruction relative to that existing list. Return the FULL list after applying the edit -- do not drop unrelated stories.
3. If the Expert's message is unrelated to the Use Case / User Story workflow (e.g. small talk, unrelated technical questions, requests outside this feature's scope), set:
   - "intent": "off_topic"
   - "chat_message": a polite message (in the Expert's language) explaining that you can only help with generating/editing User Stories from the Use Case, and you cannot answer this
   - "payload": null
   - "context_summary": echo back the previous context_summary unchanged (do not lose existing work)
4. If you successfully generated or updated the list, set "intent": "success" and "is_complete": true.
5. If you need more information from the Expert before proceeding (e.g. the Use Case text is empty or too vague), set "intent": "collecting_info", explain what you need in "chat_message", and set "payload": null.
6. Never fabricate a Use Case if none was provided -- ask for it instead (intent: collecting_info).
7. Keep "Duration" realistic (1-15 days per story) based on apparent complexity.
8. Do not include any field not listed in the schema above. Do not wrap the JSON in markdown code fences.
'@

# ---------- GeminiUtil.cs ----------
$geminiUtil = @'
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace AITasker_Modular.Modules.AiModule;

public class GeminiUtil
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    // Su dung dong model gemini-2.5-flash de xu ly context dai cuc muot va phan hoi nhanh
    private const string GeminiBaseUrl =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    public GeminiUtil(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;

        // Doc API Key tu appsettings.json (section "Gemini:ApiKey") hoac bien moi truong GEMINI_API_KEY
        _apiKey = configuration["Gemini:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY")
            ?? throw new InvalidOperationException(
                "Chua cau hinh Gemini API Key. Hay them vao appsettings.json (Gemini:ApiKey) hoac bien moi truong GEMINI_API_KEY.");
    }

    // Goi Gemini API voi payload contents thuan tuy, khong ep JSON schema (dung cho cac tac vu tu do)
    public async Task<string> CallGeminiApiAsync(object payload)
    {
        return await SendRequestAsync(payload);
    }

    // Goi Gemini API co system instruction rieng + ep buoc tra ve dung JSON (application/json)
    // Day la ham nen dung cho AiChatService de dam bao Gemini KHONG BAO GIO tra loi bang van ban tu do
    public async Task<string> CallGeminiApiWithJsonModeAsync(string systemInstructionText, object[] contents)
    {
        var payload = new
        {
            systemInstruction = new
            {
                parts = new[] { new { text = systemInstructionText } }
            },
            contents = contents,
            generationConfig = new
            {
                responseMimeType = "application/json"
            }
        };

        return await SendRequestAsync(payload);
    }

    private async Task<string> SendRequestAsync(object payload)
    {
        var requestUrl = $"{GeminiBaseUrl}?key={_apiKey}";

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });

        var httpRequest = new HttpRequestMessage(HttpMethod.Post, requestUrl)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        var response = await _httpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"Gemini API Error [{response.StatusCode}]: {responseBody}");
        }

        return responseBody;
    }
}
'@

# ---------- AiChatService.cs ----------
$aiChatService = @'
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

            var promptPath = Path.Combine(_env.ContentRootPath, "Modules", "AiModule", "Prompts", "ai-system-prompt.md");

            if (!File.Exists(promptPath))
                throw new FileNotFoundException($"Khong tim thay file system prompt tai: {promptPath}");

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
'@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText((Join-Path $promptFolder "ai-system-prompt.md"), $systemPrompt, $utf8NoBom)
Write-Host "Da ghi: Prompts\ai-system-prompt.md" -ForegroundColor Green

[System.IO.File]::WriteAllText((Join-Path $base "GeminiUtil.cs"), $geminiUtil, $utf8NoBom)
Write-Host "Da ghi: GeminiUtil.cs" -ForegroundColor Green

[System.IO.File]::WriteAllText((Join-Path $base "AiChatService.cs"), $aiChatService, $utf8NoBom)
Write-Host "Da ghi: AiChatService.cs" -ForegroundColor Green

# ---------- Cap nhat appsettings.json: them Gemini:ApiKey neu chua co ----------
$appsettingsPath = Join-Path (Get-Location) "appsettings.json"
if (Test-Path $appsettingsPath) {
    $json = Get-Content $appsettingsPath -Raw | ConvertFrom-Json

    if (-not $json.PSObject.Properties.Name.Contains("Gemini")) {
        $json | Add-Member -MemberType NoteProperty -Name "Gemini" -Value ([PSCustomObject]@{ ApiKey = "DAN_API_KEY_MOI_CUA_BAN_VAO_DAY" })
        $jsonOut = $json | ConvertTo-Json -Depth 10
        [System.IO.File]::WriteAllText($appsettingsPath, $jsonOut, $utf8NoBom)
        Write-Host "Da them section 'Gemini:ApiKey' vao appsettings.json -- NHO THAY THE bang API key that cua ban!" -ForegroundColor Yellow
    } else {
        Write-Host "appsettings.json da co section 'Gemini' -- khong ghi de, kiem tra lai thu cong." -ForegroundColor Yellow
    }
} else {
    Write-Host "KHONG TIM THAY appsettings.json -- ban can tu them section Gemini:ApiKey thu cong." -ForegroundColor Red
}

Write-Host ""
Write-Host "HOAN TAT. Dang build de kiem tra..." -ForegroundColor Cyan
dotnet build
