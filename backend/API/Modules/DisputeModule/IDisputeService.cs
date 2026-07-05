using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.DisputeModule
{
    public interface IDisputeService
    {
        Task<Guid> SubmitProjectReportAsync(Guid projectId, Guid reporterId, string reason, string? evidenceUrl, string? reporterRole, string? reportType, string? description, string? disputeType, string? desiredResolution);
        Task<List<ReportDto>> GetSharedReportsQueueAsync(Guid staffId);
        Task<object> TriggerProjectDisputeLockAsync(Guid projectId, string reason, Guid staffId);
        Task<object> ExecuteDisputeVerdictAsync(Guid disputeId, string winnerRole, string verdictReason, Guid staffId);
    }
}