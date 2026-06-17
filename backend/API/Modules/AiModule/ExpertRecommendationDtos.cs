using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AITasker_Modular.Modules.AiModule;

public class ExpertRecommendationRequestDto
{
    public Guid? JobPostId { get; set; }

    // Draft job post fields (optional, used if JobPostId is null)
    public string? Title { get; set; }
    public string? Description { get; set; }
    public List<string>? SkillIds { get; set; }
    public decimal? Budget { get; set; }
    public int? Deadline { get; set; }
}

public class ExpertRecommendationResultDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    
    // Expert profile fields
    public string JobTitle { get; set; } = string.Empty;
    public string Major { get; set; } = string.Empty;
    public string? Certifications { get; set; }
    public string Bio { get; set; } = string.Empty;
    public string? PortfolioUrls { get; set; }
    public double SuccessRate { get; set; }
    public decimal ReputationCredit { get; set; }
    public List<string> Skills { get; set; } = new();

    // AI suggestion scoring & explanation
    public int MatchScore { get; set; }
    public string Explanation { get; set; } = string.Empty;
    public List<string> MatchedSkills { get; set; } = new();
}

public class GeminiRecommendationItem
{
    [JsonPropertyName("expertId")]
    public string ExpertId { get; set; } = string.Empty;

    [JsonPropertyName("matchScore")]
    public int MatchScore { get; set; }

    [JsonPropertyName("explanation")]
    public string Explanation { get; set; } = string.Empty;

    [JsonPropertyName("matchedSkills")]
    public List<string> MatchedSkills { get; set; } = new();
}
