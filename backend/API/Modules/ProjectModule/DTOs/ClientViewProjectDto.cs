using System;
using System.Collections.Generic;

namespace AITasker_Modular.Modules.ProjectModule.DTOs
{
    public class ClientViewProjectDto
    {
        public Guid Id { get; set; }
        public Guid? JobPostId { get; set; }
        public Guid ClientId { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public Guid ExpertId { get; set; }
        public string Expert { get; set; } = string.Empty;
        public decimal EscrowBalance { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? ProjectLink { get; set; }
        public Guid? ConversationId { get; set; }
        public ICollection<ProjectSkillDto> ProjectSkills { get; set; } = new List<ProjectSkillDto>();
        public ICollection<ClientTaskDto> Tasks { get; set; } = new List<ClientTaskDto>();
    }
}
