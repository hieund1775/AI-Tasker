using AITasker_Modular.Database;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Modules.JobModule; // <── ÉP TRÌNH BIÊN DỊCH DÙNG CHUNG CHỮ KÝ HÀM VỚI INTERFACE
using System;
using System.IO; // ── ĐẢM BẢO CÓ THƯ VIỆN NÀY ĐỂ THAO TÁC ĐĨA CỨNG SERVER
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http; // ── ĐẢM BẢO CÓ THƯ VIỆN NÀY ĐỂ XỬ LÝ STREAM FILE

namespace AITasker_Modular.Modules.JobPostModule;

public class JobPostService : IJobPostService
{
    private readonly DataContext _context;

    public JobPostService(DataContext context)
    {
        _context = context;
    }

    private class JobPostTaskJsonDto
    {
        public string Title { get; set; } = string.Empty;
        public List<JobPostMiniTaskJsonDto> MiniTasks { get; set; } = new();
    }

    private class JobPostMiniTaskJsonDto
    {
        public string Title { get; set; } = string.Empty;
        public int Duration { get; set; }
    }

    private void SaveJobPostWbs(Guid jobPostId, string implementationInput)
    {
        var tasks = new List<JobPostTask>();
        string trimmed = implementationInput?.Trim() ?? string.Empty;

        if (trimmed.StartsWith("["))
        {
            try
            {
                var parsed = System.Text.Json.JsonSerializer.Deserialize<List<JobPostTaskJsonDto>>(trimmed);
                if (parsed != null)
                {
                    foreach (var tDto in parsed)
                    {
                        var task = new JobPostTask
                        {
                            Id = Guid.NewGuid(),
                            JobPostId = jobPostId,
                            Title = tDto.Title
                        };
                        task.JobPostMiniTasks = tDto.MiniTasks.Select(mDto => new JobPostMiniTask
                        {
                            Id = Guid.NewGuid(),
                            JobPostTaskId = task.Id,
                            Title = mDto.Title,
                            Duration = mDto.Duration
                        }).ToList();
                        tasks.Add(task);
                    }
                }
            }
            catch
            {
                // Fallback to single text task on error
                var task = new JobPostTask
                {
                    Id = Guid.NewGuid(),
                    JobPostId = jobPostId,
                    Title = trimmed
                };
                tasks.Add(task);
            }
        }
        else if (!string.IsNullOrWhiteSpace(trimmed))
        {
            var task = new JobPostTask
            {
                Id = Guid.NewGuid(),
                JobPostId = jobPostId,
                Title = trimmed
            };
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
            Implementation = jobPostDto.Implementation
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
        if (!string.IsNullOrWhiteSpace(jobPostDto.Implementation))
        {
            SaveJobPostWbs(jobPost.Id, jobPostDto.Implementation);
        }
        await _context.SaveChangesAsync();
        return (await GetJobPostByIdAsync(jobPost.Id))!;
    }

    public async Task<IReadOnlyList<JobPost>> GetJobsAsync()
    {
        var list = await _context.JobPosts
                             .Include(jp => jp.ClientUser)
                             .Include(jp => jp.Domain) 
                             .Include(jp => jp.Specialization)
                             .Include(jp => jp.JobPostSkills)
                                 .ThenInclude(jps => jps.Skill)
                             .Include(jp => jp.JobPostTasks)
                                 .ThenInclude(t => t.JobPostMiniTasks)
                             .ToListAsync();
        foreach (var jp in list)
        {
            jp.Implementation = GetJobPostWbsJson(jp);
        }
        return list;
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


        jobPost.Implementation = jobPostDto.Implementation;

        if (jobPostDto.Implementation != null)
        {
            var oldTasks = await _context.JobPostTasks.Where(t => t.JobPostId == id).ToListAsync();
            _context.JobPostTasks.RemoveRange(oldTasks);

            if (!string.IsNullOrWhiteSpace(jobPostDto.Implementation))
            {
                SaveJobPostWbs(id, jobPostDto.Implementation);
            }
        }

        await _context.SaveChangesAsync();
        return await GetJobPostByIdAsync(id);
    }

    public async Task<IEnumerable<JobPost>> GetFilteredJobsAsync(string? search, decimal? minBudget, decimal? maxBudget, string? status, Guid? categoryDomainId)
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
            query = query.Where(x => x.Status.Equals(statusClean, StringComparison.OrdinalIgnoreCase));
        }

        if (categoryDomainId.HasValue && categoryDomainId.Value != Guid.Empty)
        {
            query = query.Where(x => x.DomainId == categoryDomainId.Value);
        }

        var list = await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
        foreach (var jp in list)
        {
            jp.Implementation = GetJobPostWbsJson(jp);
        }
        return list;
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
        markdownBuilder.AppendLine($"# BẢN PHÂN RÃ CẤU TRÚC CÔNG VIỆC (WBS) - DỰ ÁN: {proposal.JobPostTitle.ToUpper()}");
        markdownBuilder.AppendLine($"* **Mã số đề xuất (Proposal ID):** {proposal.Id}");
        markdownBuilder.AppendLine($"* **Chuyên gia đảm nhiệm (Expert ID):** {proposal.ExpertId}");
        markdownBuilder.AppendLine($"* **Tổng số lượng tác vụ (AI Segmented Tasks):** {taskCount} Tasks");
        markdownBuilder.AppendLine($"* **Thời hạn hoàn thành bàn giao (Deadline):** {deadlineDays} ngày kể từ ngày ký kết");
        markdownBuilder.AppendLine("---");
        markdownBuilder.AppendLine("## DANH SÁCH CHI TIẾT CÁC MỐC TIẾN ĐỘ VÀ NHIỆM VỤ THÀNH PHẦN");

        int daysPerTask = Math.Max(1, deadlineDays / taskCount);
        for (int i = 1; i <= taskCount; i++)
        {
            markdownBuilder.AppendLine($"### 📍 Mốc tiến độ {i}: Thực thi cấu phần nghiệp vụ số {i}");
            markdownBuilder.AppendLine($"- **Mô tả cấu phần nghiệp vụ:** Tiến hành phân tích, thiết kế logic, xây dựng mã nguồn và kiểm chuẩn đơn vị (Unit Test) cho phân hệ chức năng {i} dựa trên giải pháp kỹ thuật: {proposal.Implementation}.");
            markdownBuilder.AppendLine($"- **Thời gian xử lý dự kiến:** {daysPerTask} ngày.");
            markdownBuilder.AppendLine();
        }

        markdownBuilder.AppendLine("---");
        markdownBuilder.AppendLine("_Bản tài liệu này được phân rã tự động bởi Trợ lý AI Phân tích Nghiệp vụ của nền tảng AITasker để làm cơ sở pháp lý nghiệm thu hợp đồng ký kết._");

        var rootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot", "milestones");
        if (!Directory.Exists(rootPath)) Directory.CreateDirectory(rootPath);

        var fileName = $"Milestone_Proposal_{proposalId}.md";
        var fullPath = Path.Combine(rootPath, fileName);
        await System.IO.File.WriteAllTextAsync(fullPath, markdownBuilder.ToString(), System.Text.Encoding.UTF8);

        var fileUrl = $"/milestones/{fileName}";
        
        // Ghi đè đường dẫn file Markdown sạch vào cột Portfolio của bảng Proposals
        proposal.Portfolio = fileUrl; 
        await _context.SaveChangesAsync();

        return fileUrl;
    }
}