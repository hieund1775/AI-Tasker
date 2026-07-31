using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.UserModule;

namespace AITasker_Modular.Helpers;

public static class JwtHelper
{
    public const string DefaultSecretKey = "AITaskerSuperSecretKeyForJWTAuthentication2026!";
    public const string DefaultIssuer = "AITaskerAPI";
    public const string DefaultAudience = "AITaskerClient";
    public const int DefaultExpirationInHours = 3;

    public static string GenerateToken(ApplicationUser user, IConfiguration configuration)
    {
        var secretKey = configuration["JwtSettings:SecretKey"] ?? DefaultSecretKey;
        var issuer = configuration["JwtSettings:Issuer"] ?? DefaultIssuer;
        var audience = configuration["JwtSettings:Audience"] ?? DefaultAudience;

        var expirationHoursStr = configuration["JwtSettings:ExpirationInHours"];
        if (!int.TryParse(expirationHoursStr, out var expirationHours))
        {
            expirationHours = DefaultExpirationInHours;
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim(ClaimTypes.Name, user.FullName ?? string.Empty),
            new Claim(ClaimTypes.Role, user.Role ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddHours(expirationHours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static (ClaimsPrincipal? Principal, string? Error) ValidateToken(string token, IConfiguration configuration)
    {
        if (string.IsNullOrWhiteSpace(token))
            return (null, "Token is empty.");

        // Fallback cho mock token cu neu co trong giai doan phat trien
        if (token.StartsWith("mock-jwt-token-for-", StringComparison.OrdinalIgnoreCase))
        {
            var userIdStr = token.Substring("mock-jwt-token-for-".Length);
            if (Guid.TryParse(userIdStr, out _))
            {
                var claims = new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userIdStr)
                };
                var identity = new ClaimsIdentity(claims, "Mock");
                return (new ClaimsPrincipal(identity), null);
            }
            return (null, "Invalid mock token format.");
        }

        var secretKey = configuration["JwtSettings:SecretKey"] ?? DefaultSecretKey;
        var issuer = configuration["JwtSettings:Issuer"] ?? DefaultIssuer;
        var audience = configuration["JwtSettings:Audience"] ?? DefaultAudience;

        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true, // Strict expiration check
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        try
        {
            var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            return (principal, null);
        }
        catch (SecurityTokenExpiredException)
        {
            return (null, "Token has expired.");
        }
        catch (Exception ex)
        {
            return (null, $"Invalid token: {ex.Message}");
        }
    }
}
