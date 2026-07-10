namespace AITasker_Modular.Modules.CategoryTagModule.DTOs;

public class CreateDomainDto
{
    public string Name { get; set; } = string.Empty;
}

public class CreateSpecializationDto
{
    public string Name { get; set; } = string.Empty;
    public string DomainId { get; set; } = string.Empty;
}
