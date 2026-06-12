using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AITasker_Modular.Modules.JobModule; // Để đọc cấu trúc JobPost từ module cũ

namespace AITasker_Modular.Modules.ProposalModule
{
    public interface IProposalService
    {
        Task<Proposal> SubmitProposalAsync(CreateProposalDto dto);
        Task<IEnumerable<Proposal>> GetProposalsByJobPostIdAsync(Guid jobPostId);
        Task<IEnumerable<Proposal>> GetProposalsByExpertIdAsync(Guid expertId);
        Task<Proposal?> UpdateProposalStatusAsync(Guid proposalId, string status);
    }
}