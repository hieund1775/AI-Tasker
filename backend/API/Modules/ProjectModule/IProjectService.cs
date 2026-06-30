using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.ProjectModule
{
    public interface IProjectService
    {
        Task<IEnumerable<Project>> GetProjectsByClientAsync(Guid clientId);
        Task<IEnumerable<Project>> GetProjectsByExpertAsync(Guid expertId);
        Task<Project?> UpdateProjectStatusAsync(Guid projectId, string status);
        Task<Project?> SubmitProjectLinkAsync(Guid projectId, string projectLink);
        Task<Project?> GetProjectByIdAsync(Guid projectId);
        Task<MiniTask?> UpdateMiniTaskAsync(Guid miniTaskId, bool isCompleted, string? feedbackContent, Guid? feedbackSenderId, DateTime? deadline, int duration);
        Task<Task?> GetTaskWithTimelineAsync(Guid taskId);
        Task<Task?> UpdateTaskStatusAsync(Guid taskId, string status);
        Task<Task?> CreateTaskAsync(Guid projectId, string title);
        Task<MiniTask?> CreateMiniTaskAsync(Guid taskId, string title, DateTime? deadline, int duration);
        Task<bool> DeleteTaskAsync(Guid taskId);
        Task<bool> DeleteMiniTaskAsync(Guid miniTaskId);
        Task<Task?> SubmitTaskForReviewAsync(Guid taskId);
        Task<Task?> ReviewTaskAsync(Guid taskId, bool approve, string? feedbackContent, Guid feedbackSenderId);
        Task<Project?> CreateProjectFromProposalAsync(Guid proposalId);

        Task<bool> LockProjectForDisputeAsync(Guid projectId);
        Task<decimal> PayoutDisputeEscrowAsync(Guid projectId, string winnerRole);
    }
}
