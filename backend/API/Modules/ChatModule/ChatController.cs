using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace AITasker_Modular.Modules.ChatModule
{
    [ApiController]
    [Route("api/chat")]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _service;

        public ChatController(IChatService service)
        {
            _service = service;
        }

        [HttpPost("conversations")]
        public async Task<IActionResult> GetOrCreateConversation([FromBody] CreateConversationDto dto)
        {
            var result = await _service.GetOrCreateConversationAsync(dto);
            return Ok(result);
        }

        [HttpGet("conversations/user/{userId:guid}")]
        public async Task<IActionResult> GetUserConversations(Guid userId)
        {
            var result = await _service.GetUserConversationsAsync(userId);
            return Ok(result ?? Array.Empty<ConversationResponseDto>());
        }

        [HttpPost("messages")]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
        {
            try
            {
                var result = await _service.SendMessageAsync(dto);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("conversations/{conversationId:guid}/messages")]
        public async Task<IActionResult> GetConversationMessages(Guid conversationId)
        {
            var result = await _service.GetConversationMessagesAsync(conversationId);
            return Ok(result ?? Array.Empty<MessageResponseDto>());
        }
    }
}
