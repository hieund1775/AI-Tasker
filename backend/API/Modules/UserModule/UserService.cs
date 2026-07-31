using AITasker_Modular.Database;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using BCryptTool = BCrypt.Net.BCrypt;
using AITasker_Modular.Modules.JobModule;
using AITasker_Modular.Modules.ProjectModule;
using AITasker_Modular.Modules.InteractionModule;
using AITasker_Modular.Modules.CategoryTagModule;

using Microsoft.Extensions.Configuration;
using AITasker_Modular.Helpers;

namespace AITasker_Modular.Modules.UserModule;

public class UserService : IUserService
{
    private readonly DataContext _context;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;

    public UserService(DataContext context, IEmailService emailService, IConfiguration configuration)
    {
        _context = context;
        _emailService = emailService;
        _configuration = configuration;
    }

    public async Task<(bool Success, string Message, string? VerificationToken)> RegisterAsync(string email, string password, string fullName, string role, string phoneNumber, string baseUrl)
    {
        var normalizedRole = role?.Trim().ToLowerInvariant();
        if (normalizedRole != "client" && normalizedRole != "expert")
        {
            return (false, "Chỉ chấp nhận đăng ký vai trò Client hoặc Expert.", null);
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(x => x.Email == normalizedEmail))
            return (false, "Email already exists.", null);

        var verificationToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = HashPassword(password),
            FullName = fullName.Trim(),
            Role = string.IsNullOrWhiteSpace(role) ? "Client" : role,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            PhoneNumber = phoneNumber?.Trim(),
            EmailVerificationToken = verificationToken,
            EmailVerificationExpiry = DateTime.UtcNow.AddHours(24)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _context.Wallets.Add(new Wallet
        {
            UserId = user.Id,
            Balance = 0m
        });

        await _context.SaveChangesAsync();

        // Send email verification
        var verificationUrl = $"{baseUrl}/api/users/verify-email?email={Uri.EscapeDataString(normalizedEmail)}&token={verificationToken}";
        var emailSubject = "Xác thực tài khoản AI-Tasker";
        var emailBody = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                <h2 style='color: #2c3e50; text-align: center;'>Chào mừng đến với AI-Tasker!</h2>
                <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng click vào liên kết bên dưới để xác thực và kích hoạt tài khoản của bạn:</p>
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{verificationUrl}' target='_blank' style='background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;'>Xác thực tài khoản</a>
                </div>
                <p>Hoặc bạn có thể sử dụng mã xác thực sau:</p>
                <div style='background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 2px; border: 1px dashed #bdc3c7;'>
                    {verificationToken}
                </div>
                <p style='color: #7f8c8d; font-size: 12px; margin-top: 30px;'>Liên kết và mã xác thực này có hiệu lực trong vòng 24 giờ. Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email.</p>
            </div>";

        await _emailService.SendEmailAsync(normalizedEmail, emailSubject, emailBody);

        return (true, "User registered successfully. Please check your email to verify your account.", verificationToken);
    }

    public async Task<(DTOs.UserDto? User, string? Token, string? Error)> LoginAsync(string email, string password)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(x => x.Email == normalizedEmail);

        if (user == null || !VerifyPassword(password, user.PasswordHash))
            return (null, null, "Invalid email or password.");

        if (string.Equals(user.Status, "Pending", StringComparison.OrdinalIgnoreCase))
            return (null, null, "Tài khoản chưa được xác thực email. Vui lòng xác thực email trước khi đăng nhập.");

        if (!string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
            return (null, null, "Tài khoản của bạn đã bị khóa hoặc không hoạt động.");

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

        var token = JwtHelper.GenerateToken(user, _configuration);

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
            CreatedAt = DateTime.UtcNow,
            Status = "Success",
            Description = "Nạp tiền vào tài khoản: " + amount.ToString("N0") + " VND"
        };
        _context.TransactionLogs.Add(log);

