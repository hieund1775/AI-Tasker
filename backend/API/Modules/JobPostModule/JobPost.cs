using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AITasker_Modular.Modules.CategoryTagModule;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.JobModule; // <── ĐẢM BẢO ÉP CỨNG DÒNG NÀY ĐỂ FIX TOÀN CỤC PROJECT

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
    
    public Guid? AICategoryDomainId { get; set; }

    [ForeignKey("ClientId")]
    [JsonIgnore]
    public ApplicationUser? ClientUser { get; set; }

    [NotMapped]
    public string Client => ClientUser?.FullName ?? string.Empty;

    public AICategoryDomain? AICategoryDomain { get; set; }
    
    public ICollection<JobPostSkill> JobPostSkills { get; set; } = new List<JobPostSkill>();

    // =================================================================================
    // CÁC THUỘC TÍNH PHỤ TRỢ HỨNG DỮ LIỆU LAI TỪ CONTROLLER
    // =================================================================================
    public ICollection<JobRequirement> JobRequirements { get; set; } = new List<JobRequirement>();

    [NotMapped]
    public List<string>? SkillIds { get; set; }

    [NotMapped]
    public List<JobRequirementDto>? Requirements { get; set; }
}