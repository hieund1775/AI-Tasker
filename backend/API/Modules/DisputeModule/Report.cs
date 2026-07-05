using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using AITasker_Modular.Modules.ProjectModule;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.DisputeModule
{
    [Table("Reports")]
    public class Report
    {
        [Key]
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public Guid ReporterId { get; set; }
        public string ReporterRole { get; set; } = string.Empty; // "client" | "expert"
        public string ReportType { get; set; } = "cancellation"; // "cancellation"
        public string Reason { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? DisputeType { get; set; }
        public string? DesiredResolution { get; set; }
        public string? EvidenceUrl { get; set; }

        // Trạng thái đàm phán hủy: "Pending" | "Awaiting Partner" | "Returned" | "Accepted" | "Rejected"
        public string Status { get; set; } = "Pending"; 
        public decimal EscrowRefundClient { get; set; } = 0m;
        public decimal EscrowPayExpert { get; set; } = 0m;
        public decimal PlatformFee { get; set; } = 0m;

        // Thông tin đối chứng từ bên bị hủy
        public string? PartnerRejectionReason { get; set; }
        public string? PartnerExplanation { get; set; }
        public string? PartnerEvidenceUrl { get; set; }
        
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

        public string? AdminNote { get; set; }
        public string? HistoryLogsJson { get; set; } // Lưu vết các vòng đàm phán cũ bằng chuỗi JSON
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // --- KHÔI PHỤC ĐƯỜNG DẪN QUAN HỆ HỆ THỐNG CŨ ĐỂ FIX LỖI CONTEXT ---
        public Guid? HandlerStaffId { get; set; }
        
        [ForeignKey("ProjectId")]
        public Project? Project { get; set; }

        [ForeignKey("ReporterId")]
        public ApplicationUser? Reporter { get; set; }

        [ForeignKey("HandlerStaffId")]
        public ApplicationUser? HandlerStaff { get; set; }
    }
}