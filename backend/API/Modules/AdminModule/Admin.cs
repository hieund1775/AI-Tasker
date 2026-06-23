using System;

namespace AITasker_Modular.Modules.AdminModule
{
    public class Admin
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;         
        public bool IsActive { get; set; } = true; 
        public string StaffCode { get; set; } = string.Empty; 
        public DateTime AppointedAt { get; set; } 
    }
}