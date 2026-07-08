using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.JobModule;
using AITasker_Modular.Modules.ProjectModule;

namespace AITasker_Modular.Modules.ProposalModule
{
    public class ProposalService : IProposalService
    {
        private readonly DataContext _context;
        private readonly IProjectService _projectService;

        public ProposalService(DataContext context, IProjectService projectService)
        {
            _context = context;
            _projectService = projectService;
        }

        private class ProposalTaskJsonDto
        {
            public string Title { get; set; } = string.Empty;
            public List<ProposalMiniTaskJsonDto> MiniTasks { get; set; } = new();
        }

        private class ProposalMiniTaskJsonDto
        {
            public string Title { get; set; } = string.Empty;
            public int Duration { get; set; }
        }

        private void SaveProposalWbs(Guid proposalId, string implementationInput)
        {
            var tasks = new List<ProposalTask>();
            string trimmed = implementationInput?.Trim() ?? string.Empty;

            if (trimmed.StartsWith("["))
            {
                try
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<List<ProposalTaskJsonDto>>(trimmed);
                    if (parsed != null)
                    {
                        foreach (var tDto in parsed)
                        {
                            var task = new ProposalTask
                            {
                                Id = Guid.NewGuid(),
                                ProposalId = proposalId,
                                Title = tDto.Title
                            };
                            task.ProposalMiniTasks = tDto.MiniTasks.Select(mDto => new ProposalMiniTask
                            {
                                Id = Guid.NewGuid(),
                                ProposalTaskId = task.Id,
                                Title = mDto.Title,
                                Duration = mDto.Duration
                            }).ToList();
                            tasks.Add(task);
                        }
                    }
                }
                catch
                {
                    // Fallback to single text task on error
                    var task = new ProposalTask
                    {
                        Id = Guid.NewGuid(),
                        ProposalId = proposalId,
                        Title = trimmed
                    };
                    tasks.Add(task);
                }
            }
            else if (!string.IsNullOrWhiteSpace(trimmed))
            {
                var task = new ProposalTask
                {
                    Id = Guid.NewGuid(),
                    ProposalId = proposalId,
                    Title = trimmed
                };
                tasks.Add(task);
            }

            if (tasks.Any())
            {
                _context.ProposalTasks.AddRange(tasks);
            }
        }

        private string GetProposalWbsJson(Proposal proposal)
        {
            if (proposal.ProposalTasks == null || !proposal.ProposalTasks.Any()) return string.Empty;
            var list = proposal.ProposalTasks.Select(t => new
            {
                Title = t.Title,
                Duration = t.Duration,
                MiniTasks = t.ProposalMiniTasks != null
                    ? t.ProposalMiniTasks.Select(m => new
                    {
                        Title = m.Title,
                        Duration = m.Duration
                    }).ToList()
                    : new()
            }).ToList();
            return System.Text.Json.JsonSerializer.Serialize(list);
        }

