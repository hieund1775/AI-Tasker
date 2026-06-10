using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Helpers;

public static class AuthorizationHelper
{
    public static async Task<(string? RequesterId, IActionResult? ErrorResult)> ValidateAdminOrOwnerAsync(this ControllerBase controller, IUserService userService)
    {
        var authHeader = controller.Request.Headers["Authorization"].ToString();
        if (string.IsNullOrEmpty(authHeader))
            return (null, controller.Unauthorized(new { message = "Authorization header is required." }));

        var token = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? authHeader.Substring(7).Trim()
            : authHeader.Trim();

        if (string.IsNullOrEmpty(token) || !token.StartsWith("mock-jwt-token-for-", StringComparison.OrdinalIgnoreCase))
            return (null, controller.Unauthorized(new { message = "Invalid token format." }));

        var requesterId = token.Substring("mock-jwt-token-for-".Length);
        if (!Guid.TryParse(requesterId, out _))
            return (null, controller.Unauthorized(new { message = "Invalid token payload." }));

        var isAdminOrOwner = await userService.IsAdminOrOwnerAsync(requesterId);
        if (!isAdminOrOwner)
            return (null, controller.StatusCode(403, new { message = "Only Admin or Owner can access this resource." }));

        return (requesterId, null);
    }

    public static (string? RequesterId, IActionResult? ErrorResult) GetRequesterId(this ControllerBase controller)
    {
        var authHeader = controller.Request.Headers["Authorization"].ToString();
        if (string.IsNullOrEmpty(authHeader))
            return (null, controller.Unauthorized(new { message = "Authorization header is required." }));

        var token = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? authHeader.Substring(7).Trim()
            : authHeader.Trim();

        if (string.IsNullOrEmpty(token) || !token.StartsWith("mock-jwt-token-for-", StringComparison.OrdinalIgnoreCase))
            return (null, controller.Unauthorized(new { message = "Invalid token format." }));

        var requesterId = token.Substring("mock-jwt-token-for-".Length);
        if (!Guid.TryParse(requesterId, out _))
            return (null, controller.Unauthorized(new { message = "Invalid token payload." }));

        return (requesterId, null);
    }
}
