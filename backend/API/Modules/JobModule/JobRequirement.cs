using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace AITasker_Modular.Modules.JobModule;

[Table("JobRequirements")]
public class JobRequirement
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid JobPostId { get; set; }

    [Required]
    [StringLength(255)]
    public string UseCaseName { get; set; } = string.Empty;

    public string? Description { get; set; }

    // Thiết lập mối quan hệ ngược (Inverse Navigation Property) trỏ về JobPost gốc
    [ForeignKey("JobPostId")]
    [JsonIgnore] // Ngăn chặn vòng lặp vô hạn khi tuần tự hóa JSON (Circular Dependency)
    public JobPost? JobPost { get; set; }
}