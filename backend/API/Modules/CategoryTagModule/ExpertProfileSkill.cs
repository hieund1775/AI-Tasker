using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.CategoryTagModule;

[Table("ExpertProfileSkill")]
public class ExpertProfileSkill
{
    public Guid ExpertProfilesUserId { get; set; }
    public Guid SkillsId { get; set; }

    [JsonIgnore]
    public ExpertProfile? ExpertProfile { get; set; }
    public Skill? Skill { get; set; }
}
