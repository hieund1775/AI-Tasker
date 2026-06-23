using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using AITasker_Modular.Modules.JobModule;

namespace AITasker_Modular.Modules.ProposalModule
{
    public interface IProposalService
    {
        Task<Proposal> SubmitProposalAsync(CreateProposalDto dto);
        Task<IEnumerable<Proposal>> GetProposalsByJobPostIdAsync(Guid jobPostId);
        Task<IEnumerable<Proposal>> GetProposalsByExpertIdAsync(Guid expertId);
        Task<Proposal?> UpdateProposalStatusAsync(Guid proposalId, string status);
        Task<string?> GenerateProposalMilestoneMarkdownAsync(Guid proposalId, int taskCount, int deadlineDays);
        Task<object?> AnalyzeAndSplitUseCasesAsync(Guid jobPostId);
    }
}