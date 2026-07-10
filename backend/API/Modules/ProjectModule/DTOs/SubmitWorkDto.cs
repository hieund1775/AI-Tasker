using System;

namespace AITasker_Modular.Modules.ProjectModule.DTOs
{
    public class SubmitWorkDto
    {
        public string ProjectLink { get; set; } = string.Empty;
        public string? ProjectFile { get; set; }
    }
}
