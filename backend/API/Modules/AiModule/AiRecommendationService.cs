using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.CategoryTagModule;
using AITasker_Modular.Modules.JobModule;
using AITasker_Modular.Modules.UserModule;
using Microsoft.EntityFrameworkCore;

namespace AITasker_Modular.Modules.AiModule;

public class AiRecommendationService
{
    private readonly DataContext _context;
    private readonly GeminiUtil _geminiUtil;

    public AiRecommendationService(DataContext context, GeminiUtil geminiUtil)
    {
        _context = context;
        _geminiUtil = geminiUtil;
    }

    public async Task<List<ExpertRecommendationResultDto>> RecommendExpertsAsync(ExpertRecommendationRequestDto dto)
    {
        // 1. Resolve Job Post details
        string title = string.Empty;
        string description = string.Empty;
        decimal budget = 0m;
        int deadline = 0;
        List<string> requiredSkills = new();
        List<string> detailedRequirements = new();

        if (dto.JobPostId.HasValue && dto.JobPostId.Value != Guid.Empty)
        {
            var jobPost = await _context.JobPosts
                .Include(j => j.JobPostSkills).ThenInclude(js => js.Skill)
                .Include(j => j.JobRequirements)
                .FirstOrDefaultAsync(j => j.Id == dto.JobPostId.Value);

            if (jobPost == null)
            {
                return new List<ExpertRecommendationResultDto>();
            }

            title = jobPost.Title;
            description = jobPost.Description;
            budget = jobPost.Budget;
            deadline = jobPost.Deadline;
            requiredSkills = jobPost.JobPostSkills
                .Select(js => js.Skill?.Name ?? string.Empty)
                .Where(name => !string.IsNullOrEmpty(name))
                .ToList();
            detailedRequirements = jobPost.JobRequirements
                .Select(r => $"{r.UseCaseName}: {r.Description}")
                .Where(desc => !string.IsNullOrEmpty(desc))
                .ToList();
        }
        else
        {
            title = dto.Title ?? string.Empty;
            description = dto.Description ?? string.Empty;
            budget = dto.Budget ?? 0m;
            deadline = dto.Deadline ?? 0;

            if (dto.SkillIds != null && dto.SkillIds.Any())
            {
                var skillGuids = dto.SkillIds
                    .Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty)
                    .Where(g => g != Guid.Empty)
                    .ToList();

                requiredSkills = await _context.Skills
                    .Where(s => skillGuids.Contains(s.Id))
                    .Select(s => s.Name)
                    .ToListAsync();
            }
        }

        // 2. Fetch active experts
        var activeExperts = await _context.Users
            .Where(u => u.Role.Equals("Expert", StringComparison.OrdinalIgnoreCase) && 
                        u.Status.Equals("Active", StringComparison.OrdinalIgnoreCase))
            .ToListAsync();

        if (!activeExperts.Any())
        {
            return new List<ExpertRecommendationResultDto>();
        }

        var expertIds = activeExperts.Select(e => e.Id).ToList();
        var expertProfiles = await _context.ExpertProfiles
            .Where(p => expertIds.Contains(p.UserId))
            .Include(p => p.ExpertProfileSkills).ThenInclude(eps => eps.Skill)
            .ToListAsync();

        var expertProfileMap = expertProfiles.ToDictionary(p => p.UserId);

        // 3. Score and Filter candidates in memory to select top 10
        var candidateList = new List<ExpertCandidateInternal>();
        var jobWords = TokenizeText(title + " " + description);

        foreach (var expert in activeExperts)
        {
            if (!expertProfileMap.TryGetValue(expert.Id, out var profile))
            {
                continue; // Skip experts without profile details
            }

            var expertSkills = profile.ExpertProfileSkills
                .Select(eps => eps.Skill?.Name ?? string.Empty)
                .Where(name => !string.IsNullOrEmpty(name))
                .ToList();

            // Calculate skill intersection
            int matchingSkillsCount = expertSkills
                .Intersect(requiredSkills, StringComparer.OrdinalIgnoreCase)
                .Count();

            // Calculate keyword overlap fallback
            var expertBioWords = TokenizeText(profile.JobTitle + " " + profile.Major + " " + profile.Bio);
            int keywordMatchCount = jobWords.Intersect(expertBioWords, StringComparer.OrdinalIgnoreCase).Count();

            candidateList.Add(new ExpertCandidateInternal
            {
                User = expert,
                Profile = profile,
                Skills = expertSkills,
                MatchingSkillsCount = matchingSkillsCount,
                KeywordMatchCount = keywordMatchCount
            });
        }

        // Rank by matching skills count -> keyword matches -> success rate -> reputation credit
        var topCandidates = candidateList
            .OrderByDescending(c => c.MatchingSkillsCount)
            .ThenByDescending(c => c.KeywordMatchCount)
            .ThenByDescending(c => c.Profile.SuccessRate)
            .ThenByDescending(c => c.Profile.ReputationCredit)
            .Take(10)
            .ToList();