        await _context.SaveChangesAsync();
        return wallet.Balance;
    }

    public async Task<decimal> WithdrawAsync(string userId, decimal amount, string? bankCode = null, string? bankAccountNumber = null, string? bankAccountName = null)
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

        var resolvedBankCode = !string.IsNullOrWhiteSpace(bankCode) ? bankCode : "VISA (ZaloPay)";
        var description = $"Rút tiền về thẻ/tài khoản ({resolvedBankCode})" +
                          (!string.IsNullOrWhiteSpace(bankAccountNumber) ? $" - Số thẻ/STK: {bankAccountNumber}" : "") +
                          (!string.IsNullOrWhiteSpace(bankAccountName) ? $" - Chủ thẻ: {bankAccountName}" : "");

        var log = new TransactionLog
        {
            Id = Guid.NewGuid(),
            SourceWalletId = wallet.UserId,
            Amount = amount,
            Type = "Withdraw",
            CreatedAt = DateTime.UtcNow,
            Status = "Success",
            BankCode = resolvedBankCode,
            BankAccountNumber = bankAccountNumber,
            BankAccountName = bankAccountName,
            Description = description
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
                SuccessRate = 0.0,
                Category = dto.Category,
                Phone = dto.Phone,
                Website = dto.Website,
                Industry = dto.Industry,
                HourlyRate = dto.HourlyRate
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
            profile.Category = dto.Category;
            profile.Phone = dto.Phone;
            profile.Website = dto.Website;
            profile.Industry = dto.Industry;
            profile.HourlyRate = dto.HourlyRate;
        }

        // --- UPDATE PROFILE SKILLS ---
        if (dto.Skills != null)
        {
            var existingSkills = await _context.ExpertProfileSkills
                .Where(s => s.ExpertProfilesUserId == userGuid)
                .ToListAsync();
            _context.ExpertProfileSkills.RemoveRange(existingSkills);

            foreach (var skillNameOrId in dto.Skills)
            {
                if (string.IsNullOrWhiteSpace(skillNameOrId)) continue;

                Skill? skill = null;
                if (Guid.TryParse(skillNameOrId, out var skillId))
                {
                    skill = await _context.Skills.FindAsync(skillId);
                }
                else
                {
                    skill = await _context.Skills.FirstOrDefaultAsync(s => s.Name.ToLower() == skillNameOrId.ToLower());
                }

                if (skill == null)
                {
                    skill = new Skill
                    {
                        Id = Guid.NewGuid(),
                        Name = skillNameOrId
                    };
                    _context.Skills.Add(skill);
                    await _context.SaveChangesAsync();
                }

                var profileSkill = new ExpertProfileSkill
                {
                    ExpertProfilesUserId = userGuid,
                    SkillsId = skill.Id
                };
                _context.ExpertProfileSkills.Add(profileSkill);
            }
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
        var profile = await _context.ExpertProfiles
            .Include(p => p.ExpertProfileSkills)
                .ThenInclude(eps => eps.Skill)
            .FirstOrDefaultAsync(p => p.UserId == userGuid);

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
            .Include(p => p.Client)
            .Include(p => p.JobPost).ThenInclude(jp => jp!.Domain)
            .Include(p => p.JobPost).ThenInclude(jp => jp!.Specialization)
            .Include(p => p.ProjectSkills).ThenInclude(ps => ps.Skill)
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
                Category = p.JobPost != null && p.JobPost.Domain != null ? p.JobPost.Domain.Name : null,
                ClientName = p.Client != null ? p.Client.FullName : string.Empty,
                SpecializationName = p.JobPost != null && p.JobPost.Specialization != null ? p.JobPost.Specialization.Name : string.Empty,
                ProjectSkills = p.ProjectSkills.Select(ps => ps.Skill != null ? ps.Skill.Name : string.Empty).Where(name => !string.IsNullOrEmpty(name)).ToList()
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
                SuccessRate = profile.SuccessRate,
                Category = profile.Category,
                Phone = profile.Phone,
                Website = profile.Website,
                Industry = profile.Industry,
                HourlyRate = profile.HourlyRate,
                Skills = profile.ExpertProfileSkills != null
                    ? profile.ExpertProfileSkills.Select(eps => eps.Skill?.Name ?? string.Empty).Where(name => !string.IsNullOrEmpty(name)).ToList()
                    : new()
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
            return (null, null, "Invalid user ID format.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == guid);
        if (user == null)
            return (null, null, "User not found.");

        if (!string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
            return (null, null, "User is not active.");

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

        var token = JwtHelper.GenerateToken(user, _configuration);
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
            return (false, null, "Account not found.");

        if (!string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
            return (false, null, "Account is not active.");

        // Tạo token ngẫu nhiên 32 ký tự hex
        var resetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
        user.PasswordResetToken = resetToken;
        user.PasswordResetExpiry = DateTime.UtcNow.AddMinutes(15);

        await _context.SaveChangesAsync();

        // Gửi email chứa mã reset password cho người dùng
        var emailSubject = "Yêu cầu đặt lại mật khẩu AI-Tasker";
        var emailBody = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                <h2 style='color: #2c3e50; text-align: center;'>Đặt lại mật khẩu tài khoản AI-Tasker</h2>
                <p>Xin chào <strong>{user.FullName}</strong>,</p>
                <p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản email <strong>{normalizedEmail}</strong>.</p>
                <p>Vui lòng sử dụng mã xác thực bên dưới để hoàn tất việc đặt lại mật khẩu:</p>
                <div style='background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 2px; border: 1px dashed #3498db; color: #2c3e50;'>
                    {resetToken}
                </div>
                <p style='color: #e74c3c; font-size: 13px; margin-top: 20px;'>⚠️ Mã xác thực này có hiệu lực trong vòng <strong>15 phút</strong> và chỉ sử dụng được 1 lần.</p>
                <p style='color: #7f8c8d; font-size: 12px; margin-top: 30px;'>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ bộ phận hỗ trợ.</p>
            </div>";

        try
        {
            await _emailService.SendEmailAsync(normalizedEmail, emailSubject, emailBody);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EmailError] Failed to send forgot password email: {ex.Message}");
        }

        return (true, resetToken, null);
    }

    /// <summary>
    /// [NEW] Đặt lại mật khẩu: xác thực reset token và cập nhật mật khẩu mới.
    /// </summary>
    public async Task<(bool Success, string? Error)> ResetPasswordAsync(string resetToken, string newPassword)
    {
        if (string.IsNullOrWhiteSpace(resetToken) || string.IsNullOrWhiteSpace(newPassword))
            return (false, "Token and new password cannot be empty.");

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.PasswordResetToken == resetToken);

        if (user == null)
            return (false, "Invalid reset token.");

        if (user.PasswordResetExpiry == null || user.PasswordResetExpiry < DateTime.UtcNow)
            return (false, "Reset token has expired.");

        if (newPassword.Length < 6)
            return (false, "New password must be at least 6 characters.");

        user.PasswordHash = HashPassword(newPassword);
        user.PasswordResetToken = null;    // Xóa token sau khi dùng (one-time use)
        user.PasswordResetExpiry = null;

        await _context.SaveChangesAsync();
        return (true, null);
    }

    /// <summary>
    /// Xác thực tài khoản bằng token từ email
    /// </summary>
    public async Task<(bool Success, string? Error)> VerifyEmailAsync(string email, string token)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token))
            return (false, "Email và mã xác thực không được để trống.");

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null)
            return (false, "Không tìm thấy tài khoản với email này.");

        if (string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
            return (false, "Tài khoản đã được xác thực trước đó.");

        if (user.EmailVerificationToken != token)
            return (false, "Mã xác thực không hợp lệ.");

        if (user.EmailVerificationExpiry == null || user.EmailVerificationExpiry < DateTime.UtcNow)
            return (false, "Mã xác thực đã hết hạn. Vui lòng gửi lại mã mới.");

        user.Status = "Active";
        user.EmailVerificationToken = null;
        user.EmailVerificationExpiry = null;

        await _context.SaveChangesAsync();
        return (true, null);
    }

    /// <summary>
    /// Gửi lại email xác thực
    /// </summary>
    public async Task<(bool Success, string? ResendToken, string? Error)> ResendVerificationEmailAsync(string email, string baseUrl)
    {
        if (string.IsNullOrWhiteSpace(email))
            return (false, null, "Email không được để trống.");

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null)
            return (false, null, "Không tìm thấy tài khoản với email này.");

        if (string.Equals(user.Status, "Active", StringComparison.OrdinalIgnoreCase))
            return (false, null, "Tài khoản đã được kích hoạt.");

        var verificationToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
        user.EmailVerificationToken = verificationToken;
        user.EmailVerificationExpiry = DateTime.UtcNow.AddHours(24);

        await _context.SaveChangesAsync();

        var verificationUrl = $"{baseUrl}/api/users/verify-email?email={Uri.EscapeDataString(normalizedEmail)}&token={verificationToken}";
        var emailSubject = "Xác thực tài khoản AI-Tasker";
        var emailBody = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                <h2 style='color: #2c3e50; text-align: center;'>Chào mừng đến với AI-Tasker!</h2>
                <p>Bạn đã yêu cầu gửi lại mã xác thực. Vui lòng click vào liên kết bên dưới để xác thực và kích hoạt tài khoản của bạn:</p>
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{verificationUrl}' target='_blank' style='background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;'>Xác thực tài khoản</a>
                </div>
                <p>Hoặc bạn có thể sử dụng mã xác thực sau:</p>
                <div style='background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 2px; border: 1px dashed #bdc3c7;'>
                    {verificationToken}
                </div>
                <p style='color: #7f8c8d; font-size: 12px; margin-top: 30px;'>Mã xác thực này có hiệu lực trong vòng 24 giờ.</p>
            </div>";

        await _emailService.SendEmailAsync(normalizedEmail, emailSubject, emailBody);

        return (true, verificationToken, null);
    }

    /// <summary>
    /// Xóa hoàn toàn một tài khoản người dùng và tất cả dữ liệu liên quan trong DB.
    /// Sử dụng Transaction để đảm bảo tính toàn vẹn dữ liệu.
    /// </summary>
    public async Task<bool> DeleteUserFullyAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var userGuid))
            return false;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
        if (user == null)
            return false;

        var executionStrategy = _context.Database.CreateExecutionStrategy();

        return await executionStrategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Lấy danh sách các thực thể liên quan của user
                var userJobPostIds = await _context.JobPosts.Where(jp => jp.ClientId == userGuid).Select(jp => jp.Id).ToListAsync();
                var userProjectIds = await _context.Projects.Where(p => p.ClientId == userGuid || p.ExpertId == userGuid).Select(p => p.Id).ToListAsync();
                var userProposalIds = await _context.Proposals.Where(p => p.ExpertId == userGuid).Select(p => p.Id).ToListAsync();
                
                // Lấy thêm các Proposals gửi cho các Job Post của user này (khi user là Client)
                var jobPostProposalIds = await _context.Proposals.Where(p => userJobPostIds.Contains(p.JobPostId)).Select(p => p.Id).ToListAsync();
                
                // Tổng hợp tất cả proposal liên quan cần xóa
                var allRelatedProposalIds = userProposalIds.Concat(jobPostProposalIds).Distinct().ToList();

                // 2. Xóa các bảng WBS của Proposal (ProposalMiniTask và ProposalTask)
                if (allRelatedProposalIds.Any())
                {
                    var proposalTasks = await _context.ProposalTasks.Where(pt => allRelatedProposalIds.Contains(pt.ProposalId)).ToListAsync();
                    var proposalTaskIds = proposalTasks.Select(pt => pt.Id).ToList();

                    var proposalMiniTasks = await _context.ProposalMiniTasks.Where(pmt => proposalTaskIds.Contains(pmt.ProposalTaskId)).ToListAsync();
                    _context.ProposalMiniTasks.RemoveRange(proposalMiniTasks);
                    _context.ProposalTasks.RemoveRange(proposalTasks);
                }

                // 3. Xóa các bảng WBS của JobPost (JobPostMiniTask và JobPostTask)
                if (userJobPostIds.Any())
                {
                    var jobPostTasks = await _context.JobPostTasks.Where(jpt => userJobPostIds.Contains(jpt.JobPostId)).ToListAsync();
                    var jobPostTaskIds = jobPostTasks.Select(jpt => jpt.Id).ToList();

                    var jobPostMiniTasks = await _context.JobPostMiniTasks.Where(jpmt => jobPostTaskIds.Contains(jpmt.JobPostTaskId)).ToListAsync();
                    _context.JobPostMiniTasks.RemoveRange(jobPostMiniTasks);
                    _context.JobPostTasks.RemoveRange(jobPostTasks);
                }

                // 4. Xóa WBS của Project (MiniTask và ProjectTask)
                if (userProjectIds.Any())
                {
                    var projectTasks = await _context.ProjectTasks.Where(pt => userProjectIds.Contains(pt.ProjectId)).ToListAsync();
                    var projectTaskIds = projectTasks.Select(pt => pt.Id).ToList();

                    var miniTasks = await _context.MiniTasks.Where(mt => projectTaskIds.Contains(mt.TaskId)).ToListAsync();
                    _context.MiniTasks.RemoveRange(miniTasks);
                    _context.ProjectTasks.RemoveRange(projectTasks);
                }

                // 5. Xóa Project Skills
                if (userProjectIds.Any())
                {
                    var projectSkills = await _context.ProjectSkills.Where(ps => userProjectIds.Contains(ps.ProjectsId)).ToListAsync();
                    _context.ProjectSkills.RemoveRange(projectSkills);
                }

                // 6. Xóa JobPost Skills
                if (userJobPostIds.Any())
                {
                    var jobPostSkills = await _context.JobPostSkills.Where(js => userJobPostIds.Contains(js.JobPostsId)).ToListAsync();
                    _context.JobPostSkills.RemoveRange(jobPostSkills);
                }

                // 7. Xóa Contracts, Disputes và Reports liên quan tới Project
                if (userProjectIds.Any())
                {
                    var contracts = await _context.Contracts.Where(c => userProjectIds.Contains(c.ProjectId)).ToListAsync();
                    _context.Contracts.RemoveRange(contracts);

                    var disputes = await _context.Disputes.Where(d => userProjectIds.Contains(d.ProjectId)).ToListAsync();
                    _context.Disputes.RemoveRange(disputes);

                    var reports = await _context.Reports.Where(r => userProjectIds.Contains(r.ProjectId)).ToListAsync();
                    _context.Reports.RemoveRange(reports);
                }

                // Xóa thêm Disputes và Reports do user xử lý (HandlerStaffId) hoặc gửi (ReporterId)
                var staffDisputes = await _context.Disputes.Where(d => d.HandlerStaffId == userGuid).ToListAsync();
                _context.Disputes.RemoveRange(staffDisputes);

                var staffOrReporterReports = await _context.Reports.Where(r => r.ReporterId == userGuid || r.HandlerStaffId == userGuid).ToListAsync();
                _context.Reports.RemoveRange(staffOrReporterReports);

                // 8. Xóa Proposal AI Chats
                var aiChats = await _context.ProposalAiChats.Where(c => c.ExpertId == userGuid || userJobPostIds.Contains(c.JobPostId)).ToListAsync();
                _context.ProposalAiChats.RemoveRange(aiChats);

                // 9. Xóa Proposals
                if (allRelatedProposalIds.Any())
                {
                    var proposals = await _context.Proposals.Where(p => allRelatedProposalIds.Contains(p.Id)).ToListAsync();
                    _context.Proposals.RemoveRange(proposals);
                }

                // 10. Xóa Projects
                if (userProjectIds.Any())
                {
                    var projects = await _context.Projects.Where(p => userProjectIds.Contains(p.Id)).ToListAsync();
                    _context.Projects.RemoveRange(projects);
                }

                // 11. Xóa JobPosts
                if (userJobPostIds.Any())
                {
                    var jobPosts = await _context.JobPosts.Where(jp => userJobPostIds.Contains(jp.Id)).ToListAsync();
                    _context.JobPosts.RemoveRange(jobPosts);
                }

                // 12. Xóa Messages & Conversations
                var userConversations = await _context.Conversations.Where(c => c.ClientId == userGuid || c.ExpertId == userGuid).ToListAsync();
                var userConversationIds = userConversations.Select(c => c.Id).ToList();

                var messages = await _context.Messages.Where(m => userConversationIds.Contains(m.ConversationId) || m.SenderId == userGuid).ToListAsync();
                _context.Messages.RemoveRange(messages);
                _context.Conversations.RemoveRange(userConversations);

                // 13. Xóa Reviews
                var reviews = await _context.Reviews.Where(r => r.CreatedById == userGuid || r.TargetUserId == userGuid).ToListAsync();
                _context.Reviews.RemoveRange(reviews);

                // 14. Xóa Expert Profile liên quan (nếu có)
                var profile = await _context.ExpertProfiles.FirstOrDefaultAsync(p => p.UserId == userGuid);
                if (profile != null)
                {
                    var profileSkills = await _context.ExpertProfileSkills.Where(eps => eps.ExpertProfilesUserId == userGuid).ToListAsync();
                    var profileDomains = await _context.DomainExpertProfiles.Where(dep => dep.ExpertProfilesUserId == userGuid).ToListAsync();
                    
                    _context.ExpertProfileSkills.RemoveRange(profileSkills);
                    _context.DomainExpertProfiles.RemoveRange(profileDomains);
                    _context.ExpertProfiles.Remove(profile);
                }

                // 15. Xóa Transaction Logs & Wallet của User
                var walletLogs = await _context.TransactionLogs.Where(tl => tl.SourceWalletId == userGuid || tl.DestinationWalletId == userGuid).ToListAsync();
                _context.TransactionLogs.RemoveRange(walletLogs);

                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userGuid);
                if (wallet != null)
                {
                    _context.Wallets.Remove(wallet);
                }

                // 16. Xóa User cuối cùng
                _context.Users.Remove(user);

                // Lưu thay đổi & Commit transaction
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }

    public async Task<DTOs.UserDto?> GetUserByIdAsync(string id)
    {
        if (!Guid.TryParse(id, out var userGuid))
            return null;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userGuid);
        if (user == null)
            return null;

        return new DTOs.UserDto
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
    }

    public async Task<DTOs.DashboardStatsDto?> GetDashboardStatsAsync(Guid userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return null;

        var role = user.Role.Trim().ToLowerInvariant();
        
        int posted = 0;
        int active = 0;
        int completed = 0;
        int proposals = 0;
        decimal totalSpent = 0;

        if (role == "client")
        {
            posted = await _context.JobPosts.CountAsync(j => j.ClientId == userId);
            active = await _context.Projects.CountAsync(p => p.ClientId == userId && p.Status == "In Progress");
            completed = await _context.Projects.CountAsync(p => p.ClientId == userId && p.Status == "Completed");
            proposals = await _context.Proposals.CountAsync(p => p.JobPost != null && p.JobPost.ClientId == userId);
            
            totalSpent = await _context.TransactionLogs
                .Where(t => t.SourceWalletId == userId && (t.Type == "ReleasePayment" || t.Type == "EscrowDeposit"))
                .SumAsync(t => t.Amount);
        }
        else if (role == "expert")
        {
            posted = 0;
            active = await _context.Projects.CountAsync(p => p.ExpertId == userId && p.Status == "In Progress");
            completed = await _context.Projects.CountAsync(p => p.ExpertId == userId && p.Status == "Completed");
            proposals = await _context.Proposals.CountAsync(p => p.ExpertId == userId);
            
            totalSpent = await _context.TransactionLogs
                .Where(t => t.DestinationWalletId == userId && t.Type == "ReleasePayment")
                .SumAsync(t => t.Amount);
        }

        return new DTOs.DashboardStatsDto
        {
            Posted = posted,
            Active = active,
            Completed = completed,
            Proposals = proposals,
            TotalSpent = totalSpent
        };
    }
}
