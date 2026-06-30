using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;

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
                Title = "Yêu cầu hủy hợp đồng",
                Content = "Client đã gửi yêu cầu hủy hợp đồng đối với dự án của bạn.",
                LinkUrl = "/expert/projects/proj-017",
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddMinutes(-20)
            }
        };

        [HttpGet]
        public IActionResult GetNotifications()
        {
            return Ok(MockNotifications);
        }

        [HttpPut("{id}/read")]
        public IActionResult MarkAsRead(string id)
        {
            var notif = MockNotifications.Find(n => n.Id == id);
            if (notif != null) notif.IsRead = true;
            return Ok(new { Success = true });
        }

        [HttpPut("read-all")]
        public IActionResult ReadAll()
        {
            foreach (var notif in MockNotifications) notif.IsRead = true;
            return Ok(new { Success = true });
        }
    }

    public class NotificationDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string LinkUrl { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}