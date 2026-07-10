using AITasker_Modular.Database;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using BCryptTool = BCrypt.Net.BCrypt;
using AITasker_Modular.Modules.JobModule;
using AITasker_Modular.Modules.ProjectModule;
using AITasker_Modular.Modules.InteractionModule;

namespace AITasker_Modular.Modules.UserModule;

public class UserService : IUserService
{
    private readonly DataContext _context;

    public UserService(DataContext context)
    {
        _context = context;
    }

    public async Task<string> RegisterAsync(string email, string password, string fullName, string role, string phoneNumber)
    {
        var normalizedRole = role?.Trim().ToLowerInvariant();
        if (normalizedRole != "client" && normalizedRole != "expert")
        {
            throw new ArgumentException("Chỉ chấp nhận đăng ký vai trò Client hoặc Expert.");
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(x => x.Email == normalizedEmail))
            return "Email already exists.";

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = HashPassword(password),
            FullName = fullName.Trim(),
            Role = string.IsNullOrWhiteSpace(role) ? "Client" : role,
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            PhoneNumber = phoneNumber?.Trim()
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _context.Wallets.Add(new Wallet
        {
            UserId = user.Id,
            Balance = 0m
        });

        await _context.SaveChangesAsync();
        return "User registered successfully.";
    }

    public async Task<(DTOs.UserDto? User, string? Token, string? Error)> LoginAsync(string email, string password)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(x => x.Email == normalizedEmail);

        if (user == null || !VerifyPassword(password, user.PasswordHash))
            return (null, null, "Invalid email or password.");

        if (!string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
            return (null, null, "User account is not active.");

        var userDto = new DTOs.UserDto
        {
            Id = user.Id.ToString(),
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            Status = user.Status,
            AvatarUrl = user.AvatarUrl,
            CreatedAt = user.CreatedAt,
            PhoneNumber = user.PhoneNumber
        };

        var token = $"mock-jwt-token-for-{user.Id}";

        return (userDto, token, null);
    }

    public async Task<decimal> DepositAsync(string userId, decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentException("Deposit amount must be positive.", nameof(amount));

        if (!Guid.TryParse(userId, out var userGuid))
            throw new ArgumentException("Invalid user ID format.", nameof(userId));

        var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userGuid);
        if (wallet == null)
            throw new InvalidOperationException($"Wallet not found for user ID: {userId}");

        wallet.Balance += amount;

        var log = new TransactionLog
        {
            Id = Guid.NewGuid(),
            DestinationWalletId = wallet.UserId,
            Amount = amount,
            Type = "Deposit",
            CreatedAt = DateTime.UtcNow
        };
        _context.TransactionLogs.Add(log);

