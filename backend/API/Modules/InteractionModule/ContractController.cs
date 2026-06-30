using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.InteractionModule
{
    [ApiController]
    [Route("api/[controller]")] // Ánh xạ chuẩn route /api/Contracts cho Frontend gọi dữ liệu
    public class ContractsController : ControllerBase
    {
        private readonly DataContext _context;

        public ContractsController(DataContext context)
        {
            _context = context;
        }

        // POST /api/Contracts -> Khởi tạo hợp đồng mới
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Contract contract)
        {
            contract.Id = Guid.NewGuid();
            contract.CreatedAt = DateTime.UtcNow;
            contract.Status = "Pending";
            
            _context.Contracts.Add(contract); 
            await _context.SaveChangesAsync();
            return Ok(contract);
        }

        // GET /api/Contracts/{id} -> Chi tiết hợp đồng theo Id
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var contract = await _context.Contracts.FindAsync(id);
            if (contract == null) return NotFound("Không tìm thấy hợp đồng số trên hệ thống.");
            return Ok(contract);
        }

        // GET /api/Contracts/project/{projectId} -> Lấy hợp đồng dựa theo Id của dự án cụ thể
        [HttpGet("project/{projectId}")]
        public async Task<IActionResult> GetByProject(Guid projectId)
        {
            var data = await _context.Contracts
                .Where(c => c.ProjectId == projectId)
                .ToListAsync();
            return Ok(data);
        }

        // GET /api/Contracts/expert/{expertId} -> Danh sách hợp đồng của một chuyên gia
        [HttpGet("expert/{expertId}")]
        public async Task<IActionResult> GetByExpert(Guid expertId)
        {
            var data = await _context.Contracts
                .Where(c => c.ExpertId == expertId)
                .ToListAsync();
            return Ok(data);
        }

        // PUT /api/Contracts/{id}/status?status=Active -> Ký kết và chuyển đổi trạng thái hiệu lực hợp đồng
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] string status)
        {
            var contract = await _context.Contracts.FindAsync(id);
            if (contract == null) return NotFound("Hợp đồng số không tồn tại hoặc đã bị hủy.");

            contract.Status = status;
            
            await _context.SaveChangesAsync();
            return Ok(contract);
        }
    }
}