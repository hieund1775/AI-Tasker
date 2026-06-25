using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Helpers;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.AdminModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly IUserService _userService;

        public AdminController(IAdminService adminService, IUserService userService)
        {
            _adminService = adminService;
            _userService = userService;
        }

        [HttpPost("owner/create-staff")]
        public async Task<IActionResult> OwnerCreateStaff([FromBody] CreateStaffInput dto)
        {
            var (ownerIdStr, errorResult) = await this.ValidateOwnerAsync(_userService);
            if (errorResult != null)
                return errorResult;

            var ownerId = Guid.Parse(ownerIdStr!);

            try {
                var staffId = await _adminService.CreateStaffAsync(dto.Username, dto.Password, dto.FullName, ownerId);
                return Ok(new { Message = "Đã khởi tạo Staff thành công.", StaffId = staffId });
            } catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
              catch (ArgumentException ex) { return BadRequest(ex.Message); }
        }

        [HttpPut("owner/ban-staff/{targetStaffId:guid}")]
        public async Task<IActionResult> OwnerBanStaff(Guid targetStaffId)
        {
            var (ownerIdStr, errorResult) = await this.ValidateOwnerAsync(_userService);
            if (errorResult != null)
                return errorResult;

            var ownerId = Guid.Parse(ownerIdStr!);

            try {
                await _adminService.BanStaffAsync(targetStaffId, ownerId);
                return Ok(new { Message = "Đã khóa tài khoản nhân viên thành công." });
            } catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
              catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("owner/system-dashboard")]
        public async Task<IActionResult> GetOwnerDashboard()
        {
            var (ownerIdStr, errorResult) = await this.ValidateOwnerAsync(_userService);
            if (errorResult != null)
                return errorResult;

            var ownerId = Guid.Parse(ownerIdStr!);

            try {
                var data = await _adminService.GetOwnerDashboardAsync(ownerId);
                return Ok(data);
            } catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }
    }

    public class CreateStaffInput { public string Username { get; set; } = string.Empty; public string Password { get; set; } = string.Empty; public string FullName { get; set; } = string.Empty; }
}