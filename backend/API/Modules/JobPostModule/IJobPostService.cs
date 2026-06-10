using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.JobModule
{
    public interface IJobPostService
    {
        Task<IEnumerable<JobPost>> GetFilteredJobsAsync(string? search, decimal? minBudget, decimal? maxBudget, string? status, Guid? categoryDomainId);
    }
}