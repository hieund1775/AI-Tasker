using System;

namespace AITasker_Modular.Modules.ProjectModule.DTOs
{
    public class ProjectMiniTaskDto
    {
        public Guid Id { get; set; }
        public Guid TaskId { get; set; }
        public string Title { get; set; } = string.Empty;
        public bool IsCompleted { get; set; }
        public string? FeedbackContent { get; set; }
        public Guid? FeedbackSenderId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