        if (!topCandidates.Any())
        {
            return new List<ExpertRecommendationResultDto>();
        }

        // 4. Try AI Recommendation
        try
        {
            var result = await GenerateAiRecommendationsAsync(title, description, budget, deadline, requiredSkills, detailedRequirements, topCandidates);
            if (result != null && result.Any())
            {
                return result;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AiRecommendationService] AI Matching failed, falling back to database algorithm. Error: {ex.Message}");
        }

        // 5. Fallback to Database Matching Algorithm if AI fails/isn't configured
        return GenerateDatabaseFallbackRecommendations(requiredSkills, topCandidates);
    }

    private async Task<List<ExpertRecommendationResultDto>?> GenerateAiRecommendationsAsync(
        string title, string description, decimal budget, int deadline,
        List<string> requiredSkills, List<string> detailedRequirements,
        List<ExpertCandidateInternal> candidates)
    {
        // Build prompt contents
        var systemPrompt = BuildSystemPrompt();
        var userPrompt = BuildUserPrompt(title, description, budget, deadline, requiredSkills, detailedRequirements, candidates);

        var payload = new
        {
            contents = new[]
            {
                new { role = "user", parts = new[] { new { text = userPrompt } } }
            },
            systemInstruction = new
            {
                parts = new[]
                {
                    new { text = systemPrompt }
                }
            },
            generationConfig = new
            {
                temperature = 0.2,
                responseMimeType = "application/json"
            }
        };

        var rawJson = await _geminiUtil.CallGeminiApiAsync(payload);
        var aiText = ExtractTextFromResponse(rawJson);
        var cleaned = StripMarkdownFences(aiText);

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var aiResults = JsonSerializer.Deserialize<List<GeminiRecommendationItem>>(cleaned, options);

        if (aiResults == null || !aiResults.Any())
        {
            return null;
        }

        var resultsMap = aiResults.ToDictionary(r => r.ExpertId, StringComparer.OrdinalIgnoreCase);
        var finalResult = new List<ExpertRecommendationResultDto>();

        foreach (var c in candidates)
        {
            var candidateIdStr = c.User.Id.ToString();
            int score = 50; // default score
            string explanation = "Hồ sơ chuyên gia được chọn dựa trên mức độ tương đồng kỹ năng.";
            List<string> matchedSkills = c.Skills.Intersect(requiredSkills, StringComparer.OrdinalIgnoreCase).ToList();

            if (resultsMap.TryGetValue(candidateIdStr, out var aiItem))
            {
                score = Math.Clamp(aiItem.MatchScore, 0, 100);
                explanation = aiItem.Explanation;
                if (aiItem.MatchedSkills != null && aiItem.MatchedSkills.Any())
                {
                    matchedSkills = aiItem.MatchedSkills;
                }
            }

            finalResult.Add(new ExpertRecommendationResultDto
            {
                UserId = c.User.Id,
                FullName = c.User.FullName,
                Email = c.User.Email,
                AvatarUrl = c.User.AvatarUrl,
                JobTitle = c.Profile.JobTitle,
                Major = c.Profile.Major,
                Certifications = c.Profile.Certifications,
                Bio = c.Profile.Bio,
                PortfolioUrls = c.Profile.PortfolioUrls,
                SuccessRate = c.Profile.SuccessRate,
                ReputationCredit = c.Profile.ReputationCredit,
                Skills = c.Skills,
                MatchScore = score,
                Explanation = explanation,
                MatchedSkills = matchedSkills
            });
        }

        return finalResult.OrderByDescending(r => r.MatchScore).ToList();
    }

    private List<ExpertRecommendationResultDto> GenerateDatabaseFallbackRecommendations(
        List<string> requiredSkills, List<ExpertCandidateInternal> candidates)
    {
        var finalResult = new List<ExpertRecommendationResultDto>();

        foreach (var c in candidates)
        {
            // Calculate a score based on skill match proportion + success rate + reputation credit
            double skillRatio = requiredSkills.Any() 
                ? (double)c.MatchingSkillsCount / requiredSkills.Count 
                : 0.5;

            // score components: skill ratio (50%), success rate (40%), reputation credit (10%)
            double skillScore = skillRatio * 50;
            double successScore = (c.Profile.SuccessRate / 100.0) * 40;
            // reputation credit is between 0 and 5, so reputation credit / 5.0 * 10
            double reputationScore = ((double)c.Profile.ReputationCredit / 5.0) * 10;
            if (reputationScore > 10) reputationScore = 10;

            int matchScore = (int)Math.Round(skillScore + successScore + reputationScore);
            matchScore = Math.Clamp(matchScore, 20, 100); // base min match is 20%

            // Construct Vietnamese explanation
            string matchedSkillsList = c.MatchingSkillsCount > 0 
                ? string.Join(", ", c.Skills.Intersect(requiredSkills, StringComparer.OrdinalIgnoreCase))
                : "không trùng khớp kỹ năng trực tiếp";

            string explanation = $"[Đề xuất tự động] Chuyên gia có chuyên ngành {c.Profile.Major} và chức danh \"{c.Profile.JobTitle}\". " +
                                  $"Có {c.MatchingSkillsCount} kỹ năng phù hợp ({matchedSkillsList}). " +
                                  $"Tỷ lệ hoàn thành công việc xuất sắc đạt {c.Profile.SuccessRate}%.";

            finalResult.Add(new ExpertRecommendationResultDto
            {
                UserId = c.User.Id,
                FullName = c.User.FullName,
                Email = c.User.Email,
                AvatarUrl = c.User.AvatarUrl,
                JobTitle = c.Profile.JobTitle,
                Major = c.Profile.Major,
                Certifications = c.Profile.Certifications,
                Bio = c.Profile.Bio,
                PortfolioUrls = c.Profile.PortfolioUrls,
                SuccessRate = c.Profile.SuccessRate,
                ReputationCredit = c.Profile.ReputationCredit,
                Skills = c.Skills,
                MatchScore = matchScore,
                Explanation = explanation,
                MatchedSkills = c.Skills.Intersect(requiredSkills, StringComparer.OrdinalIgnoreCase).ToList()
            });
        }

        return finalResult.OrderByDescending(r => r.MatchScore).ToList();
    }

    private static string BuildSystemPrompt()
    {
        return @"Bạn là một chuyên gia Tuyển dụng và Đối sánh Nhân tài AI trên hệ thống AITasker.
Nhiệm vụ của bạn là đánh giá mức độ phù hợp giữa một mô tả công việc (Job Post) và hồ sơ các Chuyên gia (Experts) được cung cấp.

Hãy trả về kết quả dưới dạng một JSON Array duy nhất chứa kết quả đánh giá cho từng chuyên gia, không bao gồm các ký tự markdown như ```json hay ```.
Mỗi phần tử trong mảng đại diện cho một chuyên gia với cấu trúc như sau:
[
  {
    ""expertId"": ""Guid của chuyên gia"",
    ""matchScore"": <Điểm số từ 0 đến 100, thể hiện mức độ phù hợp về kỹ năng, kinh nghiệm và hồ sơ>,
    ""explanation"": ""Lời giải thích ngắn gọn (2-4 câu), chuyên nghiệp bằng tiếng Việt giải thích lý do tại sao chuyên gia này phù hợp, nêu bật điểm mạnh của họ so với dự án và khoảng trống kỹ năng nếu có."",
    ""matchedSkills"": [""Các kỹ năng của chuyên gia khớp với yêu cầu của jobpost""]
  }
]";
    }

    private static string BuildUserPrompt(
        string title, string description, decimal budget, int deadline,
        List<string> requiredSkills, List<string> detailedRequirements,
        List<ExpertCandidateInternal> candidates)
    {
        var candidatesData = candidates.Select(c => new
        {
            expertId = c.User.Id,
            fullName = c.User.FullName,
            jobTitle = c.Profile.JobTitle,
            major = c.Profile.Major,
            bio = c.Profile.Bio,
            certifications = c.Profile.Certifications,
            successRate = c.Profile.SuccessRate,
            reputationCredit = c.Profile.ReputationCredit,
            skills = c.Skills
        });

        var jobPostData = new
        {
            title,
            description,
            budget,
            deadlineDays = deadline,
            requiredSkills,
            detailedRequirements
        };

        var jobPostJson = JsonSerializer.Serialize(jobPostData, new JsonSerializerOptions { WriteIndented = true });
        var candidatesJson = JsonSerializer.Serialize(candidatesData, new JsonSerializerOptions { WriteIndented = true });

        return $@"Dưới đây là thông tin về bài tuyển dụng (Job Post):
{jobPostJson}

Dưới đây là danh sách {candidates.Count} Chuyên gia tiềm năng:
{candidatesJson}

Hãy phân tích và chấm điểm cho tất cả {candidates.Count} chuyên gia trên. Trả về kết quả JSON array đúng định dạng.";
    }

    private static string ExtractTextFromResponse(string rawJson)
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

    private static HashSet<string> TokenizeText(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return new HashSet<string>();

        // simple tokenization by space/punctuation, remove short words
        var words = text.ToLower()
            .Split(new[] { ' ', '.', ',', ';', ':', '-', '(', ')', '[', ']', '{', '}', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 2)
            .Distinct();

        return new HashSet<string>(words);
    }

    private class ExpertCandidateInternal
    {
        public ApplicationUser User { get; set; } = null!;
        public ExpertProfile Profile { get; set; } = null!;
        public List<string> Skills { get; set; } = new();
        public int MatchingSkillsCount { get; set; }
        public int KeywordMatchCount { get; set; }
    }
}
