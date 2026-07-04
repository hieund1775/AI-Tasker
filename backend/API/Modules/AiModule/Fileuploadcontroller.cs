using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;

namespace API.Modules.AiModule
{
    [ApiController]
    [Route("api/[controller]")]
    public class FileUploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        // Chi cho phep cac dinh dang da ho tro doc o AiChatService
        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".docx", ".txt"
        };

        // Gioi han dung luong file: 10MB
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
                return BadRequest(new { error = "Chua co file nao duoc gui len." });

            if (file.Length > MaxFileSizeBytes)
                return BadRequest(new { error = "File vuot qua dung luong cho phep (toi da 10MB)." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return BadRequest(new { error = $"Dinh dang file '{ext}' khong duoc ho tro. Chi chap nhan .docx, .txt." });

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var uploadFolderRelative = Path.Combine("uploads", "chat-files");
            var uploadFolderFull = Path.Combine(webRoot, uploadFolderRelative);

            Directory.CreateDirectory(uploadFolderFull);

            // Dat ten file duy nhat de tranh trung/ghi de
            var safeFileName = $"{Guid.NewGuid():N}{ext}";
            var fullSavePath = Path.Combine(uploadFolderFull, safeFileName);

            using (var stream = new FileStream(fullSavePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Tra ve duong dan tuong doi (dung lai trong request send-session o field file_path)
            var relativePath = Path.Combine(uploadFolderRelative, safeFileName).Replace("\\", "/");

            return Ok(new { file_path = relativePath, original_name = file.FileName });
        }
    }
}