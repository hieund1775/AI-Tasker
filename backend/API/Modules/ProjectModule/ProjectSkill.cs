using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AITasker_Modular.Modules.CategoryTagModule;

namespace AITasker_Modular.Modules.ProjectModule;

[Table("ProjectSkill")]
public class ProjectSkill
{
    public Guid ProjectsId { get; set; }
    public Guid SkillsId { get; set; }

    [JsonIgnore]
    public Project? Project { get; set; }
    public Skill? Skill { get; set; }
}
