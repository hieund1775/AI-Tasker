using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;

namespace AITasker_Modular.Modules.ChatModule
{
    public class ChatService : IChatService
    {
        private readonly DataContext _context;

        public ChatService(DataContext context)
        {
            _context = context;
        }

        public async Task<ConversationResponseDto> GetOrCreateConversationAsync(CreateConversationDto dto)
        {
            var conversation = await _context.Conversations
                .Include(c => c.Client)
                .Include(c => c.Expert)
                .Include(c => c.OriginJobPost)
                .FirstOrDefaultAsync(x => x.ClientId == dto.ClientId && x.ExpertId == dto.ExpertId && x.OriginJobPostId == dto.OriginJobPostId);

            if (conversation == null)
            {
                conversation = new Conversation
                {
                    Id = Guid.NewGuid(),
                    ClientId = dto.ClientId,
                    ExpertId = dto.ExpertId,
                    OriginJobPostId = dto.OriginJobPostId,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync();
            }

            return await MapConversationToDto(conversation);
        }

        public async Task<IEnumerable<ConversationResponseDto>> GetUserConversationsAsync(Guid userId)
        {
            var conversations = await _context.Conversations
                .Where(x => x.ClientId == userId || x.ExpertId == userId)
                .ToListAsync();

            var dtos = new List<ConversationResponseDto>();
            foreach (var conv in conversations)
            {
                dtos.Add(await MapConversationToDto(conv));
            }

            return dtos.OrderByDescending(x => x.LastMessageSentAt ?? x.CreatedAt);
        }

        public async Task<MessageResponseDto> SendMessageAsync(SendMessageDto dto)
        {
            var conversationExists = await _context.Conversations.AnyAsync(x => x.Id == dto.ConversationId);
            if (!conversationExists)
            {
                throw new InvalidOperationException("Cuộc trò chuyện không tồn tại.");
            }

            var message = new Message
            {
                Id = Guid.NewGuid(),
                ConversationId = dto.ConversationId,
                SenderId = dto.SenderId,
                Content = dto.Content.Trim(),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var sender = await _context.Users.FindAsync(dto.SenderId);
            return new MessageResponseDto
            {
                Id = message.Id,
                ConversationId = message.ConversationId,
                SenderId = message.SenderId,
                SenderName = sender?.FullName ?? "Unknown",
                Content = message.Content,
                IsRead = message.IsRead,
                CreatedAt = message.CreatedAt
            };
        }

        public async Task<IEnumerable<MessageResponseDto>> GetConversationMessagesAsync(Guid conversationId)
        {
            var messages = await _context.Messages
                .Include(m => m.Sender)
                .Where(m => m.ConversationId == conversationId)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();

            return messages.Select(m => new MessageResponseDto
            {
                Id = m.Id,
                ConversationId = m.ConversationId,
                SenderId = m.SenderId,
                SenderName = m.Sender?.FullName ?? "Unknown",
                Content = m.Content,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt
            });
        }

        private async Task<ConversationResponseDto> MapConversationToDto(Conversation conv)
        {
            if (conv.Client == null)
            {
                conv.Client = await _context.Users.FindAsync(conv.ClientId);
            }
            if (conv.Expert == null)
            {
                conv.Expert = await _context.Users.FindAsync(conv.ExpertId);
            }
            if (conv.OriginJobPostId.HasValue && conv.OriginJobPost == null)
            {
                conv.OriginJobPost = await _context.JobPosts.FindAsync(conv.OriginJobPostId.Value);
            }

            var lastMessage = await _context.Messages
                .Where(m => m.ConversationId == conv.Id)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            return new ConversationResponseDto
            {
                Id = conv.Id,
                ClientId = conv.ClientId,
                ClientName = conv.Client?.FullName ?? "Unknown Client",
                ExpertId = conv.ExpertId,
                ExpertName = conv.Expert?.FullName ?? "Unknown Expert",
                OriginJobPostId = conv.OriginJobPostId,
                JobPostTitle = conv.OriginJobPost?.Title,
                CreatedAt = conv.CreatedAt,
                LastMessageContent = lastMessage?.Content,
                LastMessageSentAt = lastMessage?.CreatedAt,
                LastMessageSenderId = lastMessage?.SenderId
            };
        }
    }
}
