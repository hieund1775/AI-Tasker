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

    public async Task<IReadOnlyList<Domain>> GetCategoriesAsync()
    {
        return await _context.Domains.Include(d => d.Specializations).AsNoTracking().ToListAsync();
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

    public async Task<Domain> CreateCategoryAsync(string name)
    {
        var category = new Domain
        {
            Id = Guid.NewGuid(),
            Name = name.Trim()
        };
        _context.Domains.Add(category);
        await _context.SaveChangesAsync();
        return category;
    }

    public async Task<bool> DeleteCategoryAsync(Guid id)
    {
        var category = await _context.Domains.FindAsync(id);
        if (category == null)
            return false;

        _context.Domains.Remove(category);
        await _context.SaveChangesAsync();
        return true;
    }

    // Specializations
    public async Task<IReadOnlyList<Specialization>> GetSpecializationsAsync()
    {
        return await _context.Specializations.AsNoTracking().ToListAsync();
    }

    public async Task<IReadOnlyList<Specialization>> GetSpecializationsByDomainIdAsync(Guid domainId)
    {
        return await _context.Specializations
            .Where(x => x.DomainId == domainId)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<Specialization> CreateSpecializationAsync(string name, Guid domainId)
    {
        var spec = new Specialization
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            DomainId = domainId
        };
        _context.Specializations.Add(spec);
        await _context.SaveChangesAsync();
        return spec;
    }

    public async Task<bool> DeleteSpecializationAsync(Guid id)
    {
        var spec = await _context.Specializations.FindAsync(id);
        if (spec == null)
            return false;

        _context.Specializations.Remove(spec);
        await _context.SaveChangesAsync();
        return true;
    }
}
