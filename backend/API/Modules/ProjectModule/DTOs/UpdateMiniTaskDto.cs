using System;

namespace AITasker_Modular.Modules.ProjectModule.DTOs
{
    public class UpdateMiniTaskDto
    {
        public string? Title { get; set; } // THÊM MỚI
        public bool IsCompleted { get; set; }
        public string? FeedbackContent { get; set; }
        public Guid? FeedbackSenderId { get; set; }
        public int? Duration { get; set; }
        public string? ProductLink { get; set; } // THÊM MỚI
        public string? ProductFile { get; set; } // THÊM MỚI
    }
}
