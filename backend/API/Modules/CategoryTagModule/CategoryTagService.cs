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

    public async Task<Skill> CreateSkillAsync(string name)
    {
        var skill = new Skill
        {
            Id = Guid.NewGuid(),
            Name = name.Trim()
        };
        _context.Skills.Add(skill);
        await _context.SaveChangesAsync();
        return skill;
    }


    public async Task<bool> DeleteSkillAsync(Guid id)
    {
        var skill = await _context.Skills.FindAsync(id);
        if (skill == null)
            return false;

        _context.Skills.Remove(skill);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<AICategoryDomain> CreateCategoryAsync(string name)
    {
        var category = new AICategoryDomain
        {
            Id = Guid.NewGuid(),
            Name = name.Trim()
        };
        _context.AICategoryDomains.Add(category);
        await _context.SaveChangesAsync();
        return category;
    }

    public async Task<bool> DeleteCategoryAsync(Guid id)
    {
        var category = await _context.AICategoryDomains.FindAsync(id);
        if (category == null)
            return false;

        _context.AICategoryDomains.Remove(category);
        await _context.SaveChangesAsync();
        return true;
    }
}
