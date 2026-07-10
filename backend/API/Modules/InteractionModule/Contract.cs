using System;
using AITasker_Modular.Modules.ProjectModule;

namespace AITasker_Modular.Modules.InteractionModule
{
    public class Contract
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public Guid ClientId { get; set; }
        public Guid ExpertId { get; set; }
        public string ContractTerms { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending"; // "Pending" | "Active" | "Terminated"
        public decimal TotalValue { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? SignedAt { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public Project? Project { get; set; }
    }
}