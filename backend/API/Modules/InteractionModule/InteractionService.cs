using AITasker_Modular.Database;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AITasker_Modular.Modules.ProjectModule;

namespace AITasker_Modular.Modules.InteractionModule;

public class InteractionService : IInteractionService
{
    private readonly DataContext _context;

    public InteractionService(DataContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<Review>> GetReviewsAsync()
    {
        return await _context.Reviews.ToListAsync();
    }

    public async Task<TransactionLog> RecordTransactionAsync(TransactionLog transactionLog)
    {
        transactionLog.Id = Guid.NewGuid();
        transactionLog.CreatedAt = DateTime.UtcNow;
        _context.TransactionLogs.Add(transactionLog);
        await _context.SaveChangesAsync();
        return transactionLog;
    }

    public async Task<IEnumerable<TransactionLog>> GetAllTransactionLogsAsync()
    {
        return await _context.TransactionLogs
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    /// <summary>
    /// [FIX] Trả về lịch sử giao dịch kèm theo tên dự án (ProjectTitle) để Frontend hiển thị ngay.
    /// </summary>
    public async Task<IEnumerable<TransactionLogWithTitleDto>> GetAllTransactionLogsWithTitleAsync()
    {
        var logs = await _context.TransactionLogs
            .Include(t => t.Project)
                .ThenInclude(p => p != null ? p.JobPost : null)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return logs.Select(t => new TransactionLogWithTitleDto
        {
            Id = t.Id,
            ProjectId = t.ProjectId,
            ProjectTitle = t.Project?.JobPost?.Title,
            SourceWalletId = t.SourceWalletId,
            DestinationWalletId = t.DestinationWalletId,
            Amount = t.Amount,
            Type = t.Type,
            CreatedAt = t.CreatedAt
        });
    }
}