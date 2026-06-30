using System;
using System.Threading.Tasks;

namespace AITasker_Modular.Modules.AdminModule
{
    public interface IAdminService
    {
        Task<Guid> CreateStaffAsync(string username, string password, string fullName, Guid ownerId);
        Task<bool> BanStaffAsync(Guid targetStaffId, Guid ownerId);
        Task<object> GetOwnerDashboardAsync(Guid ownerId);
    }
}