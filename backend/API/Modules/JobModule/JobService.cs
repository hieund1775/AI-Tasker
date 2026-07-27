using AITasker_Modular.Database;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Modules.JobModule.DTOs;

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
        var jobPost = new JobPost
        {
            Id = Guid.NewGuid(),
            ClientId = Guid.TryParse(jobPostDto.ClientId, out var clientGuid) ? clientGuid : Guid.Empty,
            Title = jobPostDto.Title.Trim(),
            Description = jobPostDto.Description.Trim(),
            Budget = jobPostDto.Budget,
            Deadline = jobPostDto.Deadline,
            Status = "Open", 
            CreatedAt = DateTime.UtcNow,
            AICategoryDomainId = Guid.TryParse(jobPostDto.AICategoryDomainId, out var domainGuid) ? domainGuid : null
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
        return (await GetJobPostByIdAsync(jobPost.Id.ToString()))!;
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

    public async Task<JobPost?> GetJobPostByIdAsync(string id)
    {
        if (!Guid.TryParse(id, out var jobGuid))
            return null;

        return await _context.JobPosts
                             .Include(jp => jp.ClientUser)
                             .Include(jp => jp.AICategoryDomain)
                             .Include(jp => jp.JobPostSkills)
                                 .ThenInclude(jps => jps.Skill)
                             .AsNoTracking()
                             .FirstOrDefaultAsync(jp => jp.Id == jobGuid);
     }

    public async Task<JobPost?> UpdateJobPostAsync(string id, DTOs.UpdateJobPostDto jobPostDto)
    {
        if (!Guid.TryParse(id, out var jobGuid))
            return null;

        var jobPost = await _context.JobPosts
                                     .Include(jp => jp.JobPostSkills)
                                     .FirstOrDefaultAsync(jp => jp.Id == jobGuid);
        if (jobPost == null)
            return null;

        jobPost.Title = jobPostDto.Title.Trim();
        jobPost.Description = jobPostDto.Description.Trim();
        jobPost.Budget = jobPostDto.Budget;
        jobPost.Deadline = jobPostDto.Deadline;
        jobPost.AICategoryDomainId = Guid.TryParse(jobPostDto.AICategoryDomainId, out var domainGuid) ? domainGuid : null;

        // Clear existing skills
        _context.JobPostSkills.RemoveRange(jobPost.JobPostSkills);
        jobPost.JobPostSkills.Clear();

        // Add new skills
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
}