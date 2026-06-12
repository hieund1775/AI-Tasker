using Microsoft.AspNetCore.Mvc;
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Helpers;
using AITasker_Modular.Modules.CategoryTagModule.DTOs;

namespace AITasker_Modular.Modules.CategoryTagModule;

[ApiController]
[Route("api/category-tags")]
public class CategoryTagsController : ControllerBase
{
    private readonly ICategoryTagService _service;
    private readonly IUserService _userService;

    public CategoryTagsController(ICategoryTagService service, IUserService userService)
    {
        _service = service;
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        return Ok(new { categories = await _service.GetCategoriesAsync(), skills = await _service.GetSkillsAsync() });
    }

    [HttpPost("skills")]
    public async Task<IActionResult> CreateSkill([FromBody] CreateSkillDto dto)
    {
        var (_, errorResult) = await this.ValidateAdminOrOwnerAsync(_userService);
        if (errorResult != null)
            return errorResult;

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Skill name cannot be empty." });

        var skill = await _service.CreateSkillAsync(dto.Name);
        return CreatedAtAction(nameof(Get), new { id = skill.Id }, skill);
    }

    [HttpGet("skills")]
    public async Task<IActionResult> GetSkills()
    {
        return Ok(await _service.GetSkillsAsync());
    }

    [HttpDelete("skills/{id}")]
    public async Task<IActionResult> DeleteSkill(Guid id)
    {
        var (_, errorResult) = await this.ValidateAdminOrOwnerAsync(_userService);
        if (errorResult != null)
            return errorResult;

        var success = await _service.DeleteSkillAsync(id);
        if (!success)
            return NotFound(new { message = "Skill not found." });

        return Ok(new { message = "Skill deleted successfully." });
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        return Ok(await _service.GetCategoriesAsync());
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateAICategoryDomainDto dto)
    {
        var (_, errorResult) = await this.ValidateAdminOrOwnerAsync(_userService);
        if (errorResult != null)
            return errorResult;

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Category name cannot be empty." });

        var category = await _service.CreateCategoryAsync(dto.Name);
        return CreatedAtAction(nameof(Get), new { id = category.Id }, category);
    }

    [HttpDelete("categories/{id}")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        var (_, errorResult) = await this.ValidateAdminOrOwnerAsync(_userService);
        if (errorResult != null)
            return errorResult;

        var success = await _service.DeleteCategoryAsync(id);
        if (!success)
            return NotFound(new { message = "Category not found." });

        return Ok(new { message = "Category deleted successfully." });
    }
}
