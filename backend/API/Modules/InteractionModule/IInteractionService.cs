namespace AITasker_Modular.Modules.InteractionModule;

public interface IInteractionService
{
    Task<IReadOnlyList<Review>> GetReviewsAsync();
    Task<TransactionLog> RecordTransactionAsync(TransactionLog transactionLog);
}
