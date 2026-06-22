using System;
using Microsoft.AspNetCore.Http;

namespace AITasker_Modular.Modules.ProposalModule
{
    public class UpdateProposalDto
    {
        public decimal BidAmount { get; set; }
        public int EstimatedDuration { get; set; }
        public string Introduction { get; set; } = string.Empty;
        public string Implementation { get; set; } = string.Empty;
        public IFormFile? Portfolio { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        public string? PortfolioUrl { get; set; }
    }
}
