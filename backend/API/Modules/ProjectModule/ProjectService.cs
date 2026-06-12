using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Database;

namespace AITasker_Modular.Modules.ProjectModule
{
    public class ProjectService : IProjectService
    {
        private readonly DataContext _context;

        public ProjectService(DataContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Project>> GetProjectsByClientAsync(Guid clientId)
        {
            return await _context.Projects
                .Where(x => x.ClientId == clientId)
                .Include(x => x.JobPost)
                .ToListAsync();
        }

        public async Task<IEnumerable<Project>> GetProjectsByExpertAsync(Guid expertId)
        {
            return await _context.Projects
                .Where(x => x.ExpertId == expertId)
                .Include(x => x.JobPost)
                .ToListAsync();
        }

        public async Task<Project?> UpdateProjectStatusAsync(Guid projectId, string status)
        {
            var project = await _context.Projects.FirstOrDefaultAsync(x => x.Id == projectId);
            if (project == null) return null;

            project.Status = status.Trim();
            await _context.SaveChangesAsync();
            return project;
        }

        public async Task<Project?> SubmitProjectLinkAsync(Guid projectId, string projectLink)
        {
            var project = await _context.Projects.FirstOrDefaultAsync(x => x.Id == projectId);
            if (project == null) return null;

            project.ProjectLink = projectLink;
            project.Status = "Submitted"; // Chuyển sang trạng thái chờ Client duyệt nghiệm thu
            
            await _context.SaveChangesAsync();
            return project;
        }
    }
}