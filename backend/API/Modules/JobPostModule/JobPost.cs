using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AITasker_Modular.Modules.CategoryTagModule;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.JobModule;

[Table("JobPosts")]
public class JobPost
{
    [Key]
    public Guid Id { get; set; }
    
    public Guid ClientId { get; set; }
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Description { get; set; } = string.Empty;
    
    public decimal Budget { get; set; }
    
    public int Deadline { get; set; }
    
    [Required]
    public string Status { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; }
    public Guid? DomainId { get; set; }
    public Guid? SpecializationId { get; set; }
    public string? DurationUnit { get; set; }
    public int DurationValue { get; set; }

    // THAO TÁC CƠ HỌC: ĐỤC THÊM TRƯỜNG LƯU ĐƯỜNG DẪN TỆP TIN ĐÍNH KÈM CỦA BÀI POST
    public string? AttachmentUrl { get; set; }

    public string? Implementation { get; set; }

    [ForeignKey("ClientId")]
    [JsonIgnore]
    public ApplicationUser? ClientUser { get; set; }

    [NotMapped]
    public string Client => ClientUser?.FullName ?? string.Empty;

    public Domain? Domain { get; set; }
    
    [ForeignKey("SpecializationId")]
    public Specialization? Specialization { get; set; }

    public ICollection<JobPostSkill> JobPostSkills { get; set; } = new List<JobPostSkill>();
    public ICollection<JobPostTask> JobPostTasks { get; set; } = new List<JobPostTask>();
}