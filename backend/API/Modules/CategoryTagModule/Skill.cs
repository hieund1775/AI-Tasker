using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Modules.JobModule;
using AITasker_Modular.Modules.ProjectModule;

namespace AITasker_Modular.Modules.CategoryTagModule;

[Table("Skills")]
public class Skill
{
    [Key]
    public Guid Id { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;

    [JsonIgnore]
    public ICollection<ExpertProfileSkill> ExpertProfileSkills { get; set; } = new List<ExpertProfileSkill>();

    [JsonIgnore]
    public ICollection<JobPostSkill> JobPostSkills { get; set; } = new List<JobPostSkill>();

    [JsonIgnore]
    public ICollection<ProjectSkill> ProjectSkills { get; set; } = new List<ProjectSkill>();
}
