-- =======================================================================
-- SCRIPT KHỞI TẠO VÀ ĐỒNG BỘ DATABASE DỰ ÁN AI-TASKER (MỚI NHẤT 2026)
-- =======================================================================

CREATE DATABASE [AITaskerDB];
GO

USE [AITaskerDB];
GO

-- 1. Khởi tạo bảng lưu vết lịch sử Migration của hệ thống
IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

-- 2. Khởi tạo các bảng độc lập (Tầng core gốc)
CREATE TABLE [AICategoryDomains] (
    [Id] uniqueidentifier NOT NULL,
    [Name] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_AICategoryDomains] PRIMARY KEY ([Id])
);

CREATE TABLE [Skills] (
    [Id] uniqueidentifier NOT NULL,
    [Name] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_Skills] PRIMARY KEY ([Id])
);

CREATE TABLE [Users] (
    [Id] uniqueidentifier NOT NULL,
    [Email] nvarchar(450) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [FullName] nvarchar(max) NOT NULL,
    [Role] nvarchar(max) NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [AvatarUrl] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
);

-- 3. Khởi tạo các bảng phụ thuộc tầng 1 (Chứa khóa ngoại trỏ về Users/Domains)
CREATE TABLE [ExpertProfiles] (
    [UserId] uniqueidentifier NOT NULL,
    [JobTitle] nvarchar(max) NOT NULL,
    [Major] nvarchar(max) NOT NULL,
    [Certifications] nvarchar(max) NULL,
    [Bio] nvarchar(max) NOT NULL,
    [PortfolioUrls] nvarchar(max) NULL,
    [ReputationCredit] decimal(3,2) NOT NULL,
    [Location] nvarchar(max) NULL,
    [SuccessRate] float NOT NULL,
    CONSTRAINT [PK_ExpertProfiles] PRIMARY KEY ([UserId]),
    CONSTRAINT [FK_ExpertProfiles_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [JobPosts] (
    [Id] uniqueidentifier NOT NULL,
    [ClientId] uniqueidentifier NOT NULL,
    [Title] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [Budget] decimal(18,2) NOT NULL,
    [Deadline] datetime2 NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [AICategoryDomainId] uniqueidentifier NULL,
    CONSTRAINT [PK_JobPosts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_JobPosts_AICategoryDomains_AICategoryDomainId] FOREIGN KEY ([AICategoryDomainId]) REFERENCES [AICategoryDomains] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_JobPosts_Users_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);

CREATE TABLE [Wallets] (
    [UserId] uniqueidentifier NOT NULL,
    [Balance] decimal(18,2) NOT NULL,
    CONSTRAINT [PK_Wallets] PRIMARY KEY ([UserId]),
    CONSTRAINT [FK_Wallets_Users_UserId] REFERENCES [Users] ([Id]) ON DELETE CASCADE
);

-- 4. Khởi tạo các bảng liên kết Many-to-Many và luồng làm việc (Workflow)
CREATE TABLE [Conversations] (
    [Id] uniqueidentifier NOT NULL,
    [OriginJobPostId] uniqueidentifier NULL,
    [ClientId] uniqueidentifier NOT NULL,
    [ExpertId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Conversations] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Conversations_JobPosts_OriginJobPostId] FOREIGN KEY ([OriginJobPostId]) REFERENCES [JobPosts] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_Conversations_Users_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Conversations_Users_ExpertId] FOREIGN KEY ([ExpertId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);

CREATE TABLE [Projects] (
    [Id] uniqueidentifier NOT NULL,
    [JobPostId] uniqueidentifier NULL,
    [ClientId] uniqueidentifier NOT NULL,
    [ExpertId] uniqueidentifier NOT NULL,
    [EscrowBalance] decimal(18,2) NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [StartDate] datetime2 NOT NULL,
    [EndDate] datetime2 NULL,
    [ProjectLink] nvarchar(max) NULL,
    [ConversationId] uniqueidentifier NULL,
    CONSTRAINT [PK_Projects] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Projects_Conversations_ConversationId] FOREIGN KEY ([ConversationId]) REFERENCES [Conversations] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_Projects_JobPosts_JobPostId] FOREIGN KEY ([JobPostId]) REFERENCES [JobPosts] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Projects_Users_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Projects_Users_ExpertId] FOREIGN KEY ([ExpertId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);

CREATE TABLE [AICategoryDomainExpertProfile] (
    [AICategoryDomainsId] uniqueidentifier NOT NULL,
    [ExpertProfilesUserId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_AICategoryDomainExpertProfile] PRIMARY KEY ([AICategoryDomainsId], [ExpertProfilesUserId]),
    CONSTRAINT [FK_AICategoryDomainExpertProfile_AICategoryDomains_AICategoryDomainsId] FOREIGN KEY ([AICategoryDomainsId]) REFERENCES [AICategoryDomains] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_AICategoryDomainExpertProfile_ExpertProfiles_ExpertProfilesUserId] FOREIGN KEY ([ExpertProfilesUserId]) REFERENCES [ExpertProfiles] ([UserId]) ON DELETE CASCADE
);

