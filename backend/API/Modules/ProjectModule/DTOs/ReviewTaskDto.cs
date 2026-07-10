using System;
using System.ComponentModel.DataAnnotations;

namespace AITasker_Modular.Modules.ProjectModule.DTOs
{
    public class ReviewTaskDto
    {
        public bool Approve { get; set; }
        public string? FeedbackContent { get; set; }
        [Required]
        public Guid FeedbackSenderId { get; set; }
    }
}
