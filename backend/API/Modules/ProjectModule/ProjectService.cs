using AITasker_Modular.Database;
using Microsoft.EntityFrameworkCore;

namespace AITasker_Modular.Modules.ProjectModule;

public class ProjectService : IProjectService
{
    private readonly DataContext _context;

    public ProjectService(DataContext context)
    {
        _context = context;
    }

    public async System.Threading.Tasks.Task<bool> ApproveMiniTaskAsync(string miniTaskId)
    {
        if (!Guid.TryParse(miniTaskId, out var miniTaskGuid))
            return false;

        var miniTask = await _context.MiniTasks.FindAsync(miniTaskGuid);
        if (miniTask == null)
            return false;

        miniTask.IsCompleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async System.Threading.Tasks.Task<IReadOnlyList<Project>> GetProjectsAsync()
    {
        return await _context.Projects
            .Include(p => p.Client)
            .Include(p => p.Expert)
            .Include(p => p.JobPost)
            .Include(p => p.ProjectSkills)
                .ThenInclude(ps => ps.Skill)
            .AsNoTracking()
            .ToListAsync();
    }

    public async System.Threading.Tasks.Task<string> SaveFeedbackAsync(string miniTaskId, string feedback)
    {
        if (!Guid.TryParse(miniTaskId, out var miniTaskGuid))
            return "Invalid mini task ID format.";

        var miniTask = await _context.MiniTasks.FindAsync(miniTaskGuid);
        if (miniTask == null)
            return "Mini task not found.";

        miniTask.FeedbackContent = feedback;
        await _context.SaveChangesAsync();
        return $"Saved feedback for {miniTaskId}: {feedback}";
    }

    public async System.Threading.Tasks.Task<Project> UpdateProgressAsync(string projectId, string status)
    {
        if (!Guid.TryParse(projectId, out var projectGuid))
            throw new ArgumentException("Invalid project ID format.", nameof(projectId));

        var project = await _context.Projects.FindAsync(projectGuid);
        if (project == null)
            throw new KeyNotFoundException($"Project with ID {projectId} not found.");

        project.Status = status;
        await _context.SaveChangesAsync();
        return project;
    }
}
