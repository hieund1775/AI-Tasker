using AITasker_Modular.Database;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using BCryptTool = BCrypt.Net.BCrypt;
using AITasker_Modular.Modules.JobModule;
using AITasker_Modular.Modules.ProjectModule;

namespace AITasker_Modular.Modules.UserModule;

public class UserService : IUserService
{
    private readonly DataContext _context;

    public UserService(DataContext context)
    {
        _context = context;
    }

    public async Task<string> RegisterAsync(string email, string password, string fullName, string role)
    {
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
            CreatedAt = DateTime.UtcNow
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

        if (user.Status != "Active")
            return (null, null, "User account is not active.");

        var userDto = new DTOs.UserDto
        {
            Id = user.Id.ToString(),
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            Status = user.Status,
            AvatarUrl = user.AvatarUrl,
            CreatedAt = user.CreatedAt
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

        if (!requester.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase) && 
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
                CreatedAt = u.CreatedAt
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

        var proposals = await _context.Proposals
            .Where(p => p.ExpertId == userGuid)
            .Select(p => new DTOs.UserProposalDto
            {
                Id = p.Id.ToString(),
                JobPostId = p.JobPostId.ToString(),
                BidAmount = p.BidAmount,
                CoverLetter = p.CoverLetter,
                Status = p.Status,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        var projects = await _context.Projects
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
                ProjectLink = p.ProjectLink
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
            Wallet = wallet != null ? new DTOs.UserWalletDto { Balance = wallet.Balance } : null,
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

    public async Task<bool> IsAdminOrOwnerAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var guid))
            return false;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == guid);
        if (user == null)
            return false;

        return user.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase) || 
               user.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase);
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
}
