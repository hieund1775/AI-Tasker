using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.CategoryTagModule;

[Table("AICategoryDomainExpertProfile")]
public class AICategoryDomainExpertProfile
{
    public Guid AICategoryDomainsId { get; set; }
    public Guid ExpertProfilesUserId { get; set; }

    public AICategoryDomain? AICategoryDomain { get; set; }

    [JsonIgnore]
    public ExpertProfile? ExpertProfile { get; set; }
}
