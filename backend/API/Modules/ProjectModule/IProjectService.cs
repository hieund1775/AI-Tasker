namespace AITasker_Modular.Modules.ProjectModule;

public interface IProjectService
{
    Task<IReadOnlyList<Project>> GetProjectsAsync();
    Task<Project> UpdateProgressAsync(string projectId, string status); // Changed Guid to string
    Task<bool> ApproveMiniTaskAsync(string miniTaskId); // Changed Guid to string
    Task<string> SaveFeedbackAsync(string miniTaskId, string feedback); // Changed Guid to string
}
