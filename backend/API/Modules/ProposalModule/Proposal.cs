using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.JobModule;

[Table("Proposals")]
public class Proposal
{
    [Key]
    public Guid Id { get; set; }
    public Guid JobPostId { get; set; }
    public Guid ExpertId { get; set; }
    public decimal BidAmount { get; set; }
    public int EstimatedDuration { get; set; }

    [Required]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Introduction { get; set; } = string.Empty;

    [Required]
    public string Technical { get; set; } = string.Empty;

    [Required]
    public string Implementation { get; set; } = string.Empty;

    [Required]
    public string Dependencies { get; set; } = string.Empty;

    public string? Portfolio { get; set; }

    // THAO TÁC CƠ HỌC: ĐỤC THÊM TRƯỜNG LƯU ĐƯỜNG DẪN TỆP TIN ĐÍNH KÈM CỦA PROPOSAL
    public string? AttachmentUrl { get; set; }

    [Required]
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    [ForeignKey("JobPostId")]
    [JsonIgnore]
    public JobPost? JobPost { get; set; }

    [ForeignKey("ExpertId")]
    [JsonIgnore]
    public ApplicationUser? Expert { get; set; }

    [NotMapped]
    [JsonPropertyName("jobPost")]
    public string JobPostTitle => JobPost?.Title ?? string.Empty;

    [NotMapped]
    [JsonPropertyName("expert")]
    public string ExpertName => Expert?.FullName ?? string.Empty;
}