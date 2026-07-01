using System;
using System.Threading.Tasks;

namespace AITasker.API.Modules.PaymentModule
{
    public class PaymentService
    {
        public async Task<bool> ProcessDeposit(string orderId, decimal amount)
        {
            Console.WriteLine("==================================================");
            Console.WriteLine("[SERVER LOG] NH?N TÍN HI?U T? APP BANKING!");
            Console.WriteLine($"[INFO] Ma don hang: {orderId}");
            Console.WriteLine($"[INFO] So tien: {amount} VND");
            Console.WriteLine($"[SUCCESS] Chay lenh SQL gia lap: UPDATE Users SET Balance = Balance + {amount}");
            Console.WriteLine("==================================================");
            return true;
        }
    }
}
