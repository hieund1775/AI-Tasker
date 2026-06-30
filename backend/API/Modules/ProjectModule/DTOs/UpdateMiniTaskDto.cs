using System;

namespace AITasker_Modular.Modules.ProjectModule.DTOs
{
    public class UpdateMiniTaskDto
    {
        public bool IsCompleted { get; set; }
        public string? FeedbackContent { get; set; }
        public Guid? FeedbackSenderId { get; set; }
        public DateTime? Deadline { get; set; }
        public int Duration { get; set; }
    }
}
