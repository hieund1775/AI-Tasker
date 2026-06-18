using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using AITasker_Modular.Modules.JobModule; // For JobRequirementDto

namespace AITasker_Modular.Modules.JobPostModule
{
    public class CreateJobPostDto
    {
        [Required(ErrorMessage = "Title is required.")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Description is required.")]
        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Budget is required.")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Budget must be greater than 0.")]
        public decimal Budget { get; set; }

        public int Deadline { get; set; }

        public Guid? DomainId { get; set; }
        public Guid? SpecializationId { get; set; }
        public int DurationValue { get; set; }
        public string? DurationUnit { get; set; }

        [Required(ErrorMessage = "Client ID is required.")]
        public Guid ClientId { get; set; }

        public List<string>? SkillIds { get; set; }

        public List<JobRequirementDto>? Requirements { get; set; }
    }

    public class UpdateJobPostDto
    {
        [Required(ErrorMessage = "Title is required.")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Description is required.")]
        public string Description { get; set; } = string.Empty;

        [Required(ErrorMessage = "Budget is required.")]
        [Range(0.01, double.MaxValue, ErrorMessage = "Budget must be greater than 0.")]
        public decimal Budget { get; set; }

        public int Deadline { get; set; }

        public Guid? DomainId { get; set; }
        public Guid? SpecializationId { get; set; }
        public int DurationValue { get; set; }
        public string? DurationUnit { get; set; }

        public List<string>? SkillIds { get; set; }

        public List<JobRequirementDto>? Requirements { get; set; }
    }
}
