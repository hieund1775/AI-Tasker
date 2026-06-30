using System;
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Modules.ProjectModule;

namespace AITasker_Modular.Modules.DisputeModule
{
    public class Report
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; } 
        public Guid ReporterId { get; set; } 
        public string Reason { get; set; } = string.Empty; 
        public string? EvidenceUrl { get; set; } 
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = "Pending"; 
        public Guid? HandlerStaffId { get; set; } 

        [System.Text.Json.Serialization.JsonIgnore]
        public Project? Project { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public ApplicationUser? Reporter { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public ApplicationUser? HandlerStaff { get; set; }
    }
}