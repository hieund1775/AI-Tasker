using System;

namespace AITasker_Modular.Modules.DisputeModule
{
    public class ReportDetailDto
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public Guid ReporterId { get; set; }
        public string ReporterRole { get; set; } = string.Empty;
        public string ReportType { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? DisputeType { get; set; }
        public string? DesiredResolution { get; set; }
        public string? EvidenceUrl { get; set; }
        public string Status { get; set; } = string.Empty;
        
        // Cancellation fields
        public decimal EscrowRefundClient { get; set; }
        public decimal EscrowPayExpert { get; set; }
        public decimal PlatformFee { get; set; }
        public string? PartnerRejectionReason { get; set; }
        public string? AdminNote { get; set; }

        // Explanation fields for type1/type2
        public string? ClientExplanation { get; set; }
        public string? ClientExplanationReason { get; set; }
        public string? ClientExplanationDescription { get; set; }
        public string? ClientExplanationEvidence { get; set; }
        public string? ClientExplanationDesiredResolution { get; set; }

        public string? ExpertExplanation { get; set; }
        public string? ExpertExplanationReason { get; set; }
        public string? ExpertExplanationDescription { get; set; }
        public string? ExpertExplanationEvidence { get; set; }
        public string? ExpertExplanationDesiredResolution { get; set; }

        public DateTime? ReplyDeadline { get; set; }
        public bool CurrentRoundClientSubmitted { get; set; }
        public bool CurrentRoundExpertSubmitted { get; set; }

        // Joined Project/User fields
        public Guid ClientId { get; set; }
        public Guid ExpertId { get; set; }
        public string ProjectTitle { get; set; } = string.Empty;
        public DateTime? ProjectDeadline { get; set; } // EndDate of project
        public DateTime ProjectStartDate { get; set; }
        
        // Parsed history logs as objects instead of raw string
        public object? HistoryLogs { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
