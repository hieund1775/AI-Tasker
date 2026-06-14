namespace AITasker_Modular.Modules.JobModule;

public interface IJobService
{
    Task<IReadOnlyList<JobPost>> GetJobsAsync();
    Task<JobPost?> GetJobPostByIdAsync(Guid id);
    Task<JobPost> CreateJobAsync(DTOs.CreateJobPostDto jobPostDto);
    Task<JobPost?> UpdateJobPostAsync(Guid id, DTOs.UpdateJobPostDto jobPostDto);
    Task<IEnumerable<JobPost>> GetFilteredJobsAsync(string? search, decimal? minBudget, decimal? maxBudget, string? status, Guid? categoryDomainId);
    Task<IEnumerable<JobPost>> GetJobPostsByClientIdAsync(Guid clientId);
}
