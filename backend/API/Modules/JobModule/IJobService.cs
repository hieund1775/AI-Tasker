namespace AITasker_Modular.Modules.JobModule;

public interface IJobService
{
    Task<IReadOnlyList<JobPost>> GetJobsAsync();
    Task<JobPost?> GetJobPostByIdAsync(string id);
    Task<JobPost> CreateJobAsync(DTOs.CreateJobPostDto jobPostDto);
    Task<JobPost?> UpdateJobPostAsync(string id, DTOs.UpdateJobPostDto jobPostDto);
}
