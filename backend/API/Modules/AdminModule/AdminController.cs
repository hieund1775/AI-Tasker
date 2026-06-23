using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace AITasker_Modular.Modules.AdminModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        [HttpPost("owner/create-staff")]
        public async Task<IActionResult> OwnerCreateStaff([FromBody] CreateStaffInput dto, [FromQuery] Guid ownerId)
        {
            try {
                var staffId = await _adminService.CreateStaffAsync(dto.Username, dto.Password, dto.FullName, ownerId);
                return Ok(new { Message = "Đã khởi tạo Staff thành công.", StaffId = staffId });
            } catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
              catch (ArgumentException ex) { return BadRequest(ex.Message); }
        }

        [HttpPut("owner/ban-staff/{targetStaffId:guid}")]
        public async Task<IActionResult> OwnerBanStaff(Guid targetStaffId, [FromQuery] Guid ownerId)
        {
            try {
                await _adminService.BanStaffAsync(targetStaffId, ownerId);
                return Ok(new { Message = "Đã khóa tài khoản nhân viên thành công." });
            } catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
              catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("owner/system-dashboard")]
        public async Task<IActionResult> GetOwnerDashboard([FromQuery] Guid ownerId)
        {
            try {
                var data = await _adminService.GetOwnerDashboardAsync(ownerId);
                return Ok(data);
            } catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }
    }

    public class CreateStaffInput { public string Username { get; set; } = string.Empty; public string Password { get; set; } = string.Empty; public string FullName { get; set; } = string.Empty; }
}