CREATE TABLE [ExpertProfileSkill] (
    [ExpertProfilesUserId] uniqueidentifier NOT NULL,
    [SkillsId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_ExpertProfileSkill] PRIMARY KEY ([ExpertProfilesUserId], [SkillsId]),
    CONSTRAINT [FK_ExpertProfileSkill_ExpertProfiles_ExpertProfilesUserId] FOREIGN KEY ([ExpertProfilesUserId]) REFERENCES [ExpertProfiles] ([UserId]) ON DELETE CASCADE,
    CONSTRAINT [FK_ExpertProfileSkill_Skills_SkillsId] FOREIGN KEY ([SkillsId]) REFERENCES [Skills] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [JobPostSkill] (
    [JobPostsId] uniqueidentifier NOT NULL,
    [SkillsId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_JobPostSkill] PRIMARY KEY ([JobPostsId], [SkillsId]),
    CONSTRAINT [FK_JobPostSkill_JobPosts_JobPostsId] FOREIGN KEY ([JobPostsId]) REFERENCES [JobPosts] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_JobPostSkill_Skills_SkillsId] FOREIGN KEY ([SkillsId]) REFERENCES [Skills] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [JobRequirements] (
    [Id] uniqueidentifier NOT NULL,
    [JobPostId] uniqueidentifier NOT NULL,
    [UseCaseName] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NULL,
    CONSTRAINT [PK_JobRequirements] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_JobRequirements_JobPosts_JobPostId] FOREIGN KEY ([JobPostId]) REFERENCES [JobPosts] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [Proposals] (
    [Id] uniqueidentifier NOT NULL,
    [JobPostId] uniqueidentifier NOT NULL,
    [ExpertId] uniqueidentifier NOT NULL,
    [BidAmount] decimal(18,2) NOT NULL,
    [CoverLetter] nvarchar(max) NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Proposals] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Proposals_JobPosts_JobPostId] FOREIGN KEY ([JobPostId]) REFERENCES [JobPosts] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Proposals_Users_ExpertId] FOREIGN KEY ([ExpertId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);

CREATE TABLE [ProjectSkill] (
    [ProjectsId] uniqueidentifier NOT NULL,
    [SkillsId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_ProjectSkill] PRIMARY KEY ([ProjectsId], [SkillsId]),
    CONSTRAINT [FK_ProjectSkill_Projects_ProjectsId] FOREIGN KEY ([ProjectsId]) REFERENCES [Projects] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ProjectSkill_Skills_SkillsId] FOREIGN KEY ([SkillsId]) REFERENCES [Skills] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [Reviews] (
    [Id] uniqueidentifier NOT NULL,
    [ProjectId] uniqueidentifier NOT NULL,
    [CreatedById] uniqueidentifier NOT NULL,
    [TargetUserId] uniqueidentifier NOT NULL,
    [Rating] int NOT NULL,
    [Comment] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Reviews] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Reviews_Projects_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [Projects] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Reviews_Users_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Reviews_Users_TargetUserId] FOREIGN KEY ([TargetUserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);

CREATE TABLE [Tasks] (
    [Id] uniqueidentifier NOT NULL,
    [ProjectId] uniqueidentifier NOT NULL,
    [Title] nvarchar(max) NOT NULL,
    [Status] nvarchar(max) NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Tasks] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Tasks_Projects_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [Projects] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [TransactionLogs] (
    [Id] uniqueidentifier NOT NULL,
    [ProjectId] uniqueidentifier NULL,
    [SourceWalletId] uniqueidentifier NULL,
    [DestinationWalletId] uniqueidentifier NULL,
    [Amount] decimal(18,2) NOT NULL,
    [Type] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_TransactionLogs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_TransactionLogs_Projects_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [Projects] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_TransactionLogs_Wallets_DestinationWalletId] FOREIGN KEY ([DestinationWalletId]) REFERENCES [Wallets] ([UserId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_TransactionLogs_Wallets_SourceWalletId] FOREIGN KEY ([SourceWalletId]) REFERENCES [Wallets] ([UserId]) ON DELETE NO ACTION
);

CREATE TABLE [Messages] (
    [Id] uniqueidentifier NOT NULL,
    [ConversationId] uniqueidentifier NOT NULL,
    [SenderId] uniqueidentifier NOT NULL,
    [Content] nvarchar(max) NOT NULL,
    [IsRead] bit NOT NULL DEFAULT CAST(0 AS bit),
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Messages] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Messages_Conversations_ConversationId] FOREIGN KEY ([ConversationId]) REFERENCES [Conversations] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Messages_Users_SenderId] FOREIGN KEY ([SenderId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);

CREATE TABLE [MiniTasks] (
    [Id] uniqueidentifier NOT NULL,
    [TaskId] uniqueidentifier NOT NULL,
    [Title] nvarchar(max) NOT NULL,
    [IsCompleted] bit NOT NULL,
    [FeedbackContent] nvarchar(max) NULL,
    [FeedbackSenderId] uniqueidentifier NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_MiniTasks] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MiniTasks_Tasks_TaskId] FOREIGN KEY ([TaskId]) REFERENCES [Tasks] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_MiniTasks_Users_FeedbackSenderId] FOREIGN KEY ([FeedbackSenderId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);
GO

-- 5. Khởi tạo hệ thống Index để tối ưu hóa tốc độ truy vấn (Quét bản ghi nhanh)
CREATE INDEX [IX_AICategoryDomainExpertProfile_ExpertProfilesUserId] ON [AICategoryDomainExpertProfile] ([ExpertProfilesUserId]);
CREATE INDEX [IX_Conversations_ClientId] ON [Conversations] ([ClientId]);
CREATE INDEX [IX_Conversations_ExpertId] ON [Conversations] ([ExpertId]);
CREATE INDEX [IX_Conversations_OriginJobPostId] ON [Conversations] ([OriginJobPostId]);
CREATE INDEX [IX_ExpertProfileSkill_SkillsId] ON [ExpertProfileSkill] ([SkillsId]);
CREATE INDEX [IX_JobPosts_AICategoryDomainId] ON [JobPosts] ([AICategoryDomainId]);
CREATE INDEX [IX_JobPosts_ClientId] ON [JobPosts] ([ClientId]);
CREATE INDEX [IX_JobPostSkill_SkillsId] ON [JobPostSkill] ([SkillsId]);
CREATE INDEX [IX_JobRequirements_JobPostId] ON [JobRequirements] ([JobPostId]);
CREATE INDEX [IX_Messages_ConversationId] ON [Messages] ([ConversationId]);
CREATE INDEX [IX_Messages_SenderId] ON [Messages] ([SenderId]);
CREATE INDEX [IX_MiniTasks_TaskId] ON [MiniTasks] ([TaskId]);
CREATE INDEX [IX_MiniTasks_FeedbackSenderId] ON [MiniTasks] ([FeedbackSenderId]);
CREATE INDEX [IX_Projects_ClientId] ON [Projects] ([ClientId]);
CREATE INDEX [IX_Projects_ExpertId] ON [Projects] ([ExpertId]);
CREATE INDEX [IX_Projects_JobPostId] ON [Projects] ([JobPostId]);
CREATE INDEX [IX_Projects_ConversationId] ON [Projects] ([ConversationId]);
CREATE INDEX [IX_ProjectSkill_SkillsId] ON [ProjectSkill] ([SkillsId]);
CREATE INDEX [IX_Proposals_ExpertId] ON [Proposals] ([ExpertId]);
CREATE INDEX [IX_Proposals_JobPostId] ON [Proposals] ([JobPostId]);
CREATE INDEX [IX_Reviews_CreatedById] ON [Reviews] ([CreatedById]);
CREATE INDEX [IX_Reviews_ProjectId] ON [Reviews] ([ProjectId]);
CREATE INDEX [IX_Reviews_TargetUserId] ON [Reviews] ([TargetUserId]);
CREATE INDEX [IX_Tasks_ProjectId] ON [Tasks] ([ProjectId]);
CREATE INDEX [IX_TransactionLogs_DestinationWalletId] ON [TransactionLogs] ([DestinationWalletId]);
CREATE INDEX [IX_TransactionLogs_ProjectId] ON [TransactionLogs] ([ProjectId]);
CREATE INDEX [IX_TransactionLogs_SourceWalletId] ON [TransactionLogs] ([SourceWalletId]);
CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);
GO

-- 6. Ghi đè lịch sử Migration để tránh xung đột hệ thống khi Backend kiểm tra
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260528131130_RecreateDatabaseSchema', N'10.0.8');
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260603120535_RemoveUsernameColumn', N'10.0.8');
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260607140000_UpdateDatabaseSchemaBasedOnNotes', N'10.0.8');
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260607141801_RemoveTaskFeedbackAndIntegrateToMiniTask', N'10.0.8');

COMMIT;
GO