using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;

namespace API.Modules.AiModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class FileUploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        // Chỉ cho phép các định dạng đã hỗ trợ đọc ở AiChatService
        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".docx", ".txt"
        };

        // Giới hạn dung lượng file: 10MB
        private const long MaxFileSizeBytes = 10 * 1024 * 1024;

        public FileUploadController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpPost("upload")]
        [RequestSizeLimit(MaxFileSizeBytes)]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "Chưa có file nào được gửi lên." });

            if (file.Length > MaxFileSizeBytes)
                return BadRequest(new { error = "File vượt quá dung lượng cho phép (tối đa 10MB)." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(new { error = $"Định dạng file '{ext}' không được hỗ trợ. Chỉ chấp nhận .docx, .txt." });

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var uploadFolderRelative = Path.Combine("uploads", "chat-files");
            var uploadFolderFull = Path.Combine(webRoot, uploadFolderRelative);

            Directory.CreateDirectory(uploadFolderFull);

            // Đặt tên file duy nhất để tránh trùng/ghi đè
            var safeFileName = $"{Guid.NewGuid():N}{ext}";
            var fullSavePath = Path.Combine(uploadFolderFull, safeFileName);

            using (var stream = new FileStream(fullSavePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Trả về đường dẫn tương đối (dùng lại trong request send-session ở trường file_path)
            var relativePath = Path.Combine(uploadFolderRelative, safeFileName).Replace("\\", "/");

            return Ok(new { file_path = relativePath, original_name = file.FileName });
        }
    }
}