namespace AITasker_Modular.Modules.InteractionModule;

public class InteractionService : IInteractionService
{
    public Task<IReadOnlyList<Review>> GetReviewsAsync()
    {
        return Task.FromResult<IReadOnlyList<Review>>(new List<Review>());
    }

    public Task<TransactionLog> RecordTransactionAsync(TransactionLog transactionLog)
    {
        transactionLog.Id = Guid.NewGuid();
        return Task.FromResult(transactionLog);
    }
}