        public async Task<Proposal> SubmitProposalAsync(CreateProposalDto dto)
        {
            var hasActiveProposal = await _context.Proposals
                .AnyAsync(x => x.JobPostId == dto.JobPostId 
                            && x.ExpertId == dto.ExpertId 
                            && x.Status.ToLower() != "rejected"
                            && x.Status.ToLower() != "declined");

            if (hasActiveProposal)
            {
                throw new InvalidOperationException("Mỗi chuyên gia chỉ có thể có một hồ sơ (proposal) hoạt động cho một công việc. Bạn phải đợi hồ sơ trước đó bị từ chối (Rejected) mới có thể gửi lại hồ sơ mới.");
            }

            var proposal = new Proposal
            {
                Id = Guid.NewGuid(),
                JobPostId = dto.JobPostId,
                ExpertId = dto.ExpertId,
                BidAmount = dto.BidAmount,
                EstimatedDuration = dto.EstimatedDuration,
                Introduction = dto.Introduction.Trim(),
                Portfolio = dto.PortfolioUrl,
                AttachmentUrl = dto.AttachmentUrl,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.Proposals.Add(proposal);
            SaveProposalWbs(proposal.Id, dto.Implementation);
            await _context.SaveChangesAsync();

            var result = await _context.Proposals
                .Include(x => x.JobPost)
                .Include(x => x.Expert)
                .Include(x => x.ProposalTasks)
                .ThenInclude(t => t.ProposalMiniTasks)
                .FirstAsync(x => x.Id == proposal.Id);

            result.Implementation = GetProposalWbsJson(result);
            return result;
        }

        public async Task<IEnumerable<Proposal>> GetProposalsByJobPostIdAsync(Guid jobPostId)
        {
            var proposals = await _context.Proposals
                .Include(x => x.JobPost)
                .Include(x => x.Expert)
                .Include(x => x.ProposalTasks)
                .ThenInclude(t => t.ProposalMiniTasks)
                .Where(x => x.JobPostId == jobPostId)
                .ToListAsync();

            foreach (var proposal in proposals)
            {
                if (proposal.Status.Equals("Accepted", StringComparison.OrdinalIgnoreCase))
                {
                    proposal.Implementation = GetProposalWbsJson(proposal);
                }
                else
                {
                    proposal.Implementation = string.Empty; // ÃƒÂ¡Ã‚ÂºÃ‚Â¨n giÃƒÂ¡Ã‚ÂºÃ‚Â£i phÃƒÆ’Ã‚Â¡p kÃƒÂ¡Ã‚Â»Ã‚Â¹ thuÃƒÂ¡Ã‚ÂºÃ‚Â­t Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚Â»Ã¢â‚¬Ëœi vÃƒÂ¡Ã‚Â»Ã¢â‚¬Âºi Client nÃƒÂ¡Ã‚ÂºÃ‚Â¿u chÃƒâ€ Ã‚Â°a Accepted
                }
            }

            return proposals;
        }

        public async Task<IEnumerable<Proposal>> GetProposalsByExpertIdAsync(Guid expertId)
        {
            var proposals = await _context.Proposals
                .Include(x => x.JobPost)
                .Include(x => x.Expert)
                .Include(x => x.ProposalTasks)
                .ThenInclude(t => t.ProposalMiniTasks)
                .Where(x => x.ExpertId == expertId)
                .ToListAsync();

            foreach (var proposal in proposals)
            {
                proposal.Implementation = GetProposalWbsJson(proposal); // Expert luÃƒÆ’Ã‚Â´n Ãƒâ€žÃ¢â‚¬ËœÃƒâ€ Ã‚Â°ÃƒÂ¡Ã‚Â»Ã‚Â£c xem giÃƒÂ¡Ã‚ÂºÃ‚Â£i phÃƒÆ’Ã‚Â¡p cÃƒÂ¡Ã‚Â»Ã‚Â§a mÃƒÆ’Ã‚Â¬nh
            }

            return proposals;
        }

        public async Task<Proposal?> UpdateProposalStatusAsync(Guid proposalId, string status)
        {
            var proposal = await _context.Proposals
                .Include(p => p.JobPost)
                .Include(p => p.Expert)
                .Include(p => p.ProposalTasks)
                .ThenInclude(t => t.ProposalMiniTasks)
                .FirstOrDefaultAsync(x => x.Id == proposalId);
                
            if (proposal == null) return null;

            string newStatus = status.Trim();
            proposal.Status = newStatus;

            if (newStatus.Equals("Accepted", StringComparison.OrdinalIgnoreCase))
            {
                // [FIX Data Consistency] Tu dong tu choi cac Proposal khac dang Pending cho cung JobPost
                var otherPendingProposals = await _context.Proposals
                    .Where(p => p.JobPostId == proposal.JobPostId && p.Id != proposalId && p.Status.ToLower() == "pending")
                    .ToListAsync();
                foreach (var op in otherPendingProposals)
                {
                    op.Status = "Rejected";
                }
                if (otherPendingProposals.Any())
                {
                    await _context.SaveChangesAsync();
                }

                await _projectService.CreateProjectFromProposalAsync(proposalId);
                // TÃƒÂ¡Ã‚ÂºÃ‚Â£i lÃƒÂ¡Ã‚ÂºÃ‚Â¡i Ãƒâ€žÃ¢â‚¬ËœÃƒÂ¡Ã‚Â»Ã†â€™ lÃƒÂ¡Ã‚ÂºÃ‚Â¥y thÃƒÆ’Ã‚Â´ng tin cÃƒÂ¡Ã‚ÂºÃ‚Â­p nhÃƒÂ¡Ã‚ÂºÃ‚Â­t
                proposal = await _context.Proposals
                    .Include(p => p.JobPost)
                    .Include(p => p.Expert)
                    .Include(p => p.ProposalTasks)
                    .ThenInclude(t => t.ProposalMiniTasks)
                    .FirstOrDefaultAsync(x => x.Id == proposalId);
            }
            else
            {
                await _context.SaveChangesAsync();
            }

            if (proposal != null)
            {
                proposal.Implementation = GetProposalWbsJson(proposal);
            }
            return proposal;
        }

        public async Task<Proposal?> UpdateProposalAsync(Guid proposalId, UpdateProposalDto dto)
        {
            var proposal = await _context.Proposals
                .Include(p => p.JobPost)
                .Include(p => p.Expert)
                .Include(p => p.ProposalTasks)
                .ThenInclude(t => t.ProposalMiniTasks)
                .FirstOrDefaultAsync(x => x.Id == proposalId);

            if (proposal == null) return null;

            if (!proposal.Status.Equals("Pending", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Chỉ có thể chỉnh sửa hồ sơ đấu thầu khi ở trạng thái Chờ duyệt (Pending).");
            }

            proposal.BidAmount = dto.BidAmount;
            proposal.EstimatedDuration = dto.EstimatedDuration;
            
            if (!string.IsNullOrWhiteSpace(dto.Introduction))
                proposal.Introduction = dto.Introduction.Trim();
                
            if (!string.IsNullOrWhiteSpace(dto.Implementation))
            {
                // XÃƒÆ’Ã‚Â³a WBS cÃƒâ€¦Ã‚Â©
                var oldTasks = await _context.ProposalTasks.Where(t => t.ProposalId == proposalId).ToListAsync();
                _context.ProposalTasks.RemoveRange(oldTasks);

                SaveProposalWbs(proposalId, dto.Implementation);
            }

            if (dto.PortfolioUrl != null)
            {
                proposal.Portfolio = dto.PortfolioUrl;
            }

            await _context.SaveChangesAsync();

            // reload
            var result = await _context.Proposals
                .Include(p => p.JobPost)
                .Include(p => p.Expert)
                .Include(p => p.ProposalTasks)
                .ThenInclude(t => t.ProposalMiniTasks)
                .FirstOrDefaultAsync(x => x.Id == proposalId);

            if (result != null)
            {
                result.Implementation = GetProposalWbsJson(result);
            }
            return result;
        }
        public async Task<string?> GenerateProposalMilestoneMarkdownAsync(Guid proposalId, int taskCount, int deadlineDays)
        {
            var proposal = await _context.Proposals
                .Include(p => p.JobPost)
                .Include(p => p.ProposalTasks)
                .ThenInclude(t => t.ProposalMiniTasks)
                .FirstOrDefaultAsync(p => p.Id == proposalId);

            if (proposal == null) return null;
            proposal.Implementation = GetProposalWbsJson(proposal);

            var markdownBuilder = new StringBuilder();
            markdownBuilder.AppendLine($"# Báº¢N PHÃ‚N RÃƒ TIáº¾N Äá»˜ Äá»€ XUáº¤T (WBS) - Dá»° ÃN: {proposal.JobPostTitle.ToUpper()}");
            markdownBuilder.AppendLine($"* **MÃ£ sá»‘ Proposal:** {proposal.Id}");
            markdownBuilder.AppendLine($"* **ChuyÃªn gia thá»±c hiá»‡n:** {proposal.ExpertName}");
            markdownBuilder.AppendLine($"* **Sá»‘ lÆ°á»£ng Task nhá» Ä‘Æ°á»£c rÃ£ bá»Ÿi AI:** {taskCount} Tasks");
            markdownBuilder.AppendLine($"* **Thá»i háº¡n cam káº¿t hoÃ n thÃ nh (Expert dá»± kiáº¿n):** {deadlineDays} ngÃ y ká»ƒ tá»« ngÃ y kÃ½ káº¿t");
            markdownBuilder.AppendLine("---");
            markdownBuilder.AppendLine("## DANH SÃCH MILESTONES NGHIá»†M THU TÃ€I CHÃNH");
            markdownBuilder.AppendLine();

            int daysPerTask = Math.Max(1, deadlineDays / taskCount);
            for (int i = 1; i <= taskCount; i++)
            {
                markdownBuilder.AppendLine($"### ðŸ“ Milestone {i}: HoÃ n thiá»‡n cáº¥u pháº§n ká»¹ thuáº­t máº«u {i}");
                markdownBuilder.AppendLine($"- **Nhiá»‡m vá»¥ chi tiáº¿t:** Thá»±c thi logic giáº£i phÃ¡p dá»±a trÃªn Ä‘áº·c táº£ cáº¥u trÃºc: {proposal.Implementation}.");
                markdownBuilder.AppendLine($"- **Thá»i gian xá»­ lÃ½ dá»± kiáº¿n:** {daysPerTask} ngÃ y.");
                markdownBuilder.AppendLine();
            }

            markdownBuilder.AppendLine("---");
            markdownBuilder.AppendLine("_TÃ i liá»‡u cáº¥u trÃºc nÃ y phá»¥c vá»¥ má»¥c Ä‘Ã­ch kÃ½ káº¿t há»£p Ä‘á»“ng kÃ½ quá»¹ báº£o máº­t trÃªn há»‡ thá»‘ng AITasker._");

            var rootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot", "milestones");
            if (!Directory.Exists(rootPath)) Directory.CreateDirectory(rootPath);

            var fileName = $"Milestone_Proposal_{proposalId}.md";
            await File.WriteAllTextAsync(Path.Combine(rootPath, fileName), markdownBuilder.ToString(), Encoding.UTF8);

            var fileUrl = $"/milestones/{fileName}";

            proposal.Portfolio = fileUrl;
            await _context.SaveChangesAsync();

            return fileUrl;
        }

    }
}
