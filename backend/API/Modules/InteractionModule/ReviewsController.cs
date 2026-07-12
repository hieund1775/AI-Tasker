using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using AITasker_Modular.Modules.InteractionModule;

namespace AITasker_Modular.Modules.InteractionModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly DataContext _context;

        public ReviewsController(DataContext context)
        {
            _context = context;
        }

        /// <summary>
        /// POST /api/Reviews
        /// Tạo đánh giá dự án mới
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateReview([FromBody] CreateReviewDto dto)
        {
            if (dto == null) return BadRequest("Invalid review data.");
            if (dto.Rating < 1 || dto.Rating > 5) return BadRequest("Rating must be between 1 and 5 stars.");

            var project = await _context.Projects
                .Include(p => p.JobPost)
                .FirstOrDefaultAsync(p => p.Id == dto.ProjectId);

            if (project == null) return NotFound("Project not found.");

            // Kiểm tra xem dự án đã được đánh giá chưa
            var existingReview = await _context.Reviews.AnyAsync(r => r.ProjectId == dto.ProjectId);
            if (existingReview) return BadRequest("This project has already been reviewed.");

            var review = new Review
            {
                Id = Guid.NewGuid(),
                ProjectId = dto.ProjectId,
                CreatedById = project.ClientId,
                TargetUserId = project.ExpertId,
                Rating = dto.Rating,
                Comment = dto.Comment,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = review.Id,
                projectId = review.ProjectId,
                rating = review.Rating,
                comment = review.Comment,
                createdAt = review.CreatedAt
            });
        }

        /// <summary>
        /// GET /api/Reviews/project/{projectId}
        /// Lấy đánh giá theo Project ID
        /// </summary>
        [HttpGet("project/{projectId:guid}")]
        public async Task<IActionResult> GetReviewByProject(Guid projectId)
        {
            var review = await _context.Reviews
                .FirstOrDefaultAsync(r => r.ProjectId == projectId);

            if (review == null) return NotFound("Review not found for this project.");

            return Ok(new
            {
                id = review.Id,
                projectId = review.ProjectId,
                rating = review.Rating,
                comment = review.Comment,
                createdAt = review.CreatedAt
            });
        }

        /// <summary>
        /// GET /api/Reviews/expert/{expertId}
        /// Lấy trung bình đánh giá và danh sách đánh giá của Expert
        /// </summary>
        [HttpGet("expert/{expertId:guid}")]
        public async Task<IActionResult> GetExpertReviews(Guid expertId)
        {
            var reviews = await _context.Reviews
                .Include(r => r.Project)
                    .ThenInclude(p => p!.JobPost)
                .Include(r => r.CreatedBy)
                .Where(r => r.TargetUserId == expertId)
                .ToListAsync();

            var totalReviews = reviews.Count;
            var averageRating = totalReviews > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0;

            var reviewsList = reviews.Select(r => new
            {
                projectId = r.ProjectId,
                projectTitle = r.Project?.JobPost?.Title ?? "Dự án không tên",
                clientName = r.CreatedBy?.FullName ?? "Khách hàng ẩn danh",
                rating = r.Rating,
                comment = r.Comment ?? string.Empty,
                createdAt = r.CreatedAt
            }).ToList();

            return Ok(new
            {
                averageRating,
                totalReviews,
                reviews = reviewsList
            });
        }
    }

    public class CreateReviewDto
    {
        public Guid ProjectId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }
}
