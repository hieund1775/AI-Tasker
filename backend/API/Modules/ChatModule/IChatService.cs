using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.ChatModule
{
    public interface IChatService
    {
        Task<ConversationResponseDto> GetOrCreateConversationAsync(CreateConversationDto dto);
        Task<IEnumerable<ConversationResponseDto>> GetUserConversationsAsync(Guid userId);
        Task<MessageResponseDto> SendMessageAsync(SendMessageDto dto);
        Task<IEnumerable<MessageResponseDto>> GetConversationMessagesAsync(Guid conversationId);
    }
}
