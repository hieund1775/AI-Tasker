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
        if (transactionLog == null)
            throw new ArgumentNullException(nameof(transactionLog), "Dữ liệu giao dịch không hợp lệ.");

        if (transactionLog.Amount < 0)
            throw new ArgumentException("Số tiền giao dịch không được nhỏ hơn 0.");

        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var type = transactionLog.Type?.Trim() ?? string.Empty;

                if (type.Equals("Deposit", StringComparison.OrdinalIgnoreCase) ||
                    type.Equals("ManualDeposit", StringComparison.OrdinalIgnoreCase) ||
                    type.Equals("Manual_Deposit", StringComparison.OrdinalIgnoreCase))
                {
                    if (transactionLog.DestinationWalletId == null || transactionLog.DestinationWalletId == Guid.Empty)
                        throw new ArgumentException("Giao dịch nạp tiền yêu cầu ví nhận (DestinationWalletId).");

                    var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == transactionLog.DestinationWalletId.Value);
                    if (wallet == null)
                        throw new KeyNotFoundException($"Không tìm thấy ví nhận tiền (ID: {transactionLog.DestinationWalletId.Value}).");

                    wallet.Balance += transactionLog.Amount;
                }
                else if (type.Equals("Withdraw", StringComparison.OrdinalIgnoreCase))
                {
                    if (transactionLog.SourceWalletId == null || transactionLog.SourceWalletId == Guid.Empty)
                        throw new ArgumentException("Giao dịch rút tiền yêu cầu ví chuyển (SourceWalletId).");

                    var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == transactionLog.SourceWalletId.Value);
                    if (wallet == null)
                        throw new KeyNotFoundException($"Không tìm thấy ví chuyển tiền (ID: {transactionLog.SourceWalletId.Value}).");

                    if (wallet.Balance < transactionLog.Amount)
                        throw new InvalidOperationException($"Số dư không đủ để thực hiện rút tiền (Yêu cầu: {transactionLog.Amount:N0} VND, Có: {wallet.Balance:N0} VND).");

                    wallet.Balance -= transactionLog.Amount;
                }
                else if (type.Equals("EscrowDeposit", StringComparison.OrdinalIgnoreCase) ||
                         type.Equals("Escrow_Deposit", StringComparison.OrdinalIgnoreCase))
                {
                    if (transactionLog.SourceWalletId == null || transactionLog.SourceWalletId == Guid.Empty)
                        throw new ArgumentException("Giao dịch ký quỹ yêu cầu ví chuyển (SourceWalletId).");

                    if (transactionLog.ProjectId == null || transactionLog.ProjectId == Guid.Empty)
                        throw new ArgumentException("Giao dịch ký quỹ yêu cầu mã dự án (ProjectId).");

                    var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == transactionLog.SourceWalletId.Value);
                    if (wallet == null)
                        throw new KeyNotFoundException($"Không tìm thấy ví chuyển tiền (ID: {transactionLog.SourceWalletId.Value}).");

                    var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == transactionLog.ProjectId.Value);
                    if (project == null)
                        throw new KeyNotFoundException($"Không tìm thấy dự án (ID: {transactionLog.ProjectId.Value}).");

                    if (wallet.Balance < transactionLog.Amount)
                        throw new InvalidOperationException($"Số dư ví không đủ để ký quỹ dự án (Yêu cầu: {transactionLog.Amount:N0} VND, Có: {wallet.Balance:N0} VND).");

                    wallet.Balance -= transactionLog.Amount;
                    wallet.EscrowBalance += transactionLog.Amount;
                    project.EscrowBalance += transactionLog.Amount;
                }
                else if (type.Equals("ReleasePayment", StringComparison.OrdinalIgnoreCase) ||
                         type.Equals("EscrowRelease", StringComparison.OrdinalIgnoreCase) ||
                         type.Equals("Escrow_Release", StringComparison.OrdinalIgnoreCase))
                {
                    if (transactionLog.SourceWalletId == null || transactionLog.SourceWalletId == Guid.Empty)
                        throw new ArgumentException("Giao dịch giải ngân yêu cầu ví chuyển của Client (SourceWalletId).");

                    if (transactionLog.DestinationWalletId == null || transactionLog.DestinationWalletId == Guid.Empty)
                        throw new ArgumentException("Giao dịch giải ngân yêu cầu ví nhận của Expert (DestinationWalletId).");

                    if (transactionLog.ProjectId == null || transactionLog.ProjectId == Guid.Empty)
                        throw new ArgumentException("Giao dịch giải ngân yêu cầu mã dự án (ProjectId).");

                    var clientWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == transactionLog.SourceWalletId.Value);
                    if (clientWallet == null)
                        throw new KeyNotFoundException($"Không tìm thấy ví của Client (ID: {transactionLog.SourceWalletId.Value}).");

                    var expertWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == transactionLog.DestinationWalletId.Value);
                    if (expertWallet == null)
                        throw new KeyNotFoundException($"Không tìm thấy ví của Expert (ID: {transactionLog.DestinationWalletId.Value}).");

                    var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == transactionLog.ProjectId.Value);
                    if (project == null)
                        throw new KeyNotFoundException($"Không tìm thấy dự án (ID: {transactionLog.ProjectId.Value}).");

                    decimal fee = transactionLog.PlatformFee;
                    decimal netAmount = transactionLog.Amount; 
                    decimal totalEscrowToDeduct = netAmount + fee; 

                    if (clientWallet.EscrowBalance < totalEscrowToDeduct)
                        throw new InvalidOperationException($"Số dư ký quỹ không đủ để thực hiện giải ngân (Yêu cầu: {totalEscrowToDeduct:N0} VND, Có: {clientWallet.EscrowBalance:N0} VND).");

                    clientWallet.EscrowBalance = Math.Max(0, clientWallet.EscrowBalance - totalEscrowToDeduct);
                    expertWallet.Balance += netAmount;
                    expertWallet.TotalEarned += netAmount;

                    project.EscrowBalance = Math.Max(0, project.EscrowBalance - totalEscrowToDeduct);

                    if (fee > 0)
                    {
                        var systemWallet = await _context.SystemWallets.FirstOrDefaultAsync(w => w.Id == Guid.Parse("11111111-1111-1111-1111-111111111111"));
                        if (systemWallet != null)
                        {
                            systemWallet.TotalBalance += fee;
                            systemWallet.UpdatedAt = DateTime.UtcNow;
                        }

                        _context.SystemTransactionLogs.Add(new SystemTransactionLog
                        {
                            Id = Guid.NewGuid(),
                            ProjectId = project.Id,
                            Amount = fee,
                            Type = "PlatformFee",
                            Description = $"Phí dịch vụ giải ngân từ giao dịch {transactionLog.Id}.",
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                else if (type.Equals("EscrowRefund", StringComparison.OrdinalIgnoreCase) ||
                         type.Equals("Escrow_Refund", StringComparison.OrdinalIgnoreCase))
                {
                    if (transactionLog.SourceWalletId == null || transactionLog.SourceWalletId == Guid.Empty)
                        throw new ArgumentException("Giao dịch hoàn tiền yêu cầu ví chuyển (SourceWalletId).");

                    if (transactionLog.DestinationWalletId == null || transactionLog.DestinationWalletId == Guid.Empty)
                        throw new ArgumentException("Giao dịch hoàn tiền yêu cầu ví nhận (DestinationWalletId).");

                    if (transactionLog.ProjectId == null || transactionLog.ProjectId == Guid.Empty)
                        throw new ArgumentException("Giao dịch hoàn tiền yêu cầu mã dự án (ProjectId).");

                    var clientWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == transactionLog.SourceWalletId.Value);
                    if (clientWallet == null)
                        throw new KeyNotFoundException($"Không tìm thấy ví Client ký quỹ (ID: {transactionLog.SourceWalletId.Value}).");

                    var destWallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == transactionLog.DestinationWalletId.Value);
                    if (destWallet == null)
                        throw new KeyNotFoundException($"Không tìm thấy ví nhận tiền hoàn trả (ID: {transactionLog.DestinationWalletId.Value}).");

                    var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == transactionLog.ProjectId.Value);
                    if (project == null)
                        throw new KeyNotFoundException($"Không tìm thấy dự án (ID: {transactionLog.ProjectId.Value}).");

                    if (clientWallet.EscrowBalance < transactionLog.Amount)
                        throw new InvalidOperationException($"Số dư ký quỹ không đủ để thực hiện hoàn tiền (Yêu cầu: {transactionLog.Amount:N0} VND, Có: {clientWallet.EscrowBalance:N0} VND).");

                    clientWallet.EscrowBalance = Math.Max(0, clientWallet.EscrowBalance - transactionLog.Amount);
                    destWallet.Balance += transactionLog.Amount;
                    project.EscrowBalance = Math.Max(0, project.EscrowBalance - transactionLog.Amount);
                }
                else if (type.Equals("PlatformFee", StringComparison.OrdinalIgnoreCase) ||
                         type.Equals("Platform_Fee", StringComparison.OrdinalIgnoreCase))
                {
                    var systemWallet = await _context.SystemWallets.FirstOrDefaultAsync(w => w.Id == Guid.Parse("11111111-1111-1111-1111-111111111111"));
                    if (systemWallet != null)
                    {
                        systemWallet.TotalBalance += transactionLog.Amount;
                        systemWallet.UpdatedAt = DateTime.UtcNow;
                    }
                }

                transactionLog.Id = Guid.NewGuid();
                transactionLog.CreatedAt = DateTime.UtcNow;
                transactionLog.Status = "Success";

                _context.TransactionLogs.Add(transactionLog);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return transactionLog;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
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
                .ThenInclude(p => p!.JobPost)
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