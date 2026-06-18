using AITasker_Modular.Database;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Modules.JobModule; // <── ÉP TRÌNH BIÊN DỊCH DÙNG CHUNG CHỮ KÝ HÀM VỚI INTERFACE
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.JobPostModule;

public class JobPostService : IJobPostService
{
    private readonly DataContext _context;

    public JobPostService(DataContext context)
    {
        _context = context;
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
            Status = "Open", 
            CreatedAt = DateTime.UtcNow,
            DomainId = jobPostDto.DomainId,
            SpecializationId = jobPostDto.SpecializationId
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

        if (jobPostDto.Requirements != null && jobPostDto.Requirements.Any())
        {
            foreach (var req in jobPostDto.Requirements)
            {
                jobPost.JobRequirements.Add(new JobRequirement
                {
                    Id = Guid.NewGuid(),
                    JobPostId = jobPost.Id,
                    UseCaseName = req.UseCaseName.Trim(),
                    Description = req.Description?.Trim()
                });
            }
        }

        _context.JobPosts.Add(jobPost);
        await _context.SaveChangesAsync();
        return (await GetJobPostByIdAsync(jobPost.Id))!;
    }

    public async Task<IReadOnlyList<JobPost>> GetJobsAsync()
    {
        return await _context.JobPosts
                             .Include(jp => jp.ClientUser)
                             .Include(jp => jp.Domain) 
                             .Include(jp => jp.Specialization)
                             .Include(jp => jp.JobPostSkills)
                                 .ThenInclude(jps => jps.Skill)
                             .Include(jp => jp.JobRequirements)
                             .AsNoTracking() 
                             .ToListAsync();
    }

    public async Task<JobPost?> GetJobPostByIdAsync(Guid id)
    {
        return await _context.JobPosts
                             .Include(jp => jp.ClientUser)
                             .Include(jp => jp.Domain)
                             .Include(jp => jp.Specialization)
                             .Include(jp => jp.JobPostSkills)
                                 .ThenInclude(jps => jps.Skill)
                             .Include(jp => jp.JobRequirements)
                             .AsNoTracking()
                             .FirstOrDefaultAsync(jp => jp.Id == id);
    }

    public async Task<JobPost?> UpdateJobPostAsync(Guid id, UpdateJobPostDto jobPostDto)
    {
        var jobPost = await _context.JobPosts
                                     .Include(jp => jp.JobPostSkills)
                                     .Include(jp => jp.JobRequirements)
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

        if (jobPost.JobRequirements?.Any() == true)
        {
            _context.Set<JobRequirement>().RemoveRange(jobPost.JobRequirements);
            jobPost.JobRequirements.Clear();
        }

        if (jobPostDto.Requirements != null && jobPostDto.Requirements.Any())
        {
            jobPost.JobRequirements ??= new List<JobRequirement>();
            foreach (var req in jobPostDto.Requirements)
            {
                jobPost.JobRequirements.Add(new JobRequirement
                {
                    Id = Guid.NewGuid(),
                    JobPostId = jobPost.Id,
                    UseCaseName = req.UseCaseName.Trim(),
                    Description = req.Description?.Trim()
                });
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
                            .Include(jp => jp.JobRequirements)
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

        return await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
    }

    public async Task<IEnumerable<JobPost>> GetJobPostsByClientIdAsync(Guid clientId)
    {
        return await _context.JobPosts
                             .Include(jp => jp.ClientUser)
                             .Include(jp => jp.Domain)
                             .Include(jp => jp.Specialization)
                             .Include(jp => jp.JobPostSkills)
                                 .ThenInclude(jps => jps.Skill)
                             .Include(jp => jp.JobRequirements)
                             .Where(x => x.ClientId == clientId)
                             .OrderByDescending(x => x.CreatedAt)
                             .ToListAsync();
    }
}