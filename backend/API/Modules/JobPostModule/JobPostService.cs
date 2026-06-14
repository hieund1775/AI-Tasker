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

    public async Task<JobPost> CreateJobAsync(JobPost jobPostInput)
    {
        var jobPost = new JobPost
        {
            Id = Guid.NewGuid(),
            ClientId = jobPostInput.ClientId,
            Title = jobPostInput.Title.Trim(),
            Description = jobPostInput.Description.Trim(),
            Budget = jobPostInput.Budget,
            Deadline = jobPostInput.Deadline,
            Status = "Open", 
            CreatedAt = DateTime.UtcNow,
            AICategoryDomainId = jobPostInput.AICategoryDomainId
        };

        if (jobPostInput.SkillIds != null && jobPostInput.SkillIds.Any())
        {
            foreach (var sid in jobPostInput.SkillIds)
            {
                if (Guid.TryParse(sid, out var sguid))
                {
                    jobPost.JobPostSkills.Add(new JobPostSkill { JobPostsId = jobPost.Id, SkillsId = sguid });
                }
            }
        }

        if (jobPostInput.Requirements != null && jobPostInput.Requirements.Any())
        {
            foreach (var req in jobPostInput.Requirements)
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
                             .Include(jp => jp.AICategoryDomain) 
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
                             .Include(jp => jp.AICategoryDomain)
                             .Include(jp => jp.JobPostSkills)
                                 .ThenInclude(jps => jps.Skill)
                             .Include(jp => jp.JobRequirements)
                             .AsNoTracking()
                             .FirstOrDefaultAsync(jp => jp.Id == id);
    }

    public async Task<JobPost?> UpdateJobPostAsync(Guid id, JobPost jobPostInput)
    {
        var jobPost = await _context.JobPosts
                                     .Include(jp => jp.JobPostSkills)
                                     .Include(jp => jp.JobRequirements)
                                     .FirstOrDefaultAsync(jp => jp.Id == id);
        if (jobPost == null) return null;

        jobPost.Title = jobPostInput.Title.Trim();
        jobPost.Description = jobPostInput.Description.Trim();
        jobPost.Budget = jobPostInput.Budget;
        jobPost.Deadline = jobPostInput.Deadline;
        jobPost.AICategoryDomainId = jobPostInput.AICategoryDomainId;

        _context.JobPostSkills.RemoveRange(jobPost.JobPostSkills);
        jobPost.JobPostSkills.Clear();

        if (jobPostInput.SkillIds != null && jobPostInput.SkillIds.Any())
        {
            foreach (var sid in jobPostInput.SkillIds)
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

        if (jobPostInput.Requirements != null && jobPostInput.Requirements.Any())
        {
            foreach (var req in jobPostInput.Requirements)
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
                            .Include(jp => jp.AICategoryDomain)
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
            query = query.Where(x => x.AICategoryDomainId == categoryDomainId.Value);
        }

        return await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
    }

    public async Task<IEnumerable<JobPost>> GetJobPostsByClientIdAsync(Guid clientId)
    {
        return await _context.JobPosts
                             .Include(jp => jp.ClientUser)
                             .Include(jp => jp.AICategoryDomain)
                             .Include(jp => jp.JobPostSkills)
                                 .ThenInclude(jps => jps.Skill)
                             .Where(x => x.ClientId == clientId)
                             .OrderByDescending(x => x.CreatedAt)
                             .ToListAsync();
    }

}