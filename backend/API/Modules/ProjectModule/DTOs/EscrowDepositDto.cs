using System;

namespace AITasker_Modular.Modules.ProjectModule.DTOs;

public class EscrowDepositDto
{
    public Guid ClientId { get; set; }
    public decimal Amount { get; set; } // 0 = tự lấy theo EscrowBalance của Project
}
