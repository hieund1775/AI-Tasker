using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.CategoryTagModule;

[Table("DomainExpertProfiles")]
public class DomainExpertProfile
{
    public Guid DomainId { get; set; }
    public Guid ExpertProfilesUserId { get; set; }

    public Domain? Domain { get; set; }

    [JsonIgnore]
    public ExpertProfile? ExpertProfile { get; set; }
}
