using AITasker_Modular.Database;
using Microsoft.EntityFrameworkCore;

namespace AITasker_Modular.Modules.CategoryTagModule;

public class CategoryTagService : ICategoryTagService
{
    private readonly DataContext _context;

    public CategoryTagService(DataContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<AICategoryDomain>> GetCategoriesAsync()
    {
        return await _context.AICategoryDomains.AsNoTracking().ToListAsync();
    }

    public async Task<IReadOnlyList<Skill>> GetSkillsAsync()
    {
        return await _context.Skills.AsNoTracking().ToListAsync();
    }
}
