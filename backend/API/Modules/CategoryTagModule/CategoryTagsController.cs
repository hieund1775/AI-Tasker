using Microsoft.AspNetCore.Mvc;

namespace AITasker_Modular.Modules.CategoryTagModule;

[ApiController]
[Route("api/category-tags")]
public class CategoryTagsController : ControllerBase
{
    private readonly ICategoryTagService _service;

    public CategoryTagsController(ICategoryTagService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        return Ok(new { categories = await _service.GetCategoriesAsync(), skills = await _service.GetSkillsAsync() });
    }
}
