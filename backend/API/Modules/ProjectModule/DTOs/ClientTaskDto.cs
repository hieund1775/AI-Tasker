using System;

namespace AITasker_Modular.Modules.ProjectModule.DTOs
{
    public class ClientTaskDto
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
        public string? FeedbackContent { get; set; }
        public Guid? FeedbackSenderId { get; set; }
        public int TotalDuration { get; set; }
    }
}
