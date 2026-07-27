using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;

namespace AITasker_Modular.Modules.InteractionModule
{
    [ApiController]
    [Route("api/notifications")]
    public class NotificationsController : ControllerBase
    {
        private static readonly List<NotificationDto> MockNotifications = new()
        {
            new NotificationDto
            {
                Id = "8f3b2351-efc8-47bc-9b21-499387a2a014",
                UserId = string.Empty,
                Title = "Yêu cầu hủy hợp đồng",
                Content = "Client đã gửi yêu cầu hủy hợp đồng đối với dự án của bạn.",
                LinkUrl = "/expert/projects/proj-017",
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddMinutes(-20)
            }
        };

        [HttpGet]
        public IActionResult GetNotifications([FromQuery] Guid? userId)
        {
            if (userId.HasValue)
            {
                var filtered = MockNotifications
                    .Where(n => string.IsNullOrEmpty(n.UserId) || n.UserId.Equals(userId.Value.ToString(), StringComparison.OrdinalIgnoreCase))
                    .OrderByDescending(n => n.CreatedAt)
                    .ToList();
                return Ok(filtered);
            }
            return Ok(MockNotifications.OrderByDescending(n => n.CreatedAt).ToList());
        }

        [HttpPost]
        public IActionResult CreateNotification([FromBody] CreateNotificationDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Invalid notification data.");

            var newNotification = new NotificationDto
            {
                Id = Guid.NewGuid().ToString(),
                UserId = dto.UserId.ToString(),
                Title = dto.Title,
                Content = dto.Content,
                LinkUrl = dto.Link,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            MockNotifications.Insert(0, newNotification);
            return Ok(newNotification);
        }

        [HttpPut("{id}/read")]
        public IActionResult MarkAsRead(string id)
        {
            var notif = MockNotifications.Find(n => n.Id == id);
            if (notif != null) notif.IsRead = true;
            return Ok(new { Success = true });
        }

        [HttpPut("read-all")]
        public IActionResult ReadAll([FromQuery] Guid? userId)
        {
            var notifs = MockNotifications.AsEnumerable();
            if (userId.HasValue)
            {
                notifs = notifs.Where(n => n.UserId.Equals(userId.Value.ToString(), StringComparison.OrdinalIgnoreCase));
            }
            foreach (var notif in notifs) notif.IsRead = true;
            return Ok(new { Success = true });
        }
    }

    public class NotificationDto
    {
        public string Id { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string LinkUrl { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateNotificationDto
    {
        public Guid UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Link { get; set; } = string.Empty;
    }
}