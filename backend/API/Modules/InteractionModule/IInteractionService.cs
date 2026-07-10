using System.Collections.Generic;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.InteractionModule;

public interface IInteractionService
{
    Task<IReadOnlyList<Review>> GetReviewsAsync();
    Task<TransactionLog> RecordTransactionAsync(TransactionLog transactionLog);
    Task<IEnumerable<TransactionLog>> GetAllTransactionLogsAsync();
    Task<IEnumerable<TransactionLogWithTitleDto>> GetAllTransactionLogsWithTitleAsync();
}

public class TransactionLogWithTitleDto
{
    public System.Guid Id { get; set; }
    public System.Guid? ProjectId { get; set; }
    public string? ProjectTitle { get; set; }
    public System.Guid? SourceWalletId { get; set; }
    public System.Guid? DestinationWalletId { get; set; }
    public decimal Amount { get; set; }
    public string Type { get; set; } = string.Empty;
    public System.DateTime CreatedAt { get; set; }
}