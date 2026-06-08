namespace AITasker_Modular.Modules.CategoryTagModule;

public interface ICategoryTagService
{
    Task<IReadOnlyList<AICategoryDomain>> GetCategoriesAsync();
    Task<IReadOnlyList<Skill>> GetSkillsAsync();
}
