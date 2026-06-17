using System;
using System.ComponentModel.DataAnnotations;

namespace AITasker_Modular.Modules.ChatModule
{
    public class CreateConversationDto
    {
        public Guid? OriginJobPostId { get; set; }

        [Required(ErrorMessage = "Client ID is required.")]
        public Guid ClientId { get; set; }

        [Required(ErrorMessage = "Expert ID is required.")]
        public Guid ExpertId { get; set; }
    }

    public class SendMessageDto
    {
        [Required(ErrorMessage = "Conversation ID is required.")]
        public Guid ConversationId { get; set; }

        [Required(ErrorMessage = "Sender ID is required.")]
        public Guid SenderId { get; set; }

        [Required(ErrorMessage = "Content is required.")]
        public string Content { get; set; } = string.Empty;
    }

    public class ConversationResponseDto
    {
        public Guid Id { get; set; }
        public Guid? OriginJobPostId { get; set; }
        public string? JobPostTitle { get; set; }
        public Guid ClientId { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public Guid ExpertId { get; set; }
        public string ExpertName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string? LastMessageContent { get; set; }
        public DateTime? LastMessageSentAt { get; set; }
        public Guid? LastMessageSenderId { get; set; }
    }

    public class MessageResponseDto
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public Guid SenderId { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
