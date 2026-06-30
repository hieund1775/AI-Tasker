using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AITasker_Modular.Modules.CategoryTagModule;

namespace AITasker_Modular.Modules.JobModule; // <── ĐẢM BẢO DÒNG NÀY LÀ JOBMODULE

[Table("JobPostSkill")]
public class JobPostSkill
{
    public Guid JobPostsId { get; set; }
    public Guid SkillsId { get; set; }

    [JsonIgnore]
    public JobPost? JobPost { get; set; }
    public Skill? Skill { get; set; }
}