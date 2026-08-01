using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace AITasker_Modular.Modules.CategoryTagModule;

[Table("Domains")]
public class Domain
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    public string Name { get; set; } = string.Empty;

    [JsonIgnore]
    public ICollection<Specialization> Specializations { get; set; } = new List<Specialization>();
}
