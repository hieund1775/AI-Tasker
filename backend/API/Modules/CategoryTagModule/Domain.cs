using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AITasker_Modular.Modules.CategoryTagModule;

[Table("Domains")]
public class Domain
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    public string Name { get; set; } = string.Empty;

    public ICollection<Specialization> Specializations { get; set; } = new List<Specialization>();
}
