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
            var requestScheme = Request.Scheme;
            var requestHost = Request.Host.Value;
            var baseUrl = $"{requestScheme}://{requestHost}";

            var (success, result, verificationToken) = await _userService.RegisterAsync(dto.Email, dto.Password, dto.FullName, dto.Role!, dto.PhoneNumber, baseUrl);
            
            if (!success)
            {
                return BadRequest(new { message = result });
            }

            return Ok(new 
            { 
                message = result, 
                verificationToken, // DEV ONLY
                note = "Xác thực tài khoản bằng token này hoặc qua link email."
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/users/verify-email
    /// Xác thực email qua API POST.
    /// </summary>
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto?.Email) || string.IsNullOrWhiteSpace(dto?.Token))
            return BadRequest(new { message = "Email và mã xác thực không được để trống." });

        var (success, error) = await _userService.VerifyEmailAsync(dto.Email, dto.Token);
        if (!success)
            return BadRequest(new { message = error });

        return Ok(new { message = "Xác thực email thành công. Tài khoản của bạn đã được kích hoạt." });
    }

    /// <summary>
    /// GET /api/users/verify-email
    /// Xác thực email qua liên kết kích hoạt. Trả về trang HTML trực quan.
    /// </summary>
    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmailGet([FromQuery] string email, [FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token))
        {
            return Content(GetVerificationResultHtml(false, "Email và mã xác thực không hợp lệ."), "text/html");
        }

        var (success, error) = await _userService.VerifyEmailAsync(email, token);
        return Content(GetVerificationResultHtml(success, error ?? "Tài khoản của bạn đã được kích hoạt thành công."), "text/html");
    }

    /// <summary>
    /// POST /api/users/resend-verification
    /// Gửi lại mã/liên kết xác thực email.
    /// </summary>
    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto?.Email))
            return BadRequest(new { message = "Email không được để trống." });

        try
        {
            var requestScheme = Request.Scheme;
            var requestHost = Request.Host.Value;
            var baseUrl = $"{requestScheme}://{requestHost}";

            var (success, resendToken, error) = await _userService.ResendVerificationEmailAsync(dto.Email, baseUrl);
            if (!success)
                return BadRequest(new { message = error });

            return Ok(new
            {
                message = "Mã xác thực mới đã được gửi. Vui lòng kiểm tra email của bạn.",
                verificationToken = resendToken, // DEV ONLY
                note = "Xác thực tài khoản bằng token mới này hoặc click vào liên kết được gửi đến email."
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static string GetVerificationResultHtml(bool isSuccess, string message)
    {
        var title = isSuccess ? "Xác thực thành công" : "Xác thực thất bại";
        var icon = isSuccess ? "✓" : "✗";
        var iconColor = isSuccess ? "#2ecc71" : "#e74c3c";
        var btnText = isSuccess ? "Đăng nhập ngay" : "Thử lại";
        var explanation = isSuccess 
            ? "Tài khoản của bạn đã được kích hoạt thành công. Bạn đã có thể đăng nhập vào ứng dụng và sử dụng tất cả tính năng." 
            : $"Đã xảy ra lỗi trong quá trình xác thực tài khoản: {message}";

        return $@"
        <!DOCTYPE html>
        <html lang=""vi"">
        <head>
            <meta charset=""UTF-8"">
            <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
            <title>{title} - AI-Tasker</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: #f4f7f6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                }}
                .card {{
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 400px;
                    width: 100%;
                }}
                .icon {{
                    font-size: 60px;
                    color: {iconColor};
                    margin-bottom: 20px;
                }}
                h1 {{
                    color: #2c3e50;
                    margin-bottom: 10px;
                    font-size: 24px;
                }}
                p {{
                    color: #7f8c8d;
                    margin-bottom: 30px;
                    line-height: 1.5;
                }}
                .btn {{
                    background: #3498db;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 500;
                    transition: background 0.2s;
                    display: inline-block;
                }}
                .btn:hover {{
                    background: #2980b9;
                }}
            </style>
        </head>
        <body>
            <div class=""card"">
                <div class=""icon"">{icon}</div>
                <h1>{title}!</h1>
                <p>{explanation}</p>
                <a href=""#"" class=""btn"" onclick=""window.close(); return false;"">Đóng cửa sổ</a>
            </div>
        </body>
        </html>";
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

public class VerifyEmailDto
{
    public string Email { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
}

public class ResendVerificationDto
{
    public string Email { get; set; } = string.Empty;
}
