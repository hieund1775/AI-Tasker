using System;
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Modules.ProjectModule;

namespace AITasker_Modular.Modules.DisputeModule
{
    public class Dispute
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? ClientEvidenceUrl { get; set; }
        public string? ExpertEvidenceUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime EvidenceDeadline { get; set; } 
        public string Status { get; set; } = "Pending"; 
        public string? ResolutionVerdict { get; set; }
        public Guid? HandlerStaffId { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public Project? Project { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public ApplicationUser? HandlerStaff { get; set; }
    }
}