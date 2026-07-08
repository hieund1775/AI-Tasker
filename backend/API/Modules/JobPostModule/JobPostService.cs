using AITasker_Modular.Database;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Modules.JobModule; // <â”€â”€ Ã‰P TRÃŒNH BIÃŠN Dá»ŠCH DÃ™NG CHUNG CHá»® KÃ HÃ€M Vá»šI INTERFACE
using System;
using System.IO; // â”€â”€ Äáº¢M Báº¢O CÃ“ THÆ¯ VIá»†N NÃ€Y Äá»‚ THAO TÃC ÄÄ¨A Cá»¨NG SERVER
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http; // â”€â”€ Äáº¢M Báº¢O CÃ“ THÆ¯ VIá»†N NÃ€Y Äá»‚ Xá»¬ LÃ STREAM FILE

namespace AITasker_Modular.Modules.JobPostModule;

public class JobPostService : IJobPostService
{
    private readonly DataContext _context;

    public JobPostService(DataContext context)
    {
        _context = context;
    }

    private void SaveJobPostWbs(Guid jobPostId, List<JobPostTaskInputDto> implementationInput)
    {
        if (implementationInput == null || !implementationInput.Any()) return;

        var tasks = new List<JobPostTask>();
        foreach (var tDto in implementationInput)
        {
            var task = new JobPostTask
            {
                Id = Guid.NewGuid(),
                JobPostId = jobPostId,
                Title = tDto.Title
            };

            if (tDto.MiniTasks != null && tDto.MiniTasks.Any())
            {
                task.JobPostMiniTasks = tDto.MiniTasks.Select(mDto => new JobPostMiniTask
                {
                    Id = Guid.NewGuid(),
                    JobPostTaskId = task.Id,
                    Title = mDto.Title,
                    Duration = mDto.Duration
                }).ToList();
            }
            tasks.Add(task);
        }

        if (tasks.Any())
        {
            _context.JobPostTasks.AddRange(tasks);
        }
    }

    private string GetJobPostWbsJson(JobPost jobPost)
    {
        if (jobPost.JobPostTasks == null || !jobPost.JobPostTasks.Any()) return string.Empty;
        var list = jobPost.JobPostTasks.Select(t => new
        {
            Title = t.Title,
            Duration = t.Duration,
            MiniTasks = t.JobPostMiniTasks != null
                ? t.JobPostMiniTasks.Select(m => new
                {
                    Title = m.Title,
                    Duration = m.Duration
                }).ToList()
                : new()
        }).ToList();
        return System.Text.Json.JsonSerializer.Serialize(list);
    }

    public async Task<JobPost> CreateJobAsync(CreateJobPostDto jobPostDto)
    {
        int deadlineDays = jobPostDto.Deadline;
        if (jobPostDto.DurationValue > 0)
        {
            deadlineDays = jobPostDto.DurationValue;
            var unitLower = jobPostDto.DurationUnit?.ToLowerInvariant();
            if (unitLower == "weeks" || unitLower == "week")
                deadlineDays *= 7;
            else if (unitLower == "months" || unitLower == "month")
                deadlineDays *= 30;
        }

        var jobPost = new JobPost
        {
            Id = Guid.NewGuid(),
            ClientId = jobPostDto.ClientId,
            Title = jobPostDto.Title.Trim(),
            Description = jobPostDto.Description.Trim(),
            Budget = jobPostDto.Budget,
            Deadline = deadlineDays,
            DurationUnit = jobPostDto.DurationUnit,
            DurationValue = jobPostDto.DurationValue,
            Status = "Open",
            CreatedAt = DateTime.UtcNow,
            DomainId = jobPostDto.DomainId,
            SpecializationId = jobPostDto.SpecializationId,
            Implementation = jobPostDto.Implementation != null ? System.Text.Json.JsonSerializer.Serialize(jobPostDto.Implementation) : null
        };

        if (jobPostDto.SkillIds != null && jobPostDto.SkillIds.Any())
        {
            foreach (var sid in jobPostDto.SkillIds)
            {
                if (Guid.TryParse(sid, out var sguid))
                {
                    jobPost.JobPostSkills.Add(new JobPostSkill { JobPostsId = jobPost.Id, SkillsId = sguid });
                }
            }
        }

        _context.JobPosts.Add(jobPost);
        if (jobPostDto.Implementation != null && jobPostDto.Implementation.Any())
        {
            SaveJobPostWbs(jobPost.Id, jobPostDto.Implementation);
        }
        await _context.SaveChangesAsync();
        return (await GetJobPostByIdAsync(jobPost.Id))!;
    }

