using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AITasker_Modular.Modules.JobModule; // <── Gọi thực thể lai chuẩn từ JobModule

namespace AITasker_Modular.Modules.JobPostModule
{
    public interface IJobPostService
    {
        Task<IEnumerable<JobPost>> GetFilteredJobsAsync(string? search, decimal? minBudget, decimal? maxBudget, string? status, Guid? categoryDomainId);
        Task<IReadOnlyList<JobPost>> GetJobsAsync();
        Task<JobPost?> GetJobPostByIdAsync(Guid id);
        Task<JobPost> CreateJobAsync(CreateJobPostDto jobPostDto);
        Task<JobPost?> UpdateJobPostAsync(Guid id, UpdateJobPostDto jobPostDto);
        Task<IEnumerable<JobPost>> GetJobPostsByClientIdAsync(Guid clientId);
    }
}