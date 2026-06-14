using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.JobModule; // Đọc thực thể Proposal, JobPost
using AITasker_Modular.Modules.ProjectModule; // Đọc thực thể Project của Hùng để làm trigger

namespace AITasker_Modular.Modules.ProposalModule
{
    public class ProposalService : IProposalService
    {
        private readonly DataContext _context;

        public ProposalService(DataContext context)
        {
            _context = context;
        }

        public async Task<Proposal> SubmitProposalAsync(CreateProposalDto dto)
        {
            var alreadyExists = await _context.Proposals
                .AnyAsync(x => x.JobPostId == dto.JobPostId && x.ExpertId == dto.ExpertId);

            if (alreadyExists)
            {
                throw new InvalidOperationException("Mỗi chuyên gia chỉ có thể gửi một hồ sơ (proposal) cho một công việc (jobpost).");
            }

            var proposal = new Proposal
            {
                Id = Guid.NewGuid(),
                JobPostId = dto.JobPostId,
                ExpertId = dto.ExpertId,
                BidAmount = dto.BidAmount,
                CoverLetter = dto.CoverLetter,
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
                var isProjectExists = await _context.Projects.AnyAsync(p => p.JobPostId == proposal.JobPostId);
                
                if (!isProjectExists && proposal.JobPost != null)
                {
                    var newProject = new Project
                    {
                        Id = Guid.NewGuid(),
                        JobPostId = proposal.JobPostId,
                        ClientId = proposal.JobPost.ClientId,
                        ExpertId = proposal.ExpertId,
                        EscrowBalance = proposal.BidAmount,
                        Status = "In Progress",
                        StartDate = DateTime.UtcNow,
                        EndDate = DateTime.UtcNow.AddDays(30)
                    };

                    _context.Projects.Add(newProject);
                    proposal.JobPost.Status = "In Progress";
                }
            }

            await _context.SaveChangesAsync();
            return proposal;
        }
    }
}