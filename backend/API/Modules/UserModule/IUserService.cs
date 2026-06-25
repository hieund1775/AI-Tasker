namespace AITasker_Modular.Modules.UserModule;

public interface IUserService
{
    Task<string> RegisterAsync(string email, string password, string fullName, string role);
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
}