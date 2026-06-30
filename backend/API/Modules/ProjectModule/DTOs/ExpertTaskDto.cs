using System;
using System.Collections.Generic;

namespace AITasker_Modular.Modules.ProjectModule.DTOs
{
    public class ExpertTaskDto
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
        public string? FeedbackContent { get; set; }
        public Guid? FeedbackSenderId { get; set; }
        public ICollection<ProjectMiniTaskDto> MiniTasks { get; set; } = new List<ProjectMiniTaskDto>();
    }
}
