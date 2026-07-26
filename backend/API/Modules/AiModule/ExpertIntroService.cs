using System.Text.Json;
using System.Text.Json.Serialization;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.UserModule;
using Microsoft.EntityFrameworkCore;

namespace AITasker_Modular.Modules.AiModule;

public class ExpertIntroService
{
    private readonly DataContext _db;
    private readonly GeminiUtil _geminiUtil;
    private readonly AiPromptHelper _promptHelper;
    private readonly ILogger<ExpertIntroService> _logger;

    public ExpertIntroService(
        DataContext db,
        GeminiUtil geminiUtil,
        AiPromptHelper promptHelper,
        ILogger<ExpertIntroService> logger)
    {
        _db = db;
        _geminiUtil = geminiUtil;
        _promptHelper = promptHelper;
        _logger = logger;
    }

    public async Task<GenerateExpertIntroResponse> GenerateExpertIntroductionAsync(GenerateExpertIntroRequest request)
    {
        if (request == null || request.ExpertId == Guid.Empty)
        {
            throw new ArgumentException("Expert ID không hợp lệ.");
        }

        // 1. Lấy thông tin tài khoản User & Profile Expert
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.ExpertId);
        if (user == null)
        {
            throw new InvalidOperationException($"Không tìm thấy tài khoản Expert với ID: {request.ExpertId}");
        }

        var expertProfile = await _db.ExpertProfiles.FirstOrDefaultAsync(ep => ep.UserId == request.ExpertId);

        // 2. Lấy danh sách kỹ năng (Skills) của Expert
        var skills = await _db.ExpertProfileSkills
            .Where(eps => eps.ExpertProfilesUserId == request.ExpertId)
            .Include(eps => eps.Skill)
            .Select(eps => eps.Skill != null ? eps.Skill.Name : string.Empty)
            .Where(s => !string.IsNullOrEmpty(s))
            .ToListAsync();

        // 3. Lấy dữ liệu các dự án Expert đã và đang tham gia (Projects & JobPosts & Domains)
        var projects = await _db.Projects
            .Where(p => p.ExpertId == request.ExpertId)
            .Include(p => p.JobPost)
                .ThenInclude(j => j!.Domain)
            .Include(p => p.JobPost)
                .ThenInclude(j => j!.Specialization)
            .Include(p => p.ProjectSkills)
                .ThenInclude(ps => ps.Skill)
            .Include(p => p.Tasks)
            .ToListAsync();

        // 4. Lấy các đánh giá (Reviews) của khách hàng dành cho Expert
        var reviews = await _db.Reviews
            .Where(r => r.TargetUserId == request.ExpertId)
            .Include(r => r.CreatedBy)
            .OrderByDescending(r => r.CreatedAt)
            .Take(10)
            .ToListAsync();

        // 5. Lấy thông tin bài đăng dự án mục tiêu (Target Job Post) nếu có
        object? targetProjectPayload = null;
        bool hasTargetProject = false;

        if (request.TargetJobPostId.HasValue && request.TargetJobPostId.Value != Guid.Empty)
        {
            var targetJob = await _db.JobPosts
                .Include(j => j.Domain)
                .Include(j => j.Specialization)
                .Include(j => j.JobPostSkills)
                    .ThenInclude(js => js.Skill)
                .FirstOrDefaultAsync(j => j.Id == request.TargetJobPostId.Value);

            if (targetJob != null)
            {
                hasTargetProject = true;
                targetProjectPayload = new
                {
                    job_post_id = targetJob.Id,
                    title = targetJob.Title,
                    description = targetJob.Description,
                    domain = targetJob.Domain?.Name ?? string.Empty,
                    specialization = targetJob.Specialization?.Name ?? string.Empty,
                    budget = targetJob.Budget,
                    deadline_days = targetJob.Deadline,
                    required_skills = targetJob.JobPostSkills
                        .Select(js => js.Skill?.Name)
                        .Where(s => !string.IsNullOrEmpty(s))
                        .ToList()
                };
            }
        }

        // Nếu không truyền TargetJobPostId nhưng có truyền chuỗi TargetProjectTitle/Description
        if (!hasTargetProject && (!string.IsNullOrWhiteSpace(request.TargetProjectTitle) || !string.IsNullOrWhiteSpace(request.TargetProjectDescription)))
        {
            hasTargetProject = true;
            targetProjectPayload = new
            {
                title = request.TargetProjectTitle ?? string.Empty,
                description = request.TargetProjectDescription ?? string.Empty
            };
        }

