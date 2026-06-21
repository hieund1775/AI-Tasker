using System.ComponentModel.DataAnnotations;

namespace AITasker_Modular.Modules.ProjectModule.DTOs
{
    public class CreateMiniTaskDto
    {
        [Required]
        public string Title { get; set; } = string.Empty;
    }
}
