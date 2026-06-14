using AITasker_Modular.Database;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Modules.JobModule.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.JobModule;

public class JobService : IJobService
{
    private readonly DataContext _context;

    public JobService(DataContext context)
    {
        _context = context;
    }

    public async Task<JobPost> CreateJobAsync(CreateJobPostDto jobPostDto)
    {
        Guid.TryParse(jobPostDto.ClientId, out var clientGuid);

        Guid? categoryGuid = null;
        if (!string.IsNullOrEmpty(jobPostDto.AICategoryDomainId) && Guid.TryParse(jobPostDto.AICategoryDomainId, out var parsedCategoryGuid))
        {
            categoryGuid = parsedCategoryGuid;
        }

        var jobPost = new JobPost
        {
            Id = Guid.NewGuid(),
            ClientId = clientGuid,
            Title = jobPostDto.Title.Trim(),
            Description = jobPostDto.Description.Trim(),
            Budget = jobPostDto.Budget,
            Deadline = jobPostDto.Deadline,
            Status = "Open", 
            CreatedAt = DateTime.UtcNow,
            AICategoryDomainId = categoryGuid
        };

        if (jobPostDto.SkillIds != null && jobPostDto.SkillIds.Any())
        {
            foreach (var sid in jobPostDto.SkillIds)
            {
                if (Guid.TryParse(sid, out var sguid))
                {
                    jobPost.JobPostSkills.Add(new JobPostSkill
                    {
                        JobPostsId = jobPost.Id,
                        SkillsId = sguid
                    });
                }
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
                             .AsNoTracking()
                             .FirstOrDefaultAsync(jp => jp.Id == id);
    }

    public async Task<JobPost?> UpdateJobPostAsync(Guid id, DTOs.UpdateJobPostDto jobPostDto)
    {
        var jobPost = await _context.JobPosts
                                     .Include(jp => jp.JobPostSkills)
                                     .FirstOrDefaultAsync(jp => jp.Id == id);
        if (jobPost == null)
            return null;

        Guid? categoryGuid = null;
        if (!string.IsNullOrEmpty(jobPostDto.AICategoryDomainId) && Guid.TryParse(jobPostDto.AICategoryDomainId, out var parsedCategoryGuid))
        {
            categoryGuid = parsedCategoryGuid;
        }

        jobPost.Title = jobPostDto.Title.Trim();
        jobPost.Description = jobPostDto.Description.Trim();
        jobPost.Budget = jobPostDto.Budget;
        jobPost.Deadline = jobPostDto.Deadline;
        jobPost.AICategoryDomainId = categoryGuid;

        _context.JobPostSkills.RemoveRange(jobPost.JobPostSkills);
        jobPost.JobPostSkills.Clear();

        if (jobPostDto.SkillIds != null && jobPostDto.SkillIds.Any())
        {
            foreach (var sid in jobPostDto.SkillIds)
            {
                if (Guid.TryParse(sid, out var sguid))
                {
                    jobPost.JobPostSkills.Add(new JobPostSkill
                    {
                        JobPostsId = jobPost.Id,
                        SkillsId = sguid
                    });
                }
            }
        }

        await _context.SaveChangesAsync();
        return await GetJobPostByIdAsync(id);
    }

    public async Task<IEnumerable<JobPost>> GetFilteredJobsAsync(
        string? search, 
        decimal? minBudget, 
        decimal? maxBudget, 
        string? status, 
        Guid? categoryDomainId)
    {
        var query = _context.JobPosts
                            .Include(jp => jp.ClientUser)
                            .Include(jp => jp.AICategoryDomain)
                            .Include(jp => jp.JobPostSkills)
                                .ThenInclude(jps => jps.Skill)
                            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            string searchLower = search.ToLower().Trim();
            query = query.Where(x => x.Title.ToLower().Contains(searchLower) 
                                  || x.Description.ToLower().Contains(searchLower));
        }

        if (minBudget.HasValue)
        {
            query = query.Where(x => x.Budget >= minBudget.Value);
        }
        if (maxBudget.HasValue)
        {
            query = query.Where(x => x.Budget <= maxBudget.Value);
        }

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