using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Helpers;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.AdminModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly IUserService _userService;
        private readonly DataContext _context;

        public AdminController(IAdminService adminService, IUserService userService, DataContext context)
        {
            _adminService = adminService;
            _userService = userService;
            _context = context;
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

        // ===================================================================================
        // API ĐÃ TÍCH HỢP: XEM SỐ DƯ KÉT SẮT TỔNG VÀ IN LỊCH SỬ GIAO DỊCH ĐỐI SOÁT CHO OWNER
        // ===================================================================================
        [HttpGet("owner/system-dashboard")]
        public async Task<IActionResult> GetOwnerDashboard()
        {
            var (ownerIdStr, errorResult) = await this.ValidateOwnerAsync(_userService);
            if (errorResult != null)
                return errorResult;

            var ownerId = Guid.Parse(ownerIdStr!);

            try {
                // 1. Lấy dữ liệu mockup/thống kê cũ của nhóm em từ tầng Service
                var serviceData = await _adminService.GetOwnerDashboardAsync(ownerId);

                // 2. Đọc số dư két sắt tổng thực tế trong DB (Hiệu năng O(1))
                var systemWallet = await _context.SystemWallets
                    .FirstOrDefaultAsync(w => w.Id == Guid.Parse("11111111-1111-1111-1111-111111111111"));
                
                // 3. Kéo ra 50 giao dịch thu phế/phạt hủy đơn mới nhất để đối soát kế toán
                var financeLogs = await _context.SystemTransactionLogs
                    .OrderByDescending(l => l.CreatedAt)
                    .Take(50)
                    .ToListAsync();

                // 4. Trộn hai nguồn dữ liệu lại để Frontend hiển thị toàn diện
                return Ok(new {
                    Statistics = serviceData,
                    TotalPlatformRevenue = systemWallet?.TotalBalance ?? 0m,
                    RevenueUpdatedAt = systemWallet?.UpdatedAt,
                    TransactionHistories = financeLogs
                });

            } catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }
    }

    public class CreateStaffInput { public string Username { get; set; } = string.Empty; public string Password { get; set; } = string.Empty; public string FullName { get; set; } = string.Empty; }
}
