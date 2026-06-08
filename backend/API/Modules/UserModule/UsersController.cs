using AITasker_Modular.Modules.UserModule.DTOs;
using Microsoft.AspNetCore.Mvc;

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

        var result = await _userService.RegisterAsync(dto.Email, dto.Password, dto.FullName, dto.Role);
        return result.Contains("already exists", StringComparison.OrdinalIgnoreCase)
            ? BadRequest(new { message = result })
            : Ok(new { message = result });
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
    public async Task<IActionResult> GetAllUsers([FromQuery] string requesterId)
    {
        if (string.IsNullOrEmpty(requesterId))
            return BadRequest(new { message = "Requester ID is required." });

        var (users, error) = await _userService.GetAllUsersAsync(requesterId);
        if (error != null)
        {
            if (error.Equals("Unauthorized", StringComparison.OrdinalIgnoreCase))
                return StatusCode(403, new { message = "Only Admin or Owner can access this resource." });
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
}
