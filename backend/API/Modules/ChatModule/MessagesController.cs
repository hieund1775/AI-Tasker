using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.ChatModule
{
    [ApiController]
    [Route("api/messages")]
    public class MessagesController : ControllerBase
    {
        private readonly DataContext _context;

        public MessagesController(DataContext context)
        {
            _context = context;
        }

        // GET /api/messages -> ĐÃ CHUYỂN ĐỔI SANG ĐỌC DATABASE THẬT 100%
        [HttpGet]
        public async Task<IActionResult> GetMessages()
        {
            // Truy vấn trực tiếp vào bảng Messages vật lý của nhóm, sắp xếp tin nhắn mới nhất lên đầu
            var realMessages = await _context.Messages
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new DirectMessageDto
                {
                    Id = m.Id,
                    SenderId = m.SenderId,
                    // FE cần trường ReceiverId, tạm thời bốc Id đối tác hoặc lấy từ thực thể liên kết nếu có
                    ReceiverId = m.Conversation != null 
                        ? (m.SenderId == m.Conversation.ClientId ? m.Conversation.ExpertId : m.Conversation.ClientId)
                        : Guid.Empty,
                    Content = m.Content,
                    Timestamp = m.CreatedAt
                })
                .ToListAsync();

            return Ok(realMessages);
        }
    }

    public class DirectMessageDto
    {
        public Guid Id { get; set; }
        public Guid SenderId { get; set; }
        public Guid ReceiverId { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }
}