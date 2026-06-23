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
                EstimatedDuration = dto.EstimatedDuration,
                Title = dto.Title.Trim(),
                Introduction = dto.Introduction.Trim(),
                Technical = dto.Technical.Trim(),
                Implementation = dto.Implementation.Trim(),
                Dependencies = dto.Dependencies.Trim(),
                Portfolio = dto.PortfolioUrl,
                AttachmentUrl = dto.AttachmentUrl,
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

        public async Task<string?> GenerateProposalMilestoneMarkdownAsync(Guid proposalId, int taskCount, int deadlineDays)
        {
            var proposal = await _context.Proposals
                .Include(p => p.JobPost)
                .FirstOrDefaultAsync(p => p.Id == proposalId);
                
            if (proposal == null) return null;

            var markdownBuilder = new StringBuilder();
            markdownBuilder.AppendLine($"# BẢN PHÂN RÃ TIẾN ĐỘ ĐỀ XUẤT (WBS) - DỰ ÁN: {proposal.JobPostTitle.ToUpper()}");
            markdownBuilder.AppendLine($"* **Mã số Proposal:** {proposal.Id}");
            markdownBuilder.AppendLine($"* **Chuyên gia thực hiện:** {proposal.ExpertName}");
            markdownBuilder.AppendLine($"* **Số lượng Task nhỏ được rã bởi AI:** {taskCount} Tasks");
            markdownBuilder.AppendLine($"* **Thời gian cam kết hoàn thành:** {deadlineDays} ngày");
            markdownBuilder.AppendLine("---");
            markdownBuilder.AppendLine("## CHI TIẾT CÁC MILESTONES NGHIỆM THU TÀI CHÍNH");

            int daysPerTask = Math.Max(1, deadlineDays / taskCount);
            for (int i = 1; i <= taskCount; i++)
            {
                markdownBuilder.AppendLine($"### 📍 Milestone {i}: Hoàn thiện cấu phần kỹ thuật mẫu {i}");
                markdownBuilder.AppendLine($"- **Nhiệm vụ chi tiết:** Thực thi logic giải pháp dựa trên đặc tả cấu trúc: {proposal.Technical}.");
                markdownBuilder.AppendLine($"- **Thời hạn xử lý:** Trong vòng {daysPerTask} ngày.");
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

        // ======================================================================
        // THAO TÁC CƠ HỌC: HIỆN THỰC ĐỘNG CƠ AI PHÂN RÃ HỆ THỐNG THÀNH CÁC USE CASE NHỎ
        // ======================================================================
        public async Task<object?> AnalyzeAndSplitUseCasesAsync(Guid jobPostId)
        {
            // Bốc thông tin JobPost từ DB ra để làm ngữ cảnh phân tích cho AI
            var job = await _context.JobPosts
                .Include(j => j.JobRequirements)
                .FirstOrDefaultAsync(x => x.Id == jobPostId);

            if (job == null) return null;

            // Động cơ bốc tách Use Case: Ưu tiên lấy từ JobRequirements có sẵn, 
            // nếu Client không nhập, AI sẽ tự động rã mẫu dựa theo Tiêu đề và Mô tả bài đăng.
            var useCases = new List<object>();

            if (job.JobRequirements != null && job.JobRequirements.Any())
            {
                foreach (var req in job.JobRequirements)
                {
                    useCases.Add(new {
                        UseCase = req.UseCaseName,
                        Description = req.Description,
                        Complexity = "Medium",
                        EstimatedHours = 12
                    });
                }
            }
            else
            {
                // Luồng AI suy luận giả định nếu bài đăng trống rỗng cấu phần con
                useCases.Add(new { UseCase = $"Phân tích yêu cầu nghiệp vụ cho: {job.Title}", Description = "Khảo sát hạ tầng, thiết kế cơ sở dữ liệu logic.", Complexity = "Low", EstimatedHours = 8 });
                useCases.Add(new { UseCase = "Xây dựng lõi API Core", Description = "Hiện thực hóa các cổng kết nối dữ liệu bảo mật.", Complexity = "High", EstimatedHours = 24 });
                useCases.Add(new { UseCase = "Kiểm chuẩn đơn vị (Unit Test)", Description = "Rà soát lỗ hổng bảo mật nghiêm trọng.", Complexity = "Medium", EstimatedHours = 10 });
            }

            // Trả về một cụm gói giải pháp hoàn chỉnh cho FE tự điền vào Form
            return new
            {
                JobPostId = job.Id,
                SuggestedTitle = $"Giải pháp toàn diện cho dự án: {job.Title}",
                SuggestedTechnical = $"Kiến trúc Microservices / Modular Monolith, tích hợp AI Engine, bảo mật Token mã hóa dữ liệu.",
                SuggestedImplementation = $"Chia làm {useCases.Count} giai đoạn chính độc lập để nghiệm thu cuốn chiếu.",
                SuggestedDependencies = "Yêu cầu Server Node chạy Docker, MySQL Server 8.0+, SSL Endpoint sạch.",
                SplitUseCases = useCases
            };
        }
    }
}