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
            var existingProposal = await _context.Proposals
                .Include(x => x.ProposalTasks)
                .ThenInclude(t => t.ProposalMiniTasks)
                .FirstOrDefaultAsync(x => x.JobPostId == dto.JobPostId && x.ExpertId == dto.ExpertId);

            if (existingProposal != null)
            {
                var status = (existingProposal.Status ?? "").ToLower();
                if (status == "pending" || status == "accepted")
                {
                    throw new InvalidOperationException("You already have an active or accepted proposal for this job post. You can submit a new proposal after your previous proposal is rejected or declined.");
                }

                // Previous proposal was rejected, declined, or withdrawn!
                // Reuse existing proposal record to satisfy DB Unique Index (JobPostId + ExpertId) seamlessly
                existingProposal.BidAmount = dto.BidAmount;
                existingProposal.EstimatedDuration = dto.EstimatedDuration;
                existingProposal.Introduction = dto.Introduction.Trim();
                if (!string.IsNullOrWhiteSpace(dto.PortfolioUrl)) existingProposal.Portfolio = dto.PortfolioUrl;
                if (!string.IsNullOrWhiteSpace(dto.AttachmentUrl)) existingProposal.AttachmentUrl = dto.AttachmentUrl;
                existingProposal.Status = "Pending";
                existingProposal.CreatedAt = DateTime.UtcNow;

                if (existingProposal.ProposalTasks != null && existingProposal.ProposalTasks.Any())
                {
                    _context.ProposalTasks.RemoveRange(existingProposal.ProposalTasks);
                }

                SaveProposalWbs(existingProposal.Id, dto.Implementation);
                await _context.SaveChangesAsync();

                var res = await _context.Proposals
                    .Include(x => x.JobPost)
                    .Include(x => x.Expert)
                    .Include(x => x.ProposalTasks)
                    .ThenInclude(t => t.ProposalMiniTasks)
                    .FirstAsync(x => x.Id == existingProposal.Id);

                res.Implementation = GetProposalWbsJson(res);
                return res;
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
                    proposal.Implementation = string.Empty; // ẩn giải pháp kỹ thuật đối với Client nếu chưa Accepted
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
                proposal.Implementation = GetProposalWbsJson(proposal); // Expert luôn được xem giải pháp của mình
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
                // Tải lại để lấy thông tin cập nhật
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
                throw new InvalidOperationException("Proposals can only be modified when in Pending status.");
            }

            proposal.BidAmount = dto.BidAmount;
            proposal.EstimatedDuration = dto.EstimatedDuration;
            
            if (!string.IsNullOrWhiteSpace(dto.Introduction))
                proposal.Introduction = dto.Introduction.Trim();
                
            if (!string.IsNullOrWhiteSpace(dto.Implementation))
            {
                // Xóa WBS cũ
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
            markdownBuilder.AppendLine($"# BẢN PHÂN RÃ TIẾN ĐỘ ĐỀ XUẤT (WBS) - DỰ ÁN: {proposal.JobPostTitle.ToUpper()}");
            markdownBuilder.AppendLine($"* **Mã số Proposal:** {proposal.Id}");
            markdownBuilder.AppendLine($"* **Chuyên gia thực hiện:** {proposal.ExpertName}");
            markdownBuilder.AppendLine($"* **Số lượng Task nhỏ được rã bởi AI:** {taskCount} Tasks");
            markdownBuilder.AppendLine($"* **Thời hạn cam kết hoàn thành (Expert dự kiến):** {deadlineDays} ngày kể từ ngày ký kết");
            markdownBuilder.AppendLine("---");
            markdownBuilder.AppendLine("## DANH SÁCH MILESTONES NGHIỆM THU TÀI CHÍNH");
            markdownBuilder.AppendLine();

            int daysPerTask = Math.Max(1, deadlineDays / taskCount);
            for (int i = 1; i <= taskCount; i++)
            {
                markdownBuilder.AppendLine($"### 📌 Milestone {i}: Hoàn thiện cấu phần kỹ thuật mẫu {i}");
                markdownBuilder.AppendLine($"- **Nhiệm vụ chi tiết:** Thực thi logic giải pháp dựa trên đặc tả cấu trúc: {proposal.Implementation}.");
                markdownBuilder.AppendLine($"- **Thời gian xử lý dự kiến:** {daysPerTask} ngày.");
                markdownBuilder.AppendLine();
            }

            markdownBuilder.AppendLine("---");
            markdownBuilder.AppendLine("_Tài liệu cấu trúc này phục vụ mục đích ký kết hợp đồng ký quỹ bảo mật trên hệ thống AITasker._");

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
