namespace AITasker_Modular.Modules.UserModule.DTOs
{
    public class DashboardStatsDto
    {
        public int Posted { get; set; }
        public int Active { get; set; }
        public int Completed { get; set; }
        public int Proposals { get; set; }
        public decimal TotalSpent { get; set; }
    }
}