        await _context.SaveChangesAsync();
        return wallet.Balance;
    }

    public async Task<decimal> WithdrawAsync(string userId, decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentException("Withdrawal amount must be positive.", nameof(amount));

        if (!Guid.TryParse(userId, out var userGuid))
            throw new ArgumentException("Invalid user ID format.", nameof(userId));

        var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userGuid);
        if (wallet == null)
            throw new InvalidOperationException($"Wallet not found for user ID: {userId}");
        if (wallet.Balance < amount)
            throw new InvalidOperationException("Insufficient balance.");

        wallet.Balance -= amount;

        var log = new TransactionLog
        {
            Id = Guid.NewGuid(),
            SourceWalletId = wallet.UserId,
            Amount = amount,
            Type = "Withdraw",
            CreatedAt = DateTime.UtcNow
        };
        _context.TransactionLogs.Add(log);

        await _context.SaveChangesAsync();
        return wallet.Balance;
    }

    public async Task<bool> UpdateExpertProfileAsync(string userId, DTOs.UpdateExpertProfileDto dto)
    {
        if (!Guid.TryParse(userId, out var userGuid))
        {
            return false;
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
        if (user == null || !user.Role.Equals("Expert", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var profile = await _context.ExpertProfiles.FirstOrDefaultAsync(p => p.UserId == userGuid);
        if (profile == null)
        {
            profile = new ExpertProfile
            {
                UserId = userGuid,
                JobTitle = dto.JobTitle,
                Major = dto.Major,
                Certifications = dto.Certifications,
                Bio = dto.Bio,
                PortfolioUrls = dto.PortfolioUrls,
                Location = dto.Location,
                ReputationCredit = 0m,
                SuccessRate = 0.0
            };
            _context.ExpertProfiles.Add(profile);
        }
        else
        {
            profile.JobTitle = dto.JobTitle;
            profile.Major = dto.Major;
            profile.Certifications = dto.Certifications;
            profile.Bio = dto.Bio;
            profile.PortfolioUrls = dto.PortfolioUrls;
            profile.Location = dto.Location;
        }

        await _context.SaveChangesAsync();
        return true;
     }

    public async Task<bool> UpdateUserAsync(string userId, DTOs.UpdateUserDto dto)
    {
        if (!Guid.TryParse(userId, out var guid))
            return false;

        var user = await _context.Users.FindAsync(guid);
        if (user == null)
            return false;

        if (dto.FullName != null)
            user.FullName = dto.FullName;

        if (dto.AvatarUrl != null)
            user.AvatarUrl = dto.AvatarUrl;

        if (dto.Status != null)
            user.Status = dto.Status;

        if (dto.Role != null)
            user.Role = dto.Role;

        if (dto.PhoneNumber != null)
            user.PhoneNumber = dto.PhoneNumber;

        await _context.SaveChangesAsync();
        return true;
    }

     public async Task<(System.Collections.Generic.List<DTOs.UserDto>? Users, string? Error)> GetAllUsersAsync(string requesterId)
    {
        if (!Guid.TryParse(requesterId, out var requesterGuid))
        {
            return (null, "Requester not found.");
        }

        var requester = await _context.Users.FirstOrDefaultAsync(u => u.Id == requesterGuid);
        if (requester == null)
        {
            return (null, "Requester not found.");
        }

        if (!requester.Role.Equals("Staff", StringComparison.OrdinalIgnoreCase) && 
            !requester.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase))
        {
            return (null, "Unauthorized");
        }

        var users = await _context.Users
            .Select(u => new DTOs.UserDto
            {
                Id = u.Id.ToString(),
                Email = u.Email,
                FullName = u.FullName,
                Role = u.Role,
                Status = u.Status,
                AvatarUrl = u.AvatarUrl,
                CreatedAt = u.CreatedAt,
                PhoneNumber = u.PhoneNumber
            })
            .ToListAsync();

        return (users, null);
    }

    public async Task<DTOs.UserDetailDto?> GetUserDetailByIdAsync(string id)
    {
        if (!Guid.TryParse(id, out var userGuid))
            return null;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
        if (user == null)
            return null;

        var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userGuid);
        var profile = await _context.ExpertProfiles.FirstOrDefaultAsync(p => p.UserId == userGuid);

        var jobPosts = await _context.JobPosts
            .Where(j => j.ClientId == userGuid)
            .Select(j => new DTOs.UserJobPostDto
            {
                Id = j.Id.ToString(),
                Title = j.Title,
                Description = j.Description,
                Budget = j.Budget,
                Deadline = j.Deadline,
                Status = j.Status,
                CreatedAt = j.CreatedAt
            })
            .ToListAsync();

        var proposalsDb = await _context.Proposals
            .Include(p => p.ProposalTasks)
            .ThenInclude(t => t.ProposalMiniTasks)
            .Where(p => p.ExpertId == userGuid)
            .ToListAsync();

        var proposals = proposalsDb.Select(p => {
            var wbsJson = "";
            if (p.ProposalTasks != null && p.ProposalTasks.Any())
            {
                var list = p.ProposalTasks.Select(t => new
                {
                    Title = t.Title,
                    Duration = t.Duration,
                    MiniTasks = t.ProposalMiniTasks != null
                        ? t.ProposalMiniTasks.Select(m => new
                        {
                            Title = m.Title,
                            Duration = m.Duration
                        }).ToList()
                        : new()
                }).ToList();
                wbsJson = System.Text.Json.JsonSerializer.Serialize(list);
            }
            return new DTOs.UserProposalDto
            {
                Id = p.Id.ToString(),
                JobPostId = p.JobPostId.ToString(),
                BidAmount = p.BidAmount,
                EstimatedDuration = p.EstimatedDuration,
                Introduction = p.Introduction,
                Implementation = wbsJson,
                Portfolio = p.Portfolio,
                Status = p.Status,
                CreatedAt = p.CreatedAt
            };
        }).ToList();

        var projects = await _context.Projects
            .Include(p => p.JobPost).ThenInclude(jp => jp!.Domain)
            .Where(p => p.ClientId == userGuid || p.ExpertId == userGuid)
            .Select(p => new DTOs.UserProjectDto
            {
                Id = p.Id.ToString(),
                JobPostId = p.JobPostId.HasValue ? p.JobPostId.Value.ToString() : null,
                ClientId = p.ClientId.ToString(),
                ExpertId = p.ExpertId.ToString(),
                EscrowBalance = p.EscrowBalance,
                Status = p.Status,
                StartDate = p.StartDate,
                EndDate = p.EndDate,
                ProjectLink = p.ProjectLink,
                Title = p.JobPost != null ? p.JobPost.Title : string.Empty,
                Budget = p.JobPost != null ? p.JobPost.Budget : 0,
                Category = p.JobPost != null && p.JobPost.Domain != null ? p.JobPost.Domain.Name : null
            })
            .ToListAsync();

        return new DTOs.UserDetailDto
        {
            Id = user.Id.ToString(),
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            Status = user.Status,
            AvatarUrl = user.AvatarUrl,
            CreatedAt = user.CreatedAt,
            PhoneNumber = user.PhoneNumber,
            Wallet = wallet != null ? new DTOs.UserWalletDto { Balance = wallet.Balance, EscrowBalance = wallet.EscrowBalance, TotalEarned = wallet.TotalEarned } : null,
            ExpertProfile = profile != null ? new DTOs.UserExpertProfileDto
            {
                JobTitle = profile.JobTitle,
                Major = profile.Major,
                Certifications = profile.Certifications,
                Bio = profile.Bio,
                PortfolioUrls = profile.PortfolioUrls,
                Location = profile.Location,
                ReputationCredit = profile.ReputationCredit,
                SuccessRate = profile.SuccessRate
            } : null,
            JobPosts = jobPosts,
            Proposals = proposals,
            Projects = projects
        };
    }

    public async Task<bool> IsStaffOrOwnerAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var guid))
            return false;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == guid);
        if (user == null)
            return false;

        return user.Role.Equals("Staff", StringComparison.OrdinalIgnoreCase) || 
               user.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase) ||
               user.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
    }

    public async Task<bool> IsOwnerAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var guid))
            return false;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == guid);
        if (user == null)
            return false;

        return user.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase);
    }

    private static string HashPassword(string password)
    {
        return BCryptTool.HashPassword(password, workFactor: 11);
    }

    private static bool VerifyPassword(string password, string storedHash)
    {
        if (storedHash.StartsWith("$2a$") || storedHash.StartsWith("$2b$") || storedHash.StartsWith("$2y$"))
        {
            try
            {
                return BCryptTool.Verify(password, storedHash);
            }
            catch
            {
                return false;
            }
        }

        try
        {
            byte[] bytes = Convert.FromBase64String(storedHash);
            if (bytes.Length < 48) return false;
            byte[] salt = bytes.Take(16).ToArray();
            byte[] hash = bytes.Skip(16).ToArray();

            byte[] computedHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, hash.Length);

            return CryptographicOperations.FixedTimeEquals(computedHash, hash);
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> SetUserActiveStatusAsync(string userId, bool isActive)
    {
        if (!Guid.TryParse(userId, out var userGuid))
            return false;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
        if (user == null)
            return false;

        var role = user.Role.Trim().ToLowerInvariant();
        if (role != "client" && role != "expert")
        {
            throw new InvalidOperationException("Chỉ có thể thay đổi trạng thái hoạt động của tài khoản Client hoặc Expert.");
        }

        user.Status = isActive ? "Active" : "Inactive";
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<System.Collections.Generic.List<DTOs.UserDetailDto>> GetPublicExpertsAsync()
    {
        var experts = await _context.Users
            .Where(u => u.Role.Equals("Expert") && u.Status.Equals("Active"))
            .ToListAsync();

        var expertIds = experts.Select(e => e.Id).ToList();

        var profiles = await _context.ExpertProfiles
            .Where(p => expertIds.Contains(p.UserId))
            .ToListAsync();

        var result = experts.Select(user => {
            var profile = profiles.FirstOrDefault(p => p.UserId == user.Id);
            return new DTOs.UserDetailDto
            {
                Id = user.Id.ToString(),
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role,
                Status = user.Status,
                AvatarUrl = user.AvatarUrl,
                CreatedAt = user.CreatedAt,
                ExpertProfile = profile != null ? new DTOs.UserExpertProfileDto
                {
                    JobTitle = profile.JobTitle,
                    Major = profile.Major,
                    Certifications = profile.Certifications,
                    Bio = profile.Bio,
                    PortfolioUrls = profile.PortfolioUrls,
                    Location = profile.Location,
                    ReputationCredit = profile.ReputationCredit,
                    SuccessRate = profile.SuccessRate
                } : null
            };
        }).ToList();

        return result;
    }

    /// <summary>
    /// [NEW] Làm mới token: lấy lại UserDto + token mới dựa trên userId.
    /// Token ở đây là mock, nên "refresh" chỉ đơn giản là trả về token mới cùng dạng.
    /// </summary>
    public async Task<(DTOs.UserDto? User, string? Token, string? Error)> RefreshTokenAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var guid))
            return (null, null, "UserId không hợp lệ.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == guid);
        if (user == null)
            return (null, null, "Không tìm thấy người dùng.");

        if (!string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
            return (null, null, "Tài khoản không còn hoạt động.");

        var userDto = new DTOs.UserDto
        {
            Id = user.Id.ToString(),
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            Status = user.Status,
            AvatarUrl = user.AvatarUrl,
            CreatedAt = user.CreatedAt,
            PhoneNumber = user.PhoneNumber
        };

        var token = $"mock-jwt-token-for-{user.Id}";
        return (userDto, token, null);
    }

    /// <summary>
    /// [NEW] Quên mật khẩu: tạo reset token ngẫu nhiên (15 phút) và lưu vào DB.
    /// Trong môi trường thực tế, token này sẽ được gửi qua email.
    /// </summary>
    public async Task<(bool Success, string? ResetToken, string? Error)> ForgotPasswordAsync(string email)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null)
            return (false, null, "Không tìm thấy tài khoản với email này.");

        if (!string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
            return (false, null, "Tài khoản không còn hoạt động.");

        // Tạo token ngẫu nhiên 32 ký tự hex
        var resetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
        user.PasswordResetToken = resetToken;
        user.PasswordResetExpiry = DateTime.UtcNow.AddMinutes(15);

        await _context.SaveChangesAsync();

        // TODO: Gửi email cho user chứa link reset password với resetToken
        // Trong dev mode, trả về token để test trực tiếp
        return (true, resetToken, null);
    }

    /// <summary>
    /// [NEW] Đặt lại mật khẩu: xác thực reset token và cập nhật mật khẩu mới.
    /// </summary>
    public async Task<(bool Success, string? Error)> ResetPasswordAsync(string resetToken, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(resetToken) || string.IsNullOrWhiteSpace(newPassword))
            return (false, "Token và mật khẩu mới không được để trống.");

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.PasswordResetToken == resetToken);

        if (user == null)
            return (false, "Token không hợp lệ hoặc không tồn tại.");

        if (user.PasswordResetExpiry == null || user.PasswordResetExpiry < DateTime.UtcNow)
            return (false, "Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.");

        if (newPassword.Length < 6)
            return (false, "Mật khẩu mới phải có ít nhất 6 ký tự.");

        user.PasswordHash = HashPassword(newPassword);
        user.PasswordResetToken = null;    // Xóa token sau khi dùng (one-time use)
        user.PasswordResetExpiry = null;

        await _context.SaveChangesAsync();
        return (true, null);
    }
}