    public async Task<PagedResult<JobPost>> GetJobsAsync(int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        var query = _context.JobPosts
                             .Include(jp => jp.ClientUser)
                             .Include(jp => jp.Domain)
                             .Include(jp => jp.Specialization)
                             .Include(jp => jp.JobPostSkills)
                                 .ThenInclude(jps => jps.Skill)
                             .Include(jp => jp.JobPostTasks)
                                 .ThenInclude(t => t.JobPostMiniTasks);

        var totalCount = await query.CountAsync();

        var list = await query.OrderByDescending(x => x.CreatedAt)
                              .Skip((page - 1) * pageSize)
                              .Take(pageSize)
                              .ToListAsync();

        foreach (var jp in list)
        {
            jp.Implementation = GetJobPostWbsJson(jp);
        }

        return new PagedResult<JobPost>
        {
            Data = list,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<JobPost?> GetJobPostByIdAsync(Guid id)
    {
        var jobPost = await _context.JobPosts
                             .Include(jp => jp.ClientUser)
                             .Include(jp => jp.Domain)
                             .Include(jp => jp.Specialization)
                             .Include(jp => jp.JobPostSkills)
                                 .ThenInclude(jps => jps.Skill)
                             .Include(jp => jp.JobPostTasks)
                                 .ThenInclude(t => t.JobPostMiniTasks)
                             .FirstOrDefaultAsync(jp => jp.Id == id);
        if (jobPost != null)
        {
            jobPost.Implementation = GetJobPostWbsJson(jobPost);
        }
        return jobPost;
    }

    public async Task<JobPost?> UpdateJobPostAsync(Guid id, UpdateJobPostDto jobPostDto)
    {
        var jobPost = await _context.JobPosts
                                     .Include(jp => jp.JobPostSkills)
                                     .FirstOrDefaultAsync(jp => jp.Id == id);
        if (jobPost == null) return null;

        if (!jobPost.Status.Equals("Open", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Không thể chỉnh sửa bài đăng khi đã có Chuyên gia được chọn hoặc dự án đã được khởi tạo (Trạng thái hiện tại: {jobPost.Status}).");
        }

        int deadlineDays = jobPostDto.Deadline;
        if (jobPostDto.DurationValue > 0)
        {
            deadlineDays = jobPostDto.DurationValue;
            var unitLower = jobPostDto.DurationUnit?.ToLowerInvariant();
            if (unitLower == "weeks" || unitLower == "week")
                deadlineDays *= 7;
            else if (unitLower == "months" || unitLower == "month")
                deadlineDays *= 30;
        }

        jobPost.Title = jobPostDto.Title.Trim();
        jobPost.Description = jobPostDto.Description.Trim();
        jobPost.Budget = jobPostDto.Budget;
        jobPost.Deadline = deadlineDays;
        jobPost.DurationUnit = jobPostDto.DurationUnit;
        jobPost.DurationValue = jobPostDto.DurationValue;
        jobPost.DomainId = jobPostDto.DomainId;
        jobPost.SpecializationId = jobPostDto.SpecializationId;

        _context.JobPostSkills.RemoveRange(jobPost.JobPostSkills);
        jobPost.JobPostSkills.Clear();

        if (jobPostDto.SkillIds != null && jobPostDto.SkillIds.Any())
        {
            foreach (var sid in jobPostDto.SkillIds)
            {
                if (Guid.TryParse(sid, out var sguid))
                {
                    jobPost.JobPostSkills.Add(new JobPostSkill { JobPostsId = jobPost.Id, SkillsId = sguid });
                }
            }
        }


        jobPost.Implementation = jobPostDto.Implementation != null ? System.Text.Json.JsonSerializer.Serialize(jobPostDto.Implementation) : null;

        if (jobPostDto.Implementation != null)
        {
            var oldTasks = await _context.JobPostTasks.Where(t => t.JobPostId == id).ToListAsync();
            _context.JobPostTasks.RemoveRange(oldTasks);

            if (jobPostDto.Implementation.Any())
            {
                SaveJobPostWbs(id, jobPostDto.Implementation);
            }
        }

        await _context.SaveChangesAsync();
        return await GetJobPostByIdAsync(id);
    }

    public async Task<PagedResult<JobPost>> GetFilteredJobsAsync(string? search, decimal? minBudget, decimal? maxBudget, string? status, Guid? categoryDomainId, int page, int pageSize)
    {
        var query = _context.JobPosts
                            .Include(jp => jp.ClientUser)
                            .Include(jp => jp.Domain)
                            .Include(jp => jp.Specialization)
                            .Include(jp => jp.JobPostSkills)
                                .ThenInclude(jps => jps.Skill)
                            .Include(jp => jp.JobPostTasks)
                                .ThenInclude(t => t.JobPostMiniTasks)
                            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            string searchLower = search.ToLower().Trim();
            query = query.Where(x => x.Title.ToLower().Contains(searchLower) || x.Description.ToLower().Contains(searchLower));
        }

        if (minBudget.HasValue) query = query.Where(x => x.Budget >= minBudget.Value);
        if (maxBudget.HasValue) query = query.Where(x => x.Budget <= maxBudget.Value);

        if (!string.IsNullOrEmpty(status))
        {
            string statusClean = status.Trim();
            query = query.Where(x => x.Status.ToLower() == statusClean.ToLower());
        }

        if (categoryDomainId.HasValue && categoryDomainId.Value != Guid.Empty)
        {
            query = query.Where(x => x.DomainId == categoryDomainId.Value);
        }

        var totalCount = await query.CountAsync();

        var list = await query.OrderByDescending(x => x.CreatedAt)
                              .Skip((page - 1) * pageSize)
                              .Take(pageSize)
                              .ToListAsync();

        foreach (var jp in list)
        {
            jp.Implementation = GetJobPostWbsJson(jp);
        }

        return new PagedResult<JobPost>
        {
            Data = list,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<IEnumerable<JobPost>> GetJobPostsByClientIdAsync(Guid clientId)
    {
        var list = await _context.JobPosts
                             .Include(jp => jp.ClientUser)
                             .Include(jp => jp.Domain)
                             .Include(jp => jp.Specialization)
                             .Include(jp => jp.JobPostSkills)
                                 .ThenInclude(jps => jps.Skill)
                             .Include(jp => jp.JobPostTasks)
                                 .ThenInclude(t => t.JobPostMiniTasks)
                             .Where(x => x.ClientId == clientId)
                             .OrderByDescending(x => x.CreatedAt)
                             .ToListAsync();
        foreach (var jp in list)
        {
            jp.Implementation = GetJobPostWbsJson(jp);
        }
        return list;
    }

    // ── THAO TÁC CƠ HỌC ĐỤC THÊM 1: LƯU TRỮ TỆP TIN VẬT LÝ AN TOÀN TUYỆT ĐỐI ──
    public async Task<string?> UploadAttachmentAsync(IFormFile file)
    {
        if (file == null || file.Length == 0) return null;
        if (file.Length > 10 * 1024 * 1024) throw new Exception("Kích thước tập tin vượt quá giới hạn hệ thống (Tối đa 10MB).");

        var extension = Path.GetExtension(file.FileName).ToLower();
        string[] allowedExtensions = { ".pdf", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg" };
        if (!allowedExtensions.Contains(extension)) throw new Exception("Định dạng tập tin không được hỗ trợ.");

        var rootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot", "job_files");
        if (!Directory.Exists(rootPath)) Directory.CreateDirectory(rootPath);

        var uniqueFileName = $"{Guid.NewGuid()}{extension}";
        var destinationPath = Path.Combine(rootPath, uniqueFileName);

        using (var stream = new FileStream(destinationPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return $"/job_files/{uniqueFileName}";
    }

    // ── THAO TÁC CƠ HỌC ĐỤC THÊM 2: PHÂN RÃ MILESTONE SANG CẤU TRÚC FILE .MD BẰNG AI ENGINE ──
    public async Task<string?> GenerateMilestoneMarkdownAsync(Guid proposalId, int taskCount, int deadlineDays)
    {
        // Sử dụng chính xác thực thể dữ liệu DataContext của nhóm để truy vấn chéo bảng
        var proposal = await _context.Proposals
            .Include(p => p.JobPost)
            .FirstOrDefaultAsync(p => p.Id == proposalId);

        if (proposal == null) return null;

        var markdownBuilder = new System.Text.StringBuilder();
        markdownBuilder.AppendLine($"# Báº¢N PHÃ‚N RÃƒ Cáº¤U TRÃšC CÃ”NG VIá»†C (WBS) - Dá»° ÃN: {proposal.JobPostTitle.ToUpper()}");
        markdownBuilder.AppendLine($"* **MÃ£ sá»‘ Ä‘á» xuáº¥t (Proposal ID):** {proposal.Id}");
        markdownBuilder.AppendLine($"* **ChuyÃªn gia Ä‘áº£m nhiá»‡m (Expert ID):** {proposal.ExpertId}");
        markdownBuilder.AppendLine($"* **Tá»•ng sá»‘ lÆ°á»£ng tÃ¡c vá»¥ (AI Segmented Tasks):** {taskCount} Tasks");
        markdownBuilder.AppendLine($"* **Thời hạn hoàn thành bàn giao (Deadline):** {deadlineDays} ngÃ y ká»ƒ tá»« ngÃ y kÃ½ káº¿t");
        markdownBuilder.AppendLine("---");
        markdownBuilder.AppendLine("## DANH SÃCH CHI TIáº¾T CÃC Má»C TIáº¾N Äá»˜ VÃ€ NHIá»†M Vá»¤ THÃ€NH PHáº¦N");

        int daysPerTask = Math.Max(1, deadlineDays / taskCount);
        for (int i = 1; i <= taskCount; i++)
        {
            markdownBuilder.AppendLine($"### ðŸ“ Má»‘c tiáº¿n Ä‘á»™ {i}: Thá»±c thi cáº¥u pháº§n nghiá»‡p vá»¥ sá»‘ {i}");
            markdownBuilder.AppendLine($"- **MÃ´ táº£ cáº¥u pháº§n nghiá»‡p vá»¥:** Tiáº¿n hÃ nh phÃ¢n tÃ­ch, thiáº¿t káº¿ logic, xÃ¢y dá»±ng mÃ£ nguá»“n vÃ  kiá»ƒm chuáº©n Ä‘Æ¡n vá»‹ (Unit Test) cho phÃ¢n há»‡ chá»©c nÄƒng {i} dựa trên giải pháp kỹ thuật: {proposal.Implementation}.");
            markdownBuilder.AppendLine($"- **Thời gian xử lý dự kiến:** {daysPerTask} ngÃ y.");
            markdownBuilder.AppendLine();
        }

        markdownBuilder.AppendLine("---");
        markdownBuilder.AppendLine("_Báº£n tÃ i liá»‡u nÃ y Ä‘Æ°á»£c phÃ¢n rÃ£ tá»± Ä‘á»™ng bá»Ÿi Trá»£ lÃ½ AI PhÃ¢n tÃ­ch Nghiá»‡p vá»¥ cá»§a ná»n táº£ng AITasker Ä‘á»ƒ lÃ m cÆ¡ sá»Ÿ phÃ¡p lÃ½ nghiá»‡m thu há»£p Ä‘á»“ng kÃ½ káº¿t._");

        var rootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot", "milestones");
        if (!Directory.Exists(rootPath)) Directory.CreateDirectory(rootPath);

        var fileName = $"Milestone_Proposal_{proposalId}.md";
        var fullPath = Path.Combine(rootPath, fileName);
        await System.IO.File.WriteAllTextAsync(fullPath, markdownBuilder.ToString(), System.Text.Encoding.UTF8);

        var fileUrl = $"/milestones/{fileName}";

        // Ghi Ä‘Ã¨ Ä‘Æ°á»ng dáº«n file Markdown sáº¡ch vÃ o cá»™t Portfolio cá»§a báº£ng Proposals
        proposal.Portfolio = fileUrl;
        await _context.SaveChangesAsync();

        return fileUrl;
    }
    public async Task<List<ExpertRecommendationResultDto>> RecommendExpertsAsync(ExpertRecommendationRequestDto dto)
    {
        // 1. Resolve Job Post details
        string title = string.Empty;
        string description = string.Empty;
        decimal budget = 0m;
        int deadline = 0;
        string? domainName = null;
        string? specializationName = null;
        Guid? domainId = null;
        Guid? specializationId = null;
        List<string> requiredSkills = new();
        List<string> detailedRequirements = new();

        if (dto.JobPostId.HasValue && dto.JobPostId.Value != Guid.Empty)
        {
            var jobPost = await _context.JobPosts
                .Include(j => j.JobPostSkills).ThenInclude(js => js.Skill)
                .Include(j => j.JobPostTasks)
                .Include(j => j.Domain)
                .Include(j => j.Specialization)
                .FirstOrDefaultAsync(j => j.Id == dto.JobPostId.Value);

            if (jobPost == null)
            {
                return new List<ExpertRecommendationResultDto>();
            }

            title = jobPost.Title;
            description = jobPost.Description;
            budget = jobPost.Budget;
            deadline = jobPost.Deadline;
            domainId = jobPost.DomainId;
            specializationId = jobPost.SpecializationId;
            domainName = jobPost.Domain?.Name;
            specializationName = jobPost.Specialization?.Name;
            requiredSkills = jobPost.JobPostSkills
                .Select(js => js.Skill?.Name ?? string.Empty)
                .Where(name => !string.IsNullOrEmpty(name))
                .ToList();
            detailedRequirements = jobPost.JobPostTasks
                .Select(r => r.Title)
                .Where(desc => !string.IsNullOrEmpty(desc))
                .ToList();
        }
        else
        {
            title = dto.Title ?? string.Empty;
            description = dto.Description ?? string.Empty;
            budget = dto.Budget ?? 0m;
            deadline = dto.Deadline ?? 0;
            domainId = dto.DomainId;
            specializationId = dto.SpecializationId;

            if (domainId.HasValue)
            {
                var domain = await _context.Domains.FindAsync(domainId.Value);
                domainName = domain?.Name;
            }
            if (specializationId.HasValue)
            {
                var spec = await _context.Specializations.FindAsync(specializationId.Value);
                specializationName = spec?.Name;
            }

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
            .Where(u => u.Role.ToLower() == "expert" &&
                        u.Status.ToLower() == "active")
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

        var domainExpertProfiles = await _context.DomainExpertProfiles
            .Where(dep => expertIds.Contains(dep.ExpertProfilesUserId))
            .Include(dep => dep.Domain)
            .ToListAsync();

        var expertDomainsMap = domainExpertProfiles
            .GroupBy(dep => dep.ExpertProfilesUserId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(dep => dep.Domain?.Name ?? string.Empty).Where(name => !string.IsNullOrEmpty(name)).ToList()
            );

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

            // Resolve domains
            expertDomainsMap.TryGetValue(expert.Id, out var expertDomains);
            expertDomains ??= new List<string>();

            bool expertHasMatchingDomain = false;
            if (domainId.HasValue)
            {
                expertHasMatchingDomain = domainExpertProfiles.Any(dep => dep.ExpertProfilesUserId == expert.Id && dep.DomainId == domainId.Value);
            }

            candidateList.Add(new ExpertCandidateInternal
            {
                User = expert,
                Profile = profile,
                Skills = expertSkills,
                Domains = expertDomains,
                MatchingSkillsCount = matchingSkillsCount,
                KeywordMatchCount = keywordMatchCount,
                HasMatchingDomain = expertHasMatchingDomain
            });
        }

        // Rank by matching domain -> matching skills count -> keyword matches -> success rate -> reputation credit
        var topCandidates = candidateList
            .OrderByDescending(c => c.HasMatchingDomain)
            .ThenByDescending(c => c.MatchingSkillsCount)
            .ThenByDescending(c => c.KeywordMatchCount)
            .ThenByDescending(c => c.Profile.SuccessRate)
            .ThenByDescending(c => c.Profile.ReputationCredit)
            .Take(10)
            .ToList();

        if (!topCandidates.Any())
        {
            return new List<ExpertRecommendationResultDto>();
        }

        return GenerateDatabaseFallbackRecommendations(requiredSkills, topCandidates);
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

            // score components: domain match (20%), skill ratio (40%), success rate (30%), reputation credit (10%)
            double domainScore = c.HasMatchingDomain ? 20 : 0;
            double skillScore = skillRatio * 40;
            double successScore = (c.Profile.SuccessRate / 100.0) * 30;
            double reputationScore = ((double)c.Profile.ReputationCredit / 5.0) * 10;
            if (reputationScore > 10) reputationScore = 10;

            int matchScore = (int)Math.Round(domainScore + skillScore + successScore + reputationScore);
            matchScore = Math.Clamp(matchScore, 20, 100); // base min match is 20%

            // Construct Vietnamese explanation
            string matchedSkillsList = c.MatchingSkillsCount > 0
                ? string.Join(", ", c.Skills.Intersect(requiredSkills, StringComparer.OrdinalIgnoreCase))
                : "khÃ´ng trÃ¹ng khá»›p ká»¹ nÄƒng trá»±c tiáº¿p";

            string domainInfo = c.HasMatchingDomain
                ? "ChuyÃªn gia hoáº¡t Ä‘á»™ng trong lÄ©nh vá»±c trÃ¹ng khá»›p vá»›i cÃ´ng viá»‡c. "
                : string.Empty;

            string explanation = $"[Äá» xuáº¥t tá»± Ä‘á»™ng] {domainInfo}Chuyên gia có chuyên ngành {c.Profile.Major} và chức danh \"{c.Profile.JobTitle}\". " +
                                  $"Có {c.MatchingSkillsCount} ká»¹ nÄƒng phÃ¹ há»£p ({matchedSkillsList}). " +
                                  $"Tá»· lá»‡ hoÃ n thÃ nh cÃ´ng viá»‡c xuáº¥t sáº¯c Ä‘áº¡t {c.Profile.SuccessRate}%.";

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

    public async Task<List<JobPostRecommendationResultDto>> RecommendJobPostsForExpertAsync(Guid expertId)
    {
        // 1. Fetch expert profile
        var expert = await _context.Users.FirstOrDefaultAsync(u => u.Id == expertId && u.Role.ToLower() == "expert" && u.Status.ToLower() == "active");
        if (expert == null)
        {
            throw new Exception("Không tìm thấy chuyên gia (Expert) này hoặc tài khoản đang không hoạt động.");
        }

        var profile = await _context.ExpertProfiles
            .Include(p => p.ExpertProfileSkills).ThenInclude(eps => eps.Skill)
            .FirstOrDefaultAsync(p => p.UserId == expertId);

        if (profile == null)
        {
            throw new Exception("Chuyên gia chưa thiết lập hồ sơ (Profile). Vui lòng cập nhật hồ sơ trước khi nhận gợi ý.");
        }

        var expertSkills = profile.ExpertProfileSkills
            .Select(eps => eps.Skill?.Name ?? string.Empty)
            .Where(name => !string.IsNullOrEmpty(name))
            .ToList();

        var domainExpertProfiles = await _context.DomainExpertProfiles
            .Where(dep => dep.ExpertProfilesUserId == expertId)
            .Include(dep => dep.Domain)
            .ToListAsync();

        var expertDomains = domainExpertProfiles
            .Select(dep => dep.Domain?.Name ?? string.Empty)
            .Where(name => !string.IsNullOrEmpty(name))
            .ToList();

        var expertDomainIds = domainExpertProfiles.Select(dep => dep.DomainId).ToList();

        var expertBioWords = TokenizeText(profile.JobTitle + " " + profile.Major + " " + profile.Bio);

        // Fetch IDs of JobPosts that are already converted to Projects (Ä‘Ã£ cÃ³ ngÆ°á»i nháº­n)
        var awardedJobPostIds = await _context.Projects
            .Where(p => p.JobPostId != null)
            .Select(p => p.JobPostId!.Value)
            .ToListAsync();

        // Fetch IDs of JobPosts that this expert has already applied for
        var appliedJobPostIds = await _context.Proposals
            .Where(p => p.ExpertId == expertId)
            .Select(p => p.JobPostId)
            .ToListAsync();

        var excludedJobPostIds = awardedJobPostIds.Union(appliedJobPostIds).ToList();

        // 2. Fetch open Job Posts, excluding those already awarded or applied
        var openJobPosts = await _context.JobPosts
            .Include(j => j.JobPostSkills).ThenInclude(js => js.Skill)
            .Include(j => j.Domain)
            .Include(j => j.Specialization)
            .Where(j => j.Status == "Open" && !excludedJobPostIds.Contains(j.Id))
            .ToListAsync();

        if (!openJobPosts.Any())
        {
            return new List<JobPostRecommendationResultDto>();
        }

        // 3. Score candidates in memory
        var recommendationList = new List<JobPostRecommendationResultDto>();

        foreach (var jobPost in openJobPosts)
        {
            var jobSkills = jobPost.JobPostSkills
                .Select(js => js.Skill?.Name ?? string.Empty)
                .Where(name => !string.IsNullOrEmpty(name))
                .ToList();

            int matchingSkillsCount = expertSkills
                .Intersect(jobSkills, StringComparer.OrdinalIgnoreCase)
                .Count();

            var jobWords = TokenizeText(jobPost.Title + " " + jobPost.Description);
            int keywordMatchCount = expertBioWords.Intersect(jobWords, StringComparer.OrdinalIgnoreCase).Count();

            bool hasMatchingDomain = false;
            if (jobPost.DomainId.HasValue)
            {
                hasMatchingDomain = expertDomainIds.Contains(jobPost.DomainId.Value);
            }

            // Calculate a score
            double skillRatio = jobSkills.Any()
                ? (double)matchingSkillsCount / jobSkills.Count
                : 0.5;

            double domainScore = hasMatchingDomain ? 30 : 0;
            double skillScore = skillRatio * 50;
            double keywordScore = keywordMatchCount > 0 ? Math.Min(20, keywordMatchCount * 2) : 0;

            int matchScore = (int)Math.Round(domainScore + skillScore + keywordScore);
            matchScore = Math.Clamp(matchScore, 20, 100);

            var matchedSkills = expertSkills.Intersect(jobSkills, StringComparer.OrdinalIgnoreCase).ToList();
            string matchedSkillsList = matchedSkills.Any()
                ? string.Join(", ", matchedSkills)
                : "khÃ´ng cÃ³ ká»¹ nÄƒng trÃ¹ng khá»›p";

            string domainInfo = hasMatchingDomain
                ? "Dá»± Ã¡n thuá»™c lÄ©nh vá»±c chuyÃªn mÃ´n cá»§a báº¡n. "
                : string.Empty;

            string explanation = $"[Äá» xuáº¥t tá»± Ä‘á»™ng] {domainInfo}Dự án yêu cầu {jobSkills.Count} ká»¹ nÄƒng, báº¡n Ä‘Ã¡p á»©ng {matchingSkillsCount} ({matchedSkillsList}).";

            recommendationList.Add(new JobPostRecommendationResultDto
            {
                JobPostId = jobPost.Id,
                Title = jobPost.Title,
                Description = jobPost.Description,
                Budget = jobPost.Budget,
                Deadline = jobPost.Deadline,
                DomainName = jobPost.Domain?.Name,
                SpecializationName = jobPost.Specialization?.Name,
                RequiredSkills = jobSkills,
                MatchScore = matchScore,
                Explanation = explanation,
                MatchedSkills = matchedSkills
            });
        }

        // 4. Sort and take top 10
        return recommendationList
            .OrderByDescending(r => r.MatchScore)
            .Take(10)
            .ToList();
    }

    private class ExpertCandidateInternal
    {
        public AITasker_Modular.Modules.UserModule.ApplicationUser User { get; set; } = null!;
        public AITasker_Modular.Modules.UserModule.ExpertProfile Profile { get; set; } = null!;
        public List<string> Skills { get; set; } = new();
        public List<string> Domains { get; set; } = new();
        public int MatchingSkillsCount { get; set; }
        public int KeywordMatchCount { get; set; }
        public bool HasMatchingDomain { get; set; }
    }
}
