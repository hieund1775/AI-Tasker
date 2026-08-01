using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Modules.AdminModule
{
    public class AdminService : IAdminService
    {
        private readonly DataContext _context;

        public AdminService(DataContext context)
        {
            _context = context;
        }

        public async Task<Guid> CreateStaffAsync(string username, string password, string fullName, string phoneNumber, Guid ownerId)
        {
            var owner = await _context.Users.FirstOrDefaultAsync(x => x.Id == ownerId && x.Role.ToLower() == "owner");
            if (owner == null) throw new UnauthorizedAccessException("Only the Owner has permission to initialize operating staff.");

            var isExist = await _context.Users.AnyAsync(x => x.Email == username);
            if (isExist) throw new ArgumentException("This internal username already exists.");

            var staff = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                Email = username.Trim().ToLowerInvariant(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 11),
                FullName = fullName.Trim(),
                Role = "Staff",
                Status = "Active",
                StaffCode = "STF-" + DateTime.UtcNow.ToString("yyyyMMdd") + "-" + new Random().Next(100, 999),
                AppointedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                PhoneNumber = phoneNumber.Trim()
            };

            _context.Users.Add(staff);
            await _context.SaveChangesAsync();
            return staff.Id;
        }

        public async Task<bool> BanStaffAsync(Guid targetStaffId, Guid ownerId)
        {
            var owner = await _context.Users.FirstOrDefaultAsync(x => x.Id == ownerId && x.Role.ToLower() == "owner");
            if (owner == null) throw new UnauthorizedAccessException("Only the Owner has permission to perform this action.");

            var targetStaff = await _context.Users.FirstOrDefaultAsync(x => x.Id == targetStaffId);
            if (targetStaff == null) throw new KeyNotFoundException("Target staff account not found.");
            if (targetStaff.Role.ToLower() == "owner") throw new InvalidOperationException("Cannot ban Owner accounts.");

            targetStaff.Status = "Inactive";
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<object> GetOwnerDashboardAsync(Guid ownerId)
        {
            var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == ownerId);
            if (user == null || (!string.Equals(user.Role, "owner", StringComparison.OrdinalIgnoreCase) 
                             && !string.Equals(user.Role, "admin", StringComparison.OrdinalIgnoreCase) 
                             && !string.Equals(user.Role, "staff", StringComparison.OrdinalIgnoreCase)))
            {
                throw new UnauthorizedAccessException("Access to sensitive data is denied.");
            }

            var totalStaffs = await _context.Users.Where(x => x.Role == "Staff").CountAsync();
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