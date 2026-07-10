namespace AITasker_Modular.Modules.CategoryTagModule;

public interface ICategoryTagService
{
    Task<IReadOnlyList<Domain>> GetCategoriesAsync();
    Task<IReadOnlyList<Skill>> GetSkillsAsync();
    Task<Domain> CreateCategoryAsync(string name);
    Task<bool> DeleteCategoryAsync(Guid id);
    Task<Skill> CreateSkillAsync(string name);
    Task<bool> DeleteSkillAsync(Guid id);

    // Specializations
    Task<IReadOnlyList<Specialization>> GetSpecializationsAsync();
    Task<IReadOnlyList<Specialization>> GetSpecializationsByDomainIdAsync(Guid domainId);
    Task<Specialization> CreateSpecializationAsync(string name, Guid domainId);
    Task<bool> DeleteSpecializationAsync(Guid id);
}
