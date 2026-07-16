namespace AITasker_Modular.Modules.UserModule;

public interface IUserService
{
    Task<(bool Success, string Message, string? VerificationToken)> RegisterAsync(string email, string password, string fullName, string role, string phoneNumber, string baseUrl);
    Task<(DTOs.UserDto? User, string? Token, string? Error)> LoginAsync(string email, string password);
    Task<decimal> DepositAsync(string userId, decimal amount); // Changed Guid to string
    Task<decimal> WithdrawAsync(string userId, decimal amount); // Changed Guid to string
    Task<bool> UpdateExpertProfileAsync(string userId, DTOs.UpdateExpertProfileDto dto);
    Task<bool> UpdateUserAsync(string userId, DTOs.UpdateUserDto dto);
    Task<(System.Collections.Generic.List<DTOs.UserDto>? Users, string? Error)> GetAllUsersAsync(string requesterId);
    Task<DTOs.UserDetailDto?> GetUserDetailByIdAsync(string id);
    Task<bool> IsStaffOrOwnerAsync(string userId);
    Task<bool> IsOwnerAsync(string userId);
    Task<bool> SetUserActiveStatusAsync(string userId, bool isActive);
    Task<System.Collections.Generic.List<DTOs.UserDetailDto>> GetPublicExpertsAsync();

    // [NEW] Auth management endpoints
    Task<(DTOs.UserDto? User, string? Token, string? Error)> RefreshTokenAsync(string userId);
    Task<(bool Success, string? ResetToken, string? Error)> ForgotPasswordAsync(string email);
    Task<(bool Success, string? Error)> ResetPasswordAsync(string resetToken, string newPassword);
    Task<(bool Success, string? Error)> VerifyEmailAsync(string email, string token);
    Task<(bool Success, string? ResendToken, string? Error)> ResendVerificationEmailAsync(string email, string baseUrl);
}