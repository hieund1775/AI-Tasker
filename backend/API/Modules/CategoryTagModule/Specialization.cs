using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace AITasker_Modular.Modules.CategoryTagModule;

[Table("Specializations")]
public class Specialization
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    public Guid DomainId { get; set; }

    [ForeignKey("DomainId")]
    [JsonIgnore]
    public Domain? Domain { get; set; }
}
