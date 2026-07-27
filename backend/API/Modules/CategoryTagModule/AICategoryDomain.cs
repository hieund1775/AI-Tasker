using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker_Modular.Modules.CategoryTagModule;

[Table("AICategoryDomains")]
public class AICategoryDomain
{
    [Key]
    public Guid Id { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;
}
