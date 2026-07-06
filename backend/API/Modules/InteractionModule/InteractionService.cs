using AITasker_Modular.Database;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

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
}