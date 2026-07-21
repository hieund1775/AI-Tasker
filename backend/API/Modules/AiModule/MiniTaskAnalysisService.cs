namespace AITasker_Modular.Modules.AiModule;

public class MiniTaskAnalysisService
{
    private readonly GeminiUtil _geminiUtil;
    private readonly AiPromptHelper _promptHelper;
    public MiniTaskAnalysisService(GeminiUtil geminiUtil, AiPromptHelper promptHelper)
    {
        _geminiUtil = geminiUtil;
        _promptHelper = promptHelper;
    }

    public async Task<AiStructuredResponse> AnalyzeMiniTasksAsync(MiniTaskAnalysisRequest request)
    {
        var isClient = request.UserRole != null && request.UserRole.Equals("client", StringComparison.OrdinalIgnoreCase);
        var promptFileName = isClient ? "client-minitask-system-prompt.md" : "expert-minitask-system-prompt.md";
        var systemPrompt = _promptHelper.GetSystemPrompt(promptFileName);
        var partsList = new List<object>();

        if (!string.IsNullOrEmpty(request.ContextSummary))
        {
            partsList.Add(new { text = $"[CONTEXT_SUMMARY_TRANG_THAI_CU]:\n{request.ContextSummary}" });
        }

        var lastUserMsg = request.MessagesHistory?
            .LastOrDefault(m => m.Role.Equals("user", StringComparison.OrdinalIgnoreCase));
        string currentInputText = lastUserMsg?.Content ?? string.Empty;

        if (!string.IsNullOrEmpty(request.FilePath))
        {
            string fileTextContent;
            try
            {
                fileTextContent = _promptHelper.ReadTextFromFile(request.FilePath);
            }
            catch (Exception ex)
            {
                fileTextContent = $"[LOI DOC FILE: {ex.Message}]";
            }

            partsList.Add(new { text = $"[NOI_DUNG_FILE_DINH_KEM]:\n{fileTextContent}" });
        }

        if (!string.IsNullOrEmpty(currentInputText))
        {
            partsList.Add(new { text = $"[YEU_CAU_HIEN_TAI]:\n{currentInputText}" });
        }

        var contents = new object[]
        {
            new { role = "user", parts = partsList }
        };

        var rawJson = await _geminiUtil.CallGeminiApiWithJsonModeAsync(systemPrompt, contents);
        var aiText = AiPromptHelper.ExtractTextFromGeminiResponse(rawJson);

        return AiPromptHelper.ParseStructuredResponse(aiText);
    }
}