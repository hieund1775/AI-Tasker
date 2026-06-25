using AITasker_Modular.Modules.CategoryTagModule;
using AITasker_Modular.Modules.DisputeModule;
using AITasker_Modular.Modules.ChatModule;
using AITasker_Modular.Modules.InteractionModule;
using AITasker_Modular.Modules.JobModule;
using AITasker_Modular.Modules.ProjectModule;
using AITasker_Modular.Modules.UserModule;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using ProjectTask = AITasker_Modular.Modules.ProjectModule.Task;

namespace AITasker_Modular.Database;

public class DataContext : DbContext
{
    public DataContext(DbContextOptions<DataContext> options) : base(options) { }

    public DbSet<ApplicationUser> Users { get; set; }
    public DbSet<ExpertProfile> ExpertProfiles { get; set; }
    public DbSet<Domain> Domains { get; set; }
    public DbSet<Specialization> Specializations { get; set; }
    public DbSet<Wallet> Wallets { get; set; }
    public DbSet<Skill> Skills { get; set; }
    public DbSet<JobPost> JobPosts { get; set; }
    public DbSet<JobRequirement> JobRequirements { get; set; }
    public DbSet<Proposal> Proposals { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<ProjectTask> ProjectTasks { get; set; } 
    public DbSet<MiniTask> MiniTasks { get; set; }
    public DbSet<Conversation> Conversations { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<Review> Reviews { get; set; }
    public DbSet<TransactionLog> TransactionLogs { get; set; }
    public DbSet<DomainExpertProfile> DomainExpertProfiles { get; set; }
    public DbSet<ExpertProfileSkill> ExpertProfileSkills { get; set; }
    public DbSet<JobPostSkill> JobPostSkills { get; set; }
    public DbSet<ProjectSkill> ProjectSkills { get; set; }
    public DbSet<ProposalAiChat> ProposalAiChats { get; set; }
    
    // Đăng ký các bảng phân hệ mới vào DbContext
    public DbSet<Dispute> Disputes { get; set; }
    public DbSet<Report> Reports { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ApplicationUser>().HasKey(x => x.Id);
        modelBuilder.Entity<ExpertProfile>().HasKey(x => x.UserId);
        modelBuilder.Entity<Wallet>().HasKey(x => x.UserId);
        modelBuilder.Entity<Domain>().HasKey(x => x.Id);
        modelBuilder.Entity<Specialization>().HasKey(x => x.Id);
        modelBuilder.Entity<Skill>().HasKey(x => x.Id);
        modelBuilder.Entity<JobPost>().HasKey(x => x.Id);
        modelBuilder.Entity<JobRequirement>().HasKey(x => x.Id);
        modelBuilder.Entity<Proposal>().HasKey(x => x.Id);
        modelBuilder.Entity<Project>().HasKey(x => x.Id);
        modelBuilder.Entity<ProjectTask>().HasKey(x => x.Id);
        modelBuilder.Entity<MiniTask>().HasKey(x => x.Id);
        modelBuilder.Entity<Conversation>().HasKey(x => x.Id);
        modelBuilder.Entity<Message>().HasKey(x => x.Id);
        modelBuilder.Entity<Review>().HasKey(x => x.Id);
        modelBuilder.Entity<TransactionLog>().HasKey(x => x.Id);
        modelBuilder.Entity<ProposalAiChat>().HasKey(x => x.Id);
        
        // Khởi tạo khóa chính vật lý
        modelBuilder.Entity<Dispute>().HasKey(x => x.Id);
        modelBuilder.Entity<Report>().HasKey(x => x.Id);

        modelBuilder.Entity<DomainExpertProfile>().HasKey(x => new { x.DomainId, x.ExpertProfilesUserId });

        modelBuilder.Entity<ExpertProfileSkill>()
            .HasKey(x => new { x.ExpertProfilesUserId, x.SkillsId });
        modelBuilder.Entity<ExpertProfileSkill>()
            .HasOne(x => x.ExpertProfile)
            .WithMany(x => x.ExpertProfileSkills)
            .HasForeignKey(x => x.ExpertProfilesUserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ExpertProfileSkill>()
            .HasOne(x => x.Skill)
            .WithMany(x => x.ExpertProfileSkills)
            .HasForeignKey(x => x.SkillsId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<JobPostSkill>()
            .HasKey(x => new { x.JobPostsId, x.SkillsId });
        modelBuilder.Entity<JobPostSkill>()
            .HasOne(x => x.JobPost)
            .WithMany(x => x.JobPostSkills)
            .HasForeignKey(x => x.JobPostsId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<JobPostSkill>()
            .HasOne(x => x.Skill)
            .WithMany(x => x.JobPostSkills)
            .HasForeignKey(x => x.SkillsId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProjectSkill>()
            .HasKey(x => new { x.ProjectsId, x.SkillsId });
        modelBuilder.Entity<ProjectSkill>()
            .HasOne(x => x.Project)
            .WithMany(x => x.ProjectSkills)
            .HasForeignKey(x => x.ProjectsId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ProjectSkill>()
            .HasOne(x => x.Skill)
            .WithMany(x => x.ProjectSkills)
            .HasForeignKey(x => x.SkillsId)
            .OnDelete(DeleteBehavior.Cascade);

        foreach (var property in modelBuilder.Model.GetEntityTypes().SelectMany(t => t.GetProperties()))
        {
            if (property.ClrType == typeof(decimal) || property.ClrType == typeof(decimal?))
            {
                property.SetColumnType("decimal(18,2)");
            }
            if ((property.Name.EndsWith("Id") || property.Name == "Id") && 
                property.ClrType != typeof(Guid) && property.ClrType != typeof(Guid?))
            {
                property.SetColumnType("varchar(255)");
            }
        }

        foreach (var relationship in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
        {
            relationship.DeleteBehavior = DeleteBehavior.NoAction;
        }

        modelBuilder.Entity<ExpertProfile>().HasOne<ApplicationUser>().WithOne().HasForeignKey<ExpertProfile>(x => x.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Wallet>().HasOne<ApplicationUser>().WithOne().HasForeignKey<Wallet>(x => x.UserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<JobPost>().HasOne(x => x.ClientUser).WithMany().HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Conversation>().HasOne(x => x.Client).WithMany().HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Conversation>().HasOne(x => x.Expert).WithMany().HasForeignKey(x => x.ExpertId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Project>().HasOne(x => x.Client).WithMany().HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Project>().HasOne(x => x.Expert).WithMany().HasForeignKey(x => x.ExpertId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Project>().HasOne(x => x.JobPost).WithMany().HasForeignKey(x => x.JobPostId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Proposal>().HasOne(x => x.Expert).WithMany().HasForeignKey(x => x.ExpertId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Proposal>().HasIndex(x => new { x.JobPostId, x.ExpertId }).IsUnique();
        modelBuilder.Entity<Review>().HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Review>().HasOne(x => x.TargetUser).WithMany().HasForeignKey(x => x.TargetUserId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TransactionLog>().HasOne(x => x.SourceWallet).WithMany().HasForeignKey(x => x.SourceWalletId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<TransactionLog>().HasOne(x => x.DestinationWallet).WithMany().HasForeignKey(x => x.DestinationWalletId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ProjectTask>().HasOne(x => x.FeedbackSender).WithMany().HasForeignKey(x => x.FeedbackSenderId).OnDelete(DeleteBehavior.NoAction);
        
        modelBuilder.Entity<ProposalAiChat>().HasOne(x => x.JobPost).WithMany().HasForeignKey(x => x.JobPostId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<ProposalAiChat>().HasOne(x => x.Expert).WithMany().HasForeignKey(x => x.ExpertId).OnDelete(DeleteBehavior.NoAction);

        // --- CẤU HÌNH KHÓA NGOẠI LIÊN KẾT CHO PHÂN HỆ DISPUTEMODULE ĐỘC LẬP ---
        modelBuilder.Entity<Dispute>().HasOne(x => x.Project).WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Dispute>().HasOne(x => x.HandlerStaff).WithMany().HasForeignKey(x => x.HandlerStaffId).OnDelete(DeleteBehavior.NoAction);
        
        modelBuilder.Entity<Report>().HasOne(x => x.Project).WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Report>().HasOne(x => x.Reporter).WithMany().HasForeignKey(x => x.ReporterId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<Report>().HasOne(x => x.HandlerStaff).WithMany().HasForeignKey(x => x.HandlerStaffId).OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<Specialization>().HasOne(x => x.Domain).WithMany(x => x.Specializations).HasForeignKey(x => x.DomainId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<DomainExpertProfile>().HasOne(x => x.Domain).WithMany().HasForeignKey(x => x.DomainId).OnDelete(DeleteBehavior.NoAction);
        modelBuilder.Entity<DomainExpertProfile>().HasOne(x => x.ExpertProfile).WithMany().HasForeignKey(x => x.ExpertProfilesUserId).OnDelete(DeleteBehavior.NoAction);
    }
}

public class ProposalAiChat
{
    public Guid Id { get; set; }
    public Guid JobPostId { get; set; }
    public Guid ExpertId { get; set; }
    public string UserMessage { get; set; } = string.Empty;
    public string AiResponse { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    [System.Text.Json.Serialization.JsonIgnore]
    public JobPost? JobPost { get; set; }

    [System.Text.Json.Serialization.JsonIgnore]
    public ApplicationUser? Expert { get; set; }
}