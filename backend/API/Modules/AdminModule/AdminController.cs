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

            try
            {
                var staffId = await _adminService.CreateStaffAsync(dto.Username, dto.Password, dto.FullName, dto.PhoneNumber, ownerId);
                return Ok(new { Message = "Staff created successfully.", StaffId = staffId });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (ArgumentException ex) { return BadRequest(ex.Message); }
        }

        [HttpPut("owner/ban-staff/{targetStaffId:guid}")]
        public async Task<IActionResult> OwnerBanStaff(Guid targetStaffId)
        {
            var (ownerIdStr, errorResult) = await this.ValidateOwnerAsync(_userService);
            if (errorResult != null)
                return errorResult;

            var ownerId = Guid.Parse(ownerIdStr!);

            try
            {
                await _adminService.BanStaffAsync(targetStaffId, ownerId);
                return Ok(new { Message = "Staff account banned successfully." });
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        // ===================================================================================
        // API ĐÃ TÍCH HỢP: XEM SỐ DƯ KÉT SẮT TỔNG VÀ IN LỊCH SỬ GIAO DỊCH ĐỐI SOÁT CHO OWNER
        // ===================================================================================
        [HttpGet("owner/system-dashboard")]
        public async Task<IActionResult> GetOwnerDashboard()
        {
            var (requesterIdStr, errorResult) = await this.ValidateStaffOrOwnerAsync(_userService);
            if (errorResult != null)
                return errorResult;

            var requesterId = Guid.Parse(requesterIdStr!);

            try
            {
                // 1. Lấy dữ liệu thống kê của hệ thống từ tầng Service
                var serviceData = await _adminService.GetOwnerDashboardAsync(requesterId);

                // 2. Đọc số dư két sắt tổng thực tế trong DB
                var systemWallet = await _context.SystemWallets
                    .FirstOrDefaultAsync(w => w.Id == Guid.Parse("11111111-1111-1111-1111-111111111111"));

                // 3. Kéo ra TOÀN BỘ giao dịch thu phế/phạt hủy đơn để đối soát kế toán
                var financeLogs = await _context.SystemTransactionLogs
                    .OrderByDescending(l => l.CreatedAt)
                    .ToListAsync();

                var projectIds = financeLogs.Select(l => l.ProjectId).Distinct().ToList();
                var projects = await _context.Projects
                    .Include(p => p.JobPost)
                    .Where(p => projectIds.Contains(p.Id))
                    .ToListAsync();

                var projectEscrows = projects.ToDictionary(p => p.Id, p => p.EscrowBalance);
                var projectOriginalEscrows = projects.ToDictionary(p => p.Id, p => p.JobPost?.Budget ?? 0m);

                var transactionHistories = financeLogs.Select(l => new
                {
                    l.Id,
                    l.ProjectId,
                    OriginalEscrowBalance = projectOriginalEscrows.TryGetValue(l.ProjectId, out var oeb) ? oeb : 0m,
                    Fee = l.Amount,
                    l.Type,
                    l.Description,
                    l.CreatedAt
                }).ToList();

                // 4. Trộn hai nguồn dữ liệu lại để Frontend hiển thị toàn diện
                return Ok(new
                {
                    Statistics = serviceData,
                    TotalPlatformRevenue = systemWallet?.TotalBalance ?? 0m,
                    RevenueUpdatedAt = systemWallet?.UpdatedAt,
                    TransactionHistories = transactionHistories
                });

            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        }
    }

    public class CreateStaffInput
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Phone number is required.")]
        [System.ComponentModel.DataAnnotations.RegularExpression(@"^0[0-9]{9}$", ErrorMessage = "Phone number format is invalid (10 digits starting with 0).")]
        public string PhoneNumber { get; set; } = string.Empty;
    }
}
