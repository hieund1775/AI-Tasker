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
        Task<Project?> SubmitProjectLinkAsync(Guid projectId, string projectLink); // Expert nộp sản phẩm/link nghiệm thu
    }
}