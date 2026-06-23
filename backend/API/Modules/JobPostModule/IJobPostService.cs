using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http; // ── ĐẢM BẢO THÊM DÒNG NÀY ĐỂ NHẬN DIỆN IFormFile
using AITasker_Modular.Modules.JobModule; // <── Gọi thực thể lai chuẩn từ JobModule

namespace AITasker_Modular.Modules.JobPostModule
{
    public interface IJobPostService
    {
        Task<IEnumerable<JobPost>> GetFilteredJobsAsync(string? search, decimal? minBudget, decimal? maxBudget, string? status, Guid? categoryDomainId);
        Task<IReadOnlyList<JobPost>> GetJobsAsync();
        Task<JobPost?> GetJobPostByIdAsync(Guid id);
        Task<JobPost> CreateJobAsync(CreateJobPostDto jobPostDto);
        Task<JobPost?> UpdateJobPostAsync(Guid id, UpdateJobPostDto jobPostDto);
        Task<IEnumerable<JobPost>> GetJobPostsByClientIdAsync(Guid clientId);
        
        // THAO TÁC CƠ HỌC: ĐỤC THÊM CHỮ KÝ HÀM MỚI THEO Ý THẦY BỘ MÔN
        Task<string?> UploadAttachmentAsync(IFormFile file);
        Task<string?> GenerateMilestoneMarkdownAsync(Guid proposalId, int taskCount, int deadlineDays);
    }
}