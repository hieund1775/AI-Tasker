using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Modules.UserModule.DTOs;

namespace AITasker_Modular.Modules.UserModule;

/// <summary>
/// AuthController cung cấp các endpoint xác thực token riêng.
/// Route: /api/auth
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IUserService _userService;

    public AuthController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// POST /api/auth/refresh
    /// Làm mới token dựa trên userId từ Authorization header hoặc body.
    /// Body: { "userId": "guid" }
    /// </summary>
    [HttpPost("refresh")]
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
    /// POST /api/auth/logout
    /// Đăng xuất – alias dùng route /api/auth/logout.
    /// Vì token là mock stateless, server chỉ cần xác nhận.
    /// </summary>
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return Ok(new { message = "Đăng xuất thành công. Vui lòng xóa token phía client." });
    }

    /// <summary>
    /// POST /api/auth/forgot-password
    /// Yêu cầu đặt lại mật khẩu.
    /// Body: { "email": "user@example.com" }
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto?.Email))
            return BadRequest(new { message = "Email không được để trống." });

        var (success, resetToken, error) = await _userService.ForgotPasswordAsync(dto.Email);
        if (!success)
            return BadRequest(new { message = error });

        return Ok(new
        {
            message = "Yêu cầu đặt lại mật khẩu đã được xử lý. Vui lòng kiểm tra email.",
            resetToken, // DEV ONLY - xóa khỏi response trong production
            note = "Token có hiệu lực trong 15 phút."
        });
    }

    /// <summary>
    /// POST /api/auth/reset-password
    /// Đặt lại mật khẩu bằng token từ email.
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
