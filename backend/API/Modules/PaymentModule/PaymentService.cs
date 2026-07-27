using System;
using System.Threading.Tasks;

namespace AITasker.API.Modules.PaymentModule
{
    public class PaymentService
    {
        public async Task<bool> ProcessDeposit(string orderId, decimal amount)
        {
            Console.WriteLine("==================================================");
            Console.WriteLine("[SERVER LOG] NHẬN TÍN HIỆU TỪ APP BANKING!");
            Console.WriteLine($"[INFO] Mã đơn hàng: {orderId}");
            Console.WriteLine($"[INFO] Số tiền: {amount} VND");
            Console.WriteLine($"[SUCCESS] Chạy lệnh SQL giả lập: UPDATE Users SET Balance = Balance + {amount}");
            Console.WriteLine("==================================================");
            return true;
        }
    }
}
