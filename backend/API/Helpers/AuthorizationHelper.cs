using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Helpers;

public static class AuthorizationHelper
{
    public static async Task<(string? RequesterId, IActionResult? ErrorResult)> ValidateStaffOrOwnerAsync(this ControllerBase controller, IUserService userService)
    {
        var (requesterId, errorResult) = controller.GetRequesterId();
        if (errorResult != null)
            return (null, errorResult);

        var isStaffOrOwner = await userService.IsStaffOrOwnerAsync(requesterId!);
        if (!isStaffOrOwner)
            return (null, controller.StatusCode(403, new { message = "Only Staff or Owner can access this resource." }));

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

        if (string.IsNullOrEmpty(token))
            return (null, controller.Unauthorized(new { message = "Invalid token format." }));

        var config = controller.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var (principal, error) = JwtHelper.ValidateToken(token, config);

        if (error != null || principal == null)
            return (null, controller.Unauthorized(new { message = error ?? "Invalid token." }));

        var requesterId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(requesterId) || !Guid.TryParse(requesterId, out _))
            return (null, controller.Unauthorized(new { message = "Invalid token payload." }));

        return (requesterId, null);
    }

    public static async Task<(string? RequesterId, IActionResult? ErrorResult)> ValidateOwnerAsync(this ControllerBase controller, IUserService userService)
    {
        var (requesterId, errorResult) = controller.GetRequesterId();
        if (errorResult != null)
            return (null, errorResult);

        var isOwner = await userService.IsOwnerAsync(requesterId!);
        if (!isOwner)
            return (null, controller.StatusCode(403, new { message = "Only Owner can access this resource." }));

        return (requesterId, null);
    }
}
