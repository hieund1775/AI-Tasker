namespace AITasker_Modular.Modules.CategoryTagModule;

public interface ICategoryTagService
{
    Task<IReadOnlyList<AICategoryDomain>> GetCategoriesAsync();
    Task<IReadOnlyList<Skill>> GetSkillsAsync();
    Task<Skill> CreateSkillAsync(string name);
    Task<bool> DeleteSkillAsync(Guid id);
    Task<AICategoryDomain> CreateCategoryAsync(string name);
    Task<bool> DeleteCategoryAsync(Guid id);
}
