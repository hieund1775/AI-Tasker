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
        var (_, errorResult) = await this.ValidateStaffOrOwnerAsync(_userService);
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
        var (_, errorResult) = await this.ValidateStaffOrOwnerAsync(_userService);
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
    public async Task<IActionResult> CreateCategory([FromBody] CreateDomainDto dto)
    {
        var (_, errorResult) = await this.ValidateStaffOrOwnerAsync(_userService);
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
        var (_, errorResult) = await this.ValidateStaffOrOwnerAsync(_userService);
        if (errorResult != null)
            return errorResult;

        var success = await _service.DeleteCategoryAsync(id);
        if (!success)
            return NotFound(new { message = "Category not found." });

        return Ok(new { message = "Category deleted successfully." });
    }

    [HttpGet("specializations")]
    public async Task<IActionResult> GetSpecializations()
    {
        return Ok(await _service.GetSpecializationsAsync());
    }

    [HttpGet("specializations/domain/{domainId:guid}")]
    public async Task<IActionResult> GetSpecializationsByDomain(Guid domainId)
    {
        return Ok(await _service.GetSpecializationsByDomainIdAsync(domainId));
    }

    [HttpPost("specializations")]
    public async Task<IActionResult> CreateSpecialization([FromBody] CreateSpecializationDto dto)
    {
        var (_, errorResult) = await this.ValidateStaffOrOwnerAsync(_userService);
        if (errorResult != null)
            return errorResult;

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Specialization name cannot be empty." });

        if (!Guid.TryParse(dto.DomainId, out var domainGuid))
            return BadRequest(new { message = "Invalid DomainId format." });

        var spec = await _service.CreateSpecializationAsync(dto.Name, domainGuid);
        return CreatedAtAction(nameof(Get), new { id = spec.Id }, spec);
    }

    [HttpDelete("specializations/{id:guid}")]
    public async Task<IActionResult> DeleteSpecialization(Guid id)
    {
        var (_, errorResult) = await this.ValidateStaffOrOwnerAsync(_userService);
        if (errorResult != null)
            return errorResult;

        var success = await _service.DeleteSpecializationAsync(id);
        if (!success)
            return NotFound(new { message = "Specialization not found." });

        return Ok(new { message = "Specialization deleted successfully." });
    }
}
