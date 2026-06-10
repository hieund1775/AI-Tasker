using System;
using System.Collections.Generic;

namespace AITasker_Modular.Modules.UserModule.DTOs;

public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UserWalletDto
{
    public decimal Balance { get; set; }
}

public class UserExpertProfileDto
{
    public string JobTitle { get; set; } = string.Empty;
    public string Major { get; set; } = string.Empty;
    public string? Certifications { get; set; }
    public string Bio { get; set; } = string.Empty;
    public string? PortfolioUrls { get; set; }
    public decimal ReputationCredit { get; set; }
    public string? Location { get; set; }
    public double SuccessRate { get; set; }
}

public class UserJobPostDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Budget { get; set; }
    public int Deadline { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class UserProposalDto
{
    public string Id { get; set; } = string.Empty;
    public string JobPostId { get; set; } = string.Empty;
    public decimal BidAmount { get; set; }
    public string CoverLetter { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class UserProjectDto
{
    public string Id { get; set; } = string.Empty;
    public string? JobPostId { get; set; }
    public string ClientId { get; set; } = string.Empty;
    public string ExpertId { get; set; } = string.Empty;
    public decimal EscrowBalance { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? ProjectLink { get; set; }
}

public class UserDetailDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }

    public UserWalletDto? Wallet { get; set; }
    public UserExpertProfileDto? ExpertProfile { get; set; }
    public List<UserJobPostDto> JobPosts { get; set; } = new();
    public List<UserProposalDto> Proposals { get; set; } = new();
    public List<UserProjectDto> Projects { get; set; } = new();
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public UserDto User { get; set; } = null!;
}