        // 6. Chuẩn bị dữ liệu đầu vào đóng gói JSON cho Gemini AI
        var expertDataPayload = new
        {
            expert_profile = new
            {
                full_name = user.FullName,
                email = user.Email,
                job_title = expertProfile?.JobTitle ?? "Chuyên gia Trí tuệ Nhân tạo",
                major = expertProfile?.Major ?? string.Empty,
                industry = expertProfile?.Industry ?? string.Empty,
                category = expertProfile?.Category ?? string.Empty,
                certifications = expertProfile?.Certifications ?? string.Empty,
                existing_bio = expertProfile?.Bio ?? string.Empty,
                location = expertProfile?.Location ?? string.Empty,
                hourly_rate = expertProfile?.HourlyRate ?? 0,
                success_rate = expertProfile?.SuccessRate ?? 0,
                reputation_credit = expertProfile?.ReputationCredit ?? 0
            },
            skills = skills,
            projects = projects.Select(p => new
            {
                project_id = p.Id,
                title = p.JobPost?.Title ?? "Dự án",
                description = p.JobPost?.Description ?? string.Empty,
                status = p.Status,
                domain = p.JobPost?.Domain?.Name ?? string.Empty,
                specialization = p.JobPost?.Specialization?.Name ?? string.Empty,
                budget = p.JobPost?.Budget ?? 0,
                skills_used = p.ProjectSkills.Select(ps => ps.Skill?.Name).Where(s => !string.IsNullOrEmpty(s)).ToList(),
                tasks_count = p.Tasks.Count
            }),
            reviews = reviews.Select(r => new
            {
                client_name = r.CreatedBy?.FullName ?? "Khách hàng",
                rating = r.Rating,
                comment = r.Comment ?? string.Empty,
                created_at = r.CreatedAt.ToString("yyyy-MM-dd")
            }),
            target_project_info = targetProjectPayload,
            preferences = new
            {
                tone = string.IsNullOrWhiteSpace(request.Tone) ? (hasTargetProject ? "Persuasive" : "Professional") : request.Tone,
                purpose = string.IsNullOrWhiteSpace(request.Purpose) ? (hasTargetProject ? "Proposal Introduction" : "Profile Bio") : request.Purpose,
                custom_highlights = request.CustomHighlights ?? string.Empty,
                language = string.IsNullOrWhiteSpace(request.Language) ? "vi" : request.Language
            }
        };

        // 7. Đọc System Prompt & Gọi Gemini AI với JSON mode
        var systemInstructionText = _promptHelper.GetSystemPrompt("expert-intro-system-prompt.md");
        var jsonPayloadString = JsonSerializer.Serialize(expertDataPayload, new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        });

        var contents = new object[]
        {
            new
            {
                role = "user",
                parts = new[]
                {
                    new { text = $"[THONG_TIN_EXPERT_VA_DU_AN_MUC_TIEU]\n{jsonPayloadString}" }
                }
            }
        };

        var rawResponse = await _geminiUtil.CallGeminiApiWithJsonModeAsync(systemInstructionText, contents);
        var aiText = AiPromptHelper.ExtractTextFromGeminiResponse(rawResponse);

        // 8. Parse kết quả trả về từ Gemini
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            AllowTrailingCommas = true
        };

        ExpertIntroAiRawOutput? parsedAiOutput = null;
        try
        {
            var cleanedText = StripMarkdownFences(aiText);
            parsedAiOutput = JsonSerializer.Deserialize<ExpertIntroAiRawOutput>(cleanedText, options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi parse JSON kết quả AI Expert Introduction. Content: {AiText}", aiText);
        }

        return new GenerateExpertIntroResponse
        {
            ExpertId = request.ExpertId,
            GeneratedIntroduction = parsedAiOutput?.GeneratedIntroduction ?? aiText,
            KeyHighlights = parsedAiOutput?.KeyHighlights ?? new List<string>(),
            SuggestedTagline = parsedAiOutput?.SuggestedTagline ?? string.Empty,
            MatchReasons = parsedAiOutput?.MatchReasons ?? new List<string>(),
            UsedDataSummary = new ExpertIntroDataSummary
            {
                SkillsCount = skills.Count,
                ProjectsCount = projects.Count,
                ReviewsCount = reviews.Count,
                HasTargetProject = hasTargetProject
            }
        };
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
}

public class ExpertIntroAiRawOutput
{
    [JsonPropertyName("generated_introduction")]
    public string GeneratedIntroduction { get; set; } = string.Empty;

    [JsonPropertyName("key_highlights")]
    public List<string> KeyHighlights { get; set; } = new();

    [JsonPropertyName("suggested_tagline")]
    public string SuggestedTagline { get; set; } = string.Empty;

    [JsonPropertyName("match_reasons")]
    public List<string> MatchReasons { get; set; } = new();
}
