using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.JobModule; // Đọc thực thể Proposal, JobPost
using AITasker_Modular.Modules.ProjectModule; // Đọc thực thể Project của Hùng để làm trigger
using ProjectTask = AITasker_Modular.Modules.ProjectModule.Task;

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


        public async Task<Proposal> SubmitProposalAsync(CreateProposalDto dto)
        {
            var hasActiveProposal = await _context.Proposals
                .AnyAsync(x => x.JobPostId == dto.JobPostId 
                            && x.ExpertId == dto.ExpertId 
                            && !x.Status.Equals("Rejected", StringComparison.OrdinalIgnoreCase));

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
                Implementation = dto.Implementation.Trim(),
                Portfolio = dto.PortfolioUrl,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.Proposals.Add(proposal);
            await _context.SaveChangesAsync();
            return await _context.Proposals
                .Include(x => x.JobPost)
                .Include(x => x.Expert)
                .FirstAsync(x => x.Id == proposal.Id);
        }

        public async Task<IEnumerable<Proposal>> GetProposalsByJobPostIdAsync(Guid jobPostId)
        {
            return await _context.Proposals
                .Include(x => x.JobPost)
                .Include(x => x.Expert)
                .Where(x => x.JobPostId == jobPostId)
                .ToListAsync();
        }

        public async Task<IEnumerable<Proposal>> GetProposalsByExpertIdAsync(Guid expertId)
        {
            return await _context.Proposals
                .Include(x => x.JobPost)
                .Include(x => x.Expert)
                .Where(x => x.ExpertId == expertId)
                .ToListAsync();
        }

        public async Task<Proposal?> UpdateProposalStatusAsync(Guid proposalId, string status)
        {
            var proposal = await _context.Proposals
                .Include(p => p.JobPost)
                .Include(p => p.Expert)
                .FirstOrDefaultAsync(x => x.Id == proposalId);
                
            if (proposal == null) return null;

            string newStatus = status.Trim();
            proposal.Status = newStatus;

            if (newStatus.Equals("Accepted", StringComparison.OrdinalIgnoreCase))
            {
                await _projectService.CreateProjectFromProposalAsync(proposalId);
                // Reload proposal to return the modified status and dependencies
                proposal = await _context.Proposals
                    .Include(p => p.JobPost)
                    .Include(p => p.Expert)
                    .FirstOrDefaultAsync(x => x.Id == proposalId);
            }
            else
            {
                proposal.Status = newStatus;
                await _context.SaveChangesAsync();
            }

            return proposal;
        }


        public async Task<Proposal?> UpdateProposalAsync(Guid proposalId, UpdateProposalDto dto)
        {
            var proposal = await _context.Proposals
                .Include(p => p.JobPost)
                .Include(p => p.Expert)
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
                proposal.Implementation = dto.Implementation.Trim();

            if (dto.PortfolioUrl != null)
            {
                proposal.Portfolio = dto.PortfolioUrl;
            }

            await _context.SaveChangesAsync();
            return proposal;
        }
    }
}