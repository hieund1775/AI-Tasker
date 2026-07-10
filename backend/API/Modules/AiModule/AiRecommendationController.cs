using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace AITasker_Modular.Modules.AiModule;

[ApiController]
[Route("api/ai")]
public class AiRecommendationController : ControllerBase
{
    private readonly AiRecommendationService _recommendationService;

    public AiRecommendationController(AiRecommendationService recommendationService)
    {
        _recommendationService = recommendationService;
    }

    /// <summary>
    /// Gợi ý danh sách chuyên gia phù hợp cho dự án dựa trên JobPostId hoặc thông tin bản nháp.
    /// </summary>
    /// <param name="dto">Thông tin yêu cầu gợi ý</param>
    /// <returns>Danh sách chuyên gia xếp hạng theo mức độ phù hợp</returns>
    [HttpPost("recommend-experts")]
    public async Task<IActionResult> RecommendExperts([FromBody] ExpertRecommendationRequestDto dto)
    {
        if (!dto.JobPostId.HasValue && (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Description)))
        {
            return BadRequest(new { error = "Vui lòng cung cấp JobPostId hoặc nhập đầy đủ tiêu đề (Title) và mô tả (Description) của công việc." });
        }

        try
        {
            var recommendations = await _recommendationService.RecommendExpertsAsync(dto);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Lỗi hệ thống khi phân tích gợi ý: {ex.Message}" });
        }
    }
}
