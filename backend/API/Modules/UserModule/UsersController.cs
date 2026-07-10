using AITasker_Modular.Modules.UserModule.DTOs;
using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Helpers;

namespace AITasker_Modular.Modules.UserModule;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var normalizedRole = dto.Role?.Trim().ToLowerInvariant();
        if (normalizedRole != "client" && normalizedRole != "expert")
        {
            return BadRequest(new { message = "Chỉ chấp nhận đăng ký vai trò Client hoặc Expert." });
        }

        try
        {
            var result = await _userService.RegisterAsync(dto.Email, dto.Password, dto.FullName, dto.Role!, dto.PhoneNumber);
            return result.Contains("already exists", StringComparison.OrdinalIgnoreCase)
                ? BadRequest(new { message = result })
                : Ok(new { message = result });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var (user, token, error) = await _userService.LoginAsync(dto.Email, dto.Password);
        if (error != null)
        {
            return BadRequest(new { message = error });
        }

        return Ok(new LoginResponseDto
        {
            Token = token ?? string.Empty,
            User = user!
        });
    }

    [HttpPut("{userId}/expert-profile")]
    public async Task<IActionResult> UpdateExpertProfile(string userId, [FromBody] UpdateExpertProfileDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var success = await _userService.UpdateExpertProfileAsync(userId, dto);
        if (!success)
            return BadRequest(new { message = "User not found or is not an Expert." });

        return Ok(new { message = "Expert profile updated successfully." });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var success = await _userService.UpdateUserAsync(id, dto);
        if (!success)
            return NotFound(new { message = "User not found." });

        return Ok(new { message = "User updated successfully." });
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        var (requesterId, errorResult) = await this.ValidateStaffOrOwnerAsync(_userService);
        if (errorResult != null)
            return errorResult;

        var (users, error) = await _userService.GetAllUsersAsync(requesterId!);
        if (error != null)
        {
            return BadRequest(new { message = error });
        }

        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserDetail(string id)
    {
        var userDetail = await _userService.GetUserDetailByIdAsync(id);
        if (userDetail == null)
            return NotFound(new { message = "User not found." });

        return Ok(userDetail);
    }

    [HttpPut("{id}/set-active")]
    public async Task<IActionResult> SetUserActive(string id, [FromBody] SetUserActiveDto dto)
    {
        var (_, errorResult) = await this.ValidateStaffOrOwnerAsync(_userService);
        if (errorResult != null)
            return errorResult;

        try
        {
            var success = await _userService.SetUserActiveStatusAsync(id, dto.IsActive);
            if (!success)
                return NotFound(new { message = "User not found." });

            return Ok(new { message = $"User status set to {(dto.IsActive ? "Active" : "Inactive")} successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{userId}/deposit")]
    public async Task<IActionResult> Deposit(string userId, [FromBody] TransactionDto dto)
    {
        if (dto.Amount <= 0)
            return BadRequest(new { message = "Deposit amount must be positive." });

        try
        {
            var newBalance = await _userService.DepositAsync(userId, dto.Amount);
            return Ok(new { message = "Deposit successful.", balance = newBalance });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{userId}/withdraw")]
    public async Task<IActionResult> Withdraw(string userId, [FromBody] TransactionDto dto)
    {
        if (dto.Amount <= 0)
            return BadRequest(new { message = "Withdrawal amount must be positive." });

        try
        {
            var newBalance = await _userService.WithdrawAsync(userId, dto.Amount);
            return Ok(new { message = "Withdrawal successful.", balance = newBalance });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("experts")]
    public async Task<IActionResult> GetPublicExperts()
    {
        try
        {
            var experts = await _userService.GetPublicExpertsAsync();
            return Ok(experts);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// [NEW] POST /api/users/logout
    /// Đăng xuất - client xóa token phía FE. Server chỉ xác nhận thành công.
    /// (Token là mock stateless nên không cần invalidate phía server)
    /// </summary>
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        // Trong kiến trúc stateless mock token hiện tại, logout được xử lý bởi client.
        // Endpoint này xác nhận logout thành công để Frontend biết có thể xóa token local.
        return Ok(new { message = "Đăng xuất thành công. Vui lòng xóa token phía client." });
    }

    /// <summary>
    /// [NEW] POST /api/auth/refresh - Làm mới token dựa trên userId
    /// Body: { "userId": "guid" }
    /// </summary>
    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto?.UserId))
            return BadRequest(new { message = "UserId không được để trống." });

        var (user, token, error) = await _userService.RefreshTokenAsync(dto.UserId);
        if (error != null)
            return BadRequest(new { message = error });

        return Ok(new LoginResponseDto { Token = token ?? string.Empty, User = user! });
    }

    /// <summary>
    /// [NEW] POST /api/users/forgot-password
    /// Body: { "email": "user@example.com" }
    /// Tạo reset token và trả về (trong prod sẽ gửi qua email).
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto?.Email))
            return BadRequest(new { message = "Email không được để trống." });

        var (success, resetToken, error) = await _userService.ForgotPasswordAsync(dto.Email);
        if (!success)
            return BadRequest(new { message = error });

        // Trong prod: gửi email với link chứa resetToken
        // Trong dev: trả về token để test
        return Ok(new
        {
            message = "Yêu cầu đặt lại mật khẩu đã được xử lý. Vui lòng kiểm tra email.",
            resetToken, // DEV ONLY - xóa khỏi response trong production
            note = "Token có hiệu lực trong 15 phút."
        });
    }

    /// <summary>
    /// [NEW] POST /api/users/reset-password
    /// Body: { "resetToken": "hex-token", "newPassword": "newpass123" }
    /// </summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto?.ResetToken) || string.IsNullOrWhiteSpace(dto?.NewPassword))
            return BadRequest(new { message = "Token và mật khẩu mới không được để trống." });

        var (success, error) = await _userService.ResetPasswordAsync(dto.ResetToken, dto.NewPassword);
        if (!success)
            return BadRequest(new { message = error });

        return Ok(new { message = "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." });
    }
}

public class SetUserActiveDto
{
    public bool IsActive { get; set; }
}

public class TransactionDto
{
    public decimal Amount { get; set; }
}

public class RefreshTokenDto
{
    public string UserId { get; set; } = string.Empty;
}

public class ForgotPasswordDto
{
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    public string ResetToken { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
