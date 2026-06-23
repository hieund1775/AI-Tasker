using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.ProjectModule
{
    public interface IProjectService
    {
        // === CÁC TÍNH NĂNG GỐC HIỆN TẠI CỦA NHÓM MINH (GIỮ NGUYÊN) ===
        Task<IEnumerable<Project>> GetProjectsByClientAsync(Guid clientId);
        Task<IEnumerable<Project>> GetProjectsByExpertAsync(Guid expertId);
        Task<Project?> UpdateProjectStatusAsync(Guid projectId, string status);
        Task<Project?> SubmitProjectLinkAsync(Guid projectId, string projectLink);

        Task<bool> LockProjectForDisputeAsync(Guid projectId);
        Task<decimal> PayoutDisputeEscrowAsync(Guid projectId, string winnerRole);
    }
}