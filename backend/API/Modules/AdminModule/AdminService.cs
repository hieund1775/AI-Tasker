using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;

namespace AITasker_Modular.Modules.AdminModule
{
    public class AdminService : IAdminService
    {
        private readonly DataContext _context;

        public AdminService(DataContext context)
        {
            _context = context;
        }

        public async Task<Guid> CreateStaffAsync(string username, string password, string fullName, Guid ownerId)
        {
            var owner = await _context.Admins.FirstOrDefaultAsync(x => x.Id == ownerId && x.Role.ToLower() == "owner");
            if (owner == null) throw new UnauthorizedAccessException("Chỉ duy nhất Owner tối thượng có quyền khởi tạo nhân sự vận hành.");

            var isExist = await _context.Admins.AnyAsync(x => x.Username == username);
            if (isExist) throw new ArgumentException("Tên đăng nhập nội bộ này đã tồn tại.");

            var staff = new Admin
            {
                Id = Guid.NewGuid(),
                Username = username,
                Password = password,
                FullName = fullName,
                Role = "Staff",
                IsActive = true,
                StaffCode = "STF-" + DateTime.UtcNow.ToString("yyyyMMdd") + "-" + new Random().Next(100, 999),
                AppointedAt = DateTime.UtcNow
            };

            _context.Admins.Add(staff);
            await _context.SaveChangesAsync();
            return staff.Id;
        }

        public async Task<bool> BanStaffAsync(Guid targetStaffId, Guid ownerId)
        {
            var owner = await _context.Admins.FirstOrDefaultAsync(x => x.Id == ownerId && x.Role.ToLower() == "owner");
            if (owner == null) throw new UnauthorizedAccessException("Quyền lực tối cao thuộc về Owner. Từ chối thao tác.");

            var targetStaff = await _context.Admins.FirstOrDefaultAsync(x => x.Id == targetStaffId);
            if (targetStaff == null) throw new KeyNotFoundException("Không tìm thấy tài khoản Staff mục tiêu.");
            if (targetStaff.Role.ToLower() == "owner") throw new InvalidOperationException("Không thể tự khóa chính mình.");

            targetStaff.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<object> GetOwnerDashboardAsync(Guid ownerId)
        {
            var owner = await _context.Admins.FirstOrDefaultAsync(x => x.Id == ownerId && x.Role.ToLower() == "owner");
            if (owner == null) throw new UnauthorizedAccessException("Từ chối truy cập dữ liệu nhạy cảm.");

            var totalStaffs = await _context.Admins.Where(x => x.Role == "Staff").CountAsync();
            var totalProjects = await _context.Projects.CountAsync();
            var totalEscrowFunds = await _context.Projects.Where(p => p.Status == "In Progress").SumAsync(p => p.EscrowBalance);

            return new {
                TotalActiveStaffs = totalStaffs,
                TotalActiveProjects = totalProjects,
                TotalFundsLockedInEscrow = totalEscrowFunds
            };
        }
    }
}