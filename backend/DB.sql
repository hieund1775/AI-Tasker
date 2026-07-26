CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `ProductVersion` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK___EFMigrationsHistory` PRIMARY KEY (`MigrationId`)
) CHARACTER SET=utf8mb4;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    ALTER DATABASE CHARACTER SET utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `Domains` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
        CONSTRAINT `PK_Domains` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `Skills` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
        CONSTRAINT `PK_Skills` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `Users` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `Email` longtext CHARACTER SET utf8mb4 NOT NULL,
        `PasswordHash` longtext CHARACTER SET utf8mb4 NOT NULL,
        `FullName` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Role` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
        `AvatarUrl` longtext CHARACTER SET utf8mb4 NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_Users` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `Specializations` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
        `DomainId` char(36) COLLATE ascii_general_ci NOT NULL,
        CONSTRAINT `PK_Specializations` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Specializations_Domains_DomainId` FOREIGN KEY (`DomainId`) REFERENCES `Domains` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `ExpertProfiles` (
        `UserId` char(36) COLLATE ascii_general_ci NOT NULL,
        `JobTitle` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Major` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Certifications` longtext CHARACTER SET utf8mb4 NULL,
        `Bio` longtext CHARACTER SET utf8mb4 NOT NULL,
        `PortfolioUrls` longtext CHARACTER SET utf8mb4 NULL,
        `ReputationCredit` decimal(18,2) NOT NULL,
        `Location` longtext CHARACTER SET utf8mb4 NULL,
        `SuccessRate` double NOT NULL,
        CONSTRAINT `PK_ExpertProfiles` PRIMARY KEY (`UserId`),
        CONSTRAINT `FK_ExpertProfiles_Users_UserId` FOREIGN KEY (`UserId`) REFERENCES `Users` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `Wallets` (
        `UserId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Balance` decimal(18,2) NOT NULL,
        CONSTRAINT `PK_Wallets` PRIMARY KEY (`UserId`),
        CONSTRAINT `FK_Wallets_Users_UserId` FOREIGN KEY (`UserId`) REFERENCES `Users` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `JobPosts` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ClientId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Title` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Description` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Budget` decimal(18,2) NOT NULL,
        `Deadline` int NOT NULL,
        `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        `DomainId` char(36) COLLATE ascii_general_ci NULL,
        `SpecializationId` char(36) COLLATE ascii_general_ci NULL,
        `DurationUnit` longtext CHARACTER SET utf8mb4 NULL,
        `DurationValue` int NOT NULL,
        CONSTRAINT `PK_JobPosts` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_JobPosts_Domains_DomainId` FOREIGN KEY (`DomainId`) REFERENCES `Domains` (`Id`),
        CONSTRAINT `FK_JobPosts_Specializations_SpecializationId` FOREIGN KEY (`SpecializationId`) REFERENCES `Specializations` (`Id`),
        CONSTRAINT `FK_JobPosts_Users_ClientId` FOREIGN KEY (`ClientId`) REFERENCES `Users` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `DomainExpertProfiles` (
        `DomainId` char(36) COLLATE ascii_general_ci NOT NULL,
        `ExpertProfilesUserId` char(36) COLLATE ascii_general_ci NOT NULL,
        CONSTRAINT `PK_DomainExpertProfiles` PRIMARY KEY (`DomainId`, `ExpertProfilesUserId`),
        CONSTRAINT `FK_DomainExpertProfiles_Domains_DomainId` FOREIGN KEY (`DomainId`) REFERENCES `Domains` (`Id`),
        CONSTRAINT `FK_DomainExpertProfiles_ExpertProfiles_ExpertProfilesUserId` FOREIGN KEY (`ExpertProfilesUserId`) REFERENCES `ExpertProfiles` (`UserId`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `ExpertProfileSkill` (
        `ExpertProfilesUserId` char(36) COLLATE ascii_general_ci NOT NULL,
        `SkillsId` char(36) COLLATE ascii_general_ci NOT NULL,
        CONSTRAINT `PK_ExpertProfileSkill` PRIMARY KEY (`ExpertProfilesUserId`, `SkillsId`),
        CONSTRAINT `FK_ExpertProfileSkill_ExpertProfiles_ExpertProfilesUserId` FOREIGN KEY (`ExpertProfilesUserId`) REFERENCES `ExpertProfiles` (`UserId`),
        CONSTRAINT `FK_ExpertProfileSkill_Skills_SkillsId` FOREIGN KEY (`SkillsId`) REFERENCES `Skills` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `Conversations` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `OriginJobPostId` char(36) COLLATE ascii_general_ci NULL,
        `ClientId` char(36) COLLATE ascii_general_ci NOT NULL,
        `ExpertId` char(36) COLLATE ascii_general_ci NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_Conversations` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Conversations_JobPosts_OriginJobPostId` FOREIGN KEY (`OriginJobPostId`) REFERENCES `JobPosts` (`Id`),
        CONSTRAINT `FK_Conversations_Users_ClientId` FOREIGN KEY (`ClientId`) REFERENCES `Users` (`Id`),
        CONSTRAINT `FK_Conversations_Users_ExpertId` FOREIGN KEY (`ExpertId`) REFERENCES `Users` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `JobPostSkill` (
        `JobPostsId` char(36) COLLATE ascii_general_ci NOT NULL,
        `SkillsId` char(36) COLLATE ascii_general_ci NOT NULL,
        CONSTRAINT `PK_JobPostSkill` PRIMARY KEY (`JobPostsId`, `SkillsId`),
        CONSTRAINT `FK_JobPostSkill_JobPosts_JobPostsId` FOREIGN KEY (`JobPostsId`) REFERENCES `JobPosts` (`Id`),
        CONSTRAINT `FK_JobPostSkill_Skills_SkillsId` FOREIGN KEY (`SkillsId`) REFERENCES `Skills` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `JobRequirements` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `JobPostId` char(36) COLLATE ascii_general_ci NOT NULL,
        `UseCaseName` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `Description` longtext CHARACTER SET utf8mb4 NULL,
        CONSTRAINT `PK_JobRequirements` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_JobRequirements_JobPosts_JobPostId` FOREIGN KEY (`JobPostId`) REFERENCES `JobPosts` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `Proposals` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `JobPostId` char(36) COLLATE ascii_general_ci NOT NULL,
        `ExpertId` char(36) COLLATE ascii_general_ci NOT NULL,
        `BidAmount` decimal(18,2) NOT NULL,
        `EstimatedDuration` int NOT NULL,
        `Title` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Introduction` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Technical` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Implementation` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Dependencies` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Portfolio` longtext CHARACTER SET utf8mb4 NULL,
        `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_Proposals` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Proposals_JobPosts_JobPostId` FOREIGN KEY (`JobPostId`) REFERENCES `JobPosts` (`Id`),
        CONSTRAINT `FK_Proposals_Users_ExpertId` FOREIGN KEY (`ExpertId`) REFERENCES `Users` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `Messages` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ConversationId` char(36) COLLATE ascii_general_ci NOT NULL,
        `SenderId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Content` longtext CHARACTER SET utf8mb4 NOT NULL,
        `IsRead` tinyint(1) NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_Messages` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Messages_Conversations_ConversationId` FOREIGN KEY (`ConversationId`) REFERENCES `Conversations` (`Id`),
        CONSTRAINT `FK_Messages_Users_SenderId` FOREIGN KEY (`SenderId`) REFERENCES `Users` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `Projects` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `JobPostId` char(36) COLLATE ascii_general_ci NULL,
        `ClientId` char(36) COLLATE ascii_general_ci NOT NULL,
        `ExpertId` char(36) COLLATE ascii_general_ci NOT NULL,
        `EscrowBalance` decimal(18,2) NOT NULL,
        `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
        `StartDate` datetime(6) NOT NULL,
        `EndDate` datetime(6) NULL,
        `ProjectLink` longtext CHARACTER SET utf8mb4 NULL,
        `ConversationId` char(36) COLLATE ascii_general_ci NULL,
        CONSTRAINT `PK_Projects` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Projects_Conversations_ConversationId` FOREIGN KEY (`ConversationId`) REFERENCES `Conversations` (`Id`),
        CONSTRAINT `FK_Projects_JobPosts_JobPostId` FOREIGN KEY (`JobPostId`) REFERENCES `JobPosts` (`Id`),
        CONSTRAINT `FK_Projects_Users_ClientId` FOREIGN KEY (`ClientId`) REFERENCES `Users` (`Id`),
        CONSTRAINT `FK_Projects_Users_ExpertId` FOREIGN KEY (`ExpertId`) REFERENCES `Users` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `ProjectSkill` (
        `ProjectsId` char(36) COLLATE ascii_general_ci NOT NULL,
        `SkillsId` char(36) COLLATE ascii_general_ci NOT NULL,
        CONSTRAINT `PK_ProjectSkill` PRIMARY KEY (`ProjectsId`, `SkillsId`),
        CONSTRAINT `FK_ProjectSkill_Projects_ProjectsId` FOREIGN KEY (`ProjectsId`) REFERENCES `Projects` (`Id`),
        CONSTRAINT `FK_ProjectSkill_Skills_SkillsId` FOREIGN KEY (`SkillsId`) REFERENCES `Skills` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `Reviews` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ProjectId` char(36) COLLATE ascii_general_ci NOT NULL,
        `CreatedById` char(36) COLLATE ascii_general_ci NOT NULL,
        `TargetUserId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Rating` int NOT NULL,
        `Comment` longtext CHARACTER SET utf8mb4 NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_Reviews` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Reviews_Projects_ProjectId` FOREIGN KEY (`ProjectId`) REFERENCES `Projects` (`Id`),
        CONSTRAINT `FK_Reviews_Users_CreatedById` FOREIGN KEY (`CreatedById`) REFERENCES `Users` (`Id`),
        CONSTRAINT `FK_Reviews_Users_TargetUserId` FOREIGN KEY (`TargetUserId`) REFERENCES `Users` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `Tasks` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ProjectId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Title` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
        `UpdatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_Tasks` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Tasks_Projects_ProjectId` FOREIGN KEY (`ProjectId`) REFERENCES `Projects` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `TransactionLogs` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ProjectId` char(36) COLLATE ascii_general_ci NULL,
        `SourceWalletId` char(36) COLLATE ascii_general_ci NULL,
        `DestinationWalletId` char(36) COLLATE ascii_general_ci NULL,
        `Amount` decimal(18,2) NOT NULL,
        `Type` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_TransactionLogs` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_TransactionLogs_Projects_ProjectId` FOREIGN KEY (`ProjectId`) REFERENCES `Projects` (`Id`),
        CONSTRAINT `FK_TransactionLogs_Wallets_DestinationWalletId` FOREIGN KEY (`DestinationWalletId`) REFERENCES `Wallets` (`UserId`),
        CONSTRAINT `FK_TransactionLogs_Wallets_SourceWalletId` FOREIGN KEY (`SourceWalletId`) REFERENCES `Wallets` (`UserId`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE TABLE `MiniTasks` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `TaskId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Title` longtext CHARACTER SET utf8mb4 NOT NULL,
        `IsCompleted` tinyint(1) NOT NULL,
        `FeedbackContent` longtext CHARACTER SET utf8mb4 NULL,
        `FeedbackSenderId` char(36) COLLATE ascii_general_ci NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_MiniTasks` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_MiniTasks_Tasks_TaskId` FOREIGN KEY (`TaskId`) REFERENCES `Tasks` (`Id`),
        CONSTRAINT `FK_MiniTasks_Users_FeedbackSenderId` FOREIGN KEY (`FeedbackSenderId`) REFERENCES `Users` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Conversations_ClientId` ON `Conversations` (`ClientId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Conversations_ExpertId` ON `Conversations` (`ExpertId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Conversations_OriginJobPostId` ON `Conversations` (`OriginJobPostId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_DomainExpertProfiles_ExpertProfilesUserId` ON `DomainExpertProfiles` (`ExpertProfilesUserId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_ExpertProfileSkill_SkillsId` ON `ExpertProfileSkill` (`SkillsId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_JobPosts_ClientId` ON `JobPosts` (`ClientId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_JobPosts_DomainId` ON `JobPosts` (`DomainId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_JobPosts_SpecializationId` ON `JobPosts` (`SpecializationId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_JobPostSkill_SkillsId` ON `JobPostSkill` (`SkillsId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_JobRequirements_JobPostId` ON `JobRequirements` (`JobPostId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Messages_ConversationId` ON `Messages` (`ConversationId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Messages_SenderId` ON `Messages` (`SenderId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_MiniTasks_FeedbackSenderId` ON `MiniTasks` (`FeedbackSenderId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_MiniTasks_TaskId` ON `MiniTasks` (`TaskId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Projects_ClientId` ON `Projects` (`ClientId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Projects_ConversationId` ON `Projects` (`ConversationId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Projects_ExpertId` ON `Projects` (`ExpertId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Projects_JobPostId` ON `Projects` (`JobPostId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_ProjectSkill_SkillsId` ON `ProjectSkill` (`SkillsId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Proposals_ExpertId` ON `Proposals` (`ExpertId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE UNIQUE INDEX `IX_Proposals_JobPostId_ExpertId` ON `Proposals` (`JobPostId`, `ExpertId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Reviews_CreatedById` ON `Reviews` (`CreatedById`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Reviews_ProjectId` ON `Reviews` (`ProjectId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Reviews_TargetUserId` ON `Reviews` (`TargetUserId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Specializations_DomainId` ON `Specializations` (`DomainId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_Tasks_ProjectId` ON `Tasks` (`ProjectId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_TransactionLogs_DestinationWalletId` ON `TransactionLogs` (`DestinationWalletId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_TransactionLogs_ProjectId` ON `TransactionLogs` (`ProjectId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    CREATE INDEX `IX_TransactionLogs_SourceWalletId` ON `TransactionLogs` (`SourceWalletId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621053820_InitialMySql') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260621053820_InitialMySql', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621084745_AddTaskFeedbackAndWorkflow') THEN

    ALTER TABLE `Tasks` ADD `FeedbackContent` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621084745_AddTaskFeedbackAndWorkflow') THEN

    ALTER TABLE `Tasks` ADD `FeedbackSenderId` char(36) COLLATE ascii_general_ci NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621084745_AddTaskFeedbackAndWorkflow') THEN

    CREATE INDEX `IX_Tasks_FeedbackSenderId` ON `Tasks` (`FeedbackSenderId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621084745_AddTaskFeedbackAndWorkflow') THEN

    ALTER TABLE `Tasks` ADD CONSTRAINT `FK_Tasks_Users_FeedbackSenderId` FOREIGN KEY (`FeedbackSenderId`) REFERENCES `Users` (`Id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260621084745_AddTaskFeedbackAndWorkflow') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260621084745_AddTaskFeedbackAndWorkflow', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260622061255_RemoveProposalTitleTechnicalDependencies') THEN

    ALTER TABLE `Proposals` DROP COLUMN `Dependencies`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260622061255_RemoveProposalTitleTechnicalDependencies') THEN

    ALTER TABLE `Proposals` DROP COLUMN `Technical`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260622061255_RemoveProposalTitleTechnicalDependencies') THEN

    ALTER TABLE `Proposals` DROP COLUMN `Title`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260622061255_RemoveProposalTitleTechnicalDependencies') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260622061255_RemoveProposalTitleTechnicalDependencies', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623082717_AddAttachmentUrlsToJobAndProposal') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260623082717_AddAttachmentUrlsToJobAndProposal', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623085447_AddProposalAiChatTable') THEN

    ALTER TABLE `Proposals` ADD `AttachmentUrl` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623085447_AddProposalAiChatTable') THEN

    ALTER TABLE `JobPosts` ADD `AttachmentUrl` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260623085447_AddProposalAiChatTable') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260623085447_AddProposalAiChatTable', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    ALTER TABLE `Users` ADD `AppointedAt` datetime(6) NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    ALTER TABLE `Users` ADD `StaffCode` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    CREATE TABLE `Disputes` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ProjectId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Reason` longtext CHARACTER SET utf8mb4 NOT NULL,
        `ClientEvidenceUrl` longtext CHARACTER SET utf8mb4 NULL,
        `ExpertEvidenceUrl` longtext CHARACTER SET utf8mb4 NULL,
        `CreatedAt` datetime(6) NOT NULL,
        `EvidenceDeadline` datetime(6) NOT NULL,
        `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
        `ResolutionVerdict` longtext CHARACTER SET utf8mb4 NULL,
        `HandlerStaffId` char(36) COLLATE ascii_general_ci NULL,
        CONSTRAINT `PK_Disputes` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Disputes_Projects_ProjectId` FOREIGN KEY (`ProjectId`) REFERENCES `Projects` (`Id`),
        CONSTRAINT `FK_Disputes_Users_HandlerStaffId` FOREIGN KEY (`HandlerStaffId`) REFERENCES `Users` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    CREATE TABLE `ProposalAiChats` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `JobPostId` char(36) COLLATE ascii_general_ci NOT NULL,
        `ExpertId` char(36) COLLATE ascii_general_ci NOT NULL,
        `UserMessage` longtext CHARACTER SET utf8mb4 NOT NULL,
        `AiResponse` longtext CHARACTER SET utf8mb4 NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_ProposalAiChats` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_ProposalAiChats_JobPosts_JobPostId` FOREIGN KEY (`JobPostId`) REFERENCES `JobPosts` (`Id`),
        CONSTRAINT `FK_ProposalAiChats_Users_ExpertId` FOREIGN KEY (`ExpertId`) REFERENCES `Users` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    CREATE TABLE `Reports` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ProjectId` char(36) COLLATE ascii_general_ci NOT NULL,
        `ReporterId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Reason` longtext CHARACTER SET utf8mb4 NOT NULL,
        `EvidenceUrl` longtext CHARACTER SET utf8mb4 NULL,
        `CreatedAt` datetime(6) NOT NULL,
        `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
        `HandlerStaffId` char(36) COLLATE ascii_general_ci NULL,
        CONSTRAINT `PK_Reports` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Reports_Projects_ProjectId` FOREIGN KEY (`ProjectId`) REFERENCES `Projects` (`Id`),
        CONSTRAINT `FK_Reports_Users_HandlerStaffId` FOREIGN KEY (`HandlerStaffId`) REFERENCES `Users` (`Id`),
        CONSTRAINT `FK_Reports_Users_ReporterId` FOREIGN KEY (`ReporterId`) REFERENCES `Users` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    CREATE INDEX `IX_Disputes_HandlerStaffId` ON `Disputes` (`HandlerStaffId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    CREATE INDEX `IX_Disputes_ProjectId` ON `Disputes` (`ProjectId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    CREATE INDEX `IX_ProposalAiChats_ExpertId` ON `ProposalAiChats` (`ExpertId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    CREATE INDEX `IX_ProposalAiChats_JobPostId` ON `ProposalAiChats` (`JobPostId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    CREATE INDEX `IX_Reports_HandlerStaffId` ON `Reports` (`HandlerStaffId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    CREATE INDEX `IX_Reports_ProjectId` ON `Reports` (`ProjectId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    CREATE INDEX `IX_Reports_ReporterId` ON `Reports` (`ReporterId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260625012649_MergeAdminToUsers') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260625012649_MergeAdminToUsers', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `AdminNote` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `Description` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `DesiredResolution` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `DisputeType` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `EscrowPayExpert` decimal(18,2) NOT NULL DEFAULT 0.0;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `EscrowRefundClient` decimal(18,2) NOT NULL DEFAULT 0.0;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `HistoryLogsJson` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `PartnerEvidenceUrl` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `PartnerExplanation` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `PartnerRejectionReason` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `PlatformFee` decimal(18,2) NOT NULL DEFAULT 0.0;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `ReportType` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `ReporterRole` longtext CHARACTER SET utf8mb4 NOT NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    ALTER TABLE `Reports` ADD `UpdatedAt` datetime(6) NOT NULL DEFAULT '0001-01-01 00:00:00';

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    CREATE TABLE `Contracts` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ProjectId` char(36) COLLATE ascii_general_ci NOT NULL,
        `ClientId` char(36) COLLATE ascii_general_ci NOT NULL,
        `ExpertId` char(36) COLLATE ascii_general_ci NOT NULL,
        `ContractTerms` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Status` longtext CHARACTER SET utf8mb4 NOT NULL,
        `TotalValue` decimal(18,2) NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        `SignedAt` datetime(6) NULL,
        CONSTRAINT `PK_Contracts` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_Contracts_Projects_ProjectId` FOREIGN KEY (`ProjectId`) REFERENCES `Projects` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    CREATE TABLE `SystemTransactionLogs` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ProjectId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Amount` decimal(18,2) NOT NULL,
        `Type` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Description` longtext CHARACTER SET utf8mb4 NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_SystemTransactionLogs` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    CREATE TABLE `SystemWallets` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `TotalBalance` decimal(18,2) NOT NULL,
        `UpdatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_SystemWallets` PRIMARY KEY (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    INSERT INTO `SystemWallets` (`Id`, `TotalBalance`, `UpdatedAt`)
    VALUES ('11111111-1111-1111-1111-111111111111', 0.0, TIMESTAMP '2026-06-30 13:17:27');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    CREATE INDEX `IX_Contracts_ProjectId` ON `Contracts` (`ProjectId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630131729_AddSystemFinanceTables') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260630131729_AddSystemFinanceTables', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630155723_MoveProposalImplementationToSeparateTable') THEN

    ALTER TABLE `MiniTasks` ADD `Duration` int NOT NULL DEFAULT 0;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630155723_MoveProposalImplementationToSeparateTable') THEN

    CREATE TABLE `ProposalTasks` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ProposalId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Title` longtext CHARACTER SET utf8mb4 NOT NULL,
        CONSTRAINT `PK_ProposalTasks` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_ProposalTasks_Proposals_ProposalId` FOREIGN KEY (`ProposalId`) REFERENCES `Proposals` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630155723_MoveProposalImplementationToSeparateTable') THEN

    CREATE TABLE `ProposalMiniTasks` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ProposalTaskId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Title` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Deadline` datetime(6) NULL,
        `Duration` int NOT NULL,
        CONSTRAINT `PK_ProposalMiniTasks` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_ProposalMiniTasks_ProposalTasks_ProposalTaskId` FOREIGN KEY (`ProposalTaskId`) REFERENCES `ProposalTasks` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630155723_MoveProposalImplementationToSeparateTable') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-06-30 15:57:20'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630155723_MoveProposalImplementationToSeparateTable') THEN

    CREATE INDEX `IX_ProposalMiniTasks_ProposalTaskId` ON `ProposalMiniTasks` (`ProposalTaskId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630155723_MoveProposalImplementationToSeparateTable') THEN

    CREATE INDEX `IX_ProposalTasks_ProposalId` ON `ProposalTasks` (`ProposalId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630155723_MoveProposalImplementationToSeparateTable') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260630155723_MoveProposalImplementationToSeparateTable', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630165209_AddJobPostWBS') THEN

    ALTER TABLE `ProposalMiniTasks` DROP COLUMN `Deadline`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630165209_AddJobPostWBS') THEN

    ALTER TABLE `JobPosts` ADD `Implementation` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630165209_AddJobPostWBS') THEN

    CREATE TABLE `JobPostTasks` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `JobPostId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Title` longtext CHARACTER SET utf8mb4 NOT NULL,
        CONSTRAINT `PK_JobPostTasks` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_JobPostTasks_JobPosts_JobPostId` FOREIGN KEY (`JobPostId`) REFERENCES `JobPosts` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630165209_AddJobPostWBS') THEN

    CREATE TABLE `JobPostMiniTasks` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `JobPostTaskId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Title` longtext CHARACTER SET utf8mb4 NOT NULL,
        `Duration` int NOT NULL,
        CONSTRAINT `PK_JobPostMiniTasks` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_JobPostMiniTasks_JobPostTasks_JobPostTaskId` FOREIGN KEY (`JobPostTaskId`) REFERENCES `JobPostTasks` (`Id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630165209_AddJobPostWBS') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-06-30 16:52:08'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630165209_AddJobPostWBS') THEN

    CREATE INDEX `IX_JobPostMiniTasks_JobPostTaskId` ON `JobPostMiniTasks` (`JobPostTaskId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630165209_AddJobPostWBS') THEN

    CREATE INDEX `IX_JobPostTasks_JobPostId` ON `JobPostTasks` (`JobPostId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630165209_AddJobPostWBS') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260630165209_AddJobPostWBS', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630171523_UpdateWBSAndMiniTasks') THEN

    DROP TABLE `JobRequirements`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630171523_UpdateWBSAndMiniTasks') THEN

    ALTER TABLE `MiniTasks` DROP COLUMN `Duration`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630171523_UpdateWBSAndMiniTasks') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-06-30 17:15:23'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260630171523_UpdateWBSAndMiniTasks') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260630171523_UpdateWBSAndMiniTasks', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260702014145_AddPhoneNumberToUsers') THEN

    ALTER TABLE `Users` ADD `PhoneNumber` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260702014145_AddPhoneNumberToUsers') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-02 01:41:42'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260702014145_AddPhoneNumberToUsers') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260702014145_AddPhoneNumberToUsers', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260702171607_SyncReportFields') THEN

    ALTER TABLE `Tasks` ADD `Notes` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260702171607_SyncReportFields') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-02 17:16:04'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260702171607_SyncReportFields') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260702171607_SyncReportFields', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260704145900_AddProductFieldsToMiniTask') THEN

    ALTER TABLE `MiniTasks` ADD `ProductFile` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260704145900_AddProductFieldsToMiniTask') THEN

    ALTER TABLE `MiniTasks` ADD `ProductLink` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260704145900_AddProductFieldsToMiniTask') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-04 14:58:58'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260704145900_AddProductFieldsToMiniTask') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260704145900_AddProductFieldsToMiniTask', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705120911_AddProjectFileAndDeclineReason') THEN

    ALTER TABLE `Projects` ADD `DeclineReason` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705120911_AddProjectFileAndDeclineReason') THEN

    ALTER TABLE `Projects` ADD `ProjectFile` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705120911_AddProjectFileAndDeclineReason') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-05 12:09:08'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705120911_AddProjectFileAndDeclineReason') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260705120911_AddProjectFileAndDeclineReason', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `ClientExplanation` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `ClientExplanationDescription` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `ClientExplanationDesiredResolution` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `ClientExplanationEvidence` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `ClientExplanationReason` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `CurrentRoundClientSubmitted` tinyint(1) NOT NULL DEFAULT FALSE;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `CurrentRoundExpertSubmitted` tinyint(1) NOT NULL DEFAULT FALSE;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `ExpertExplanation` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `ExpertExplanationDescription` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `ExpertExplanationDesiredResolution` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `ExpertExplanationEvidence` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `ExpertExplanationReason` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    ALTER TABLE `Reports` ADD `ReplyDeadline` datetime(6) NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-05 18:19:10'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260705181915_AddDisputeFlowReportFields') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260705181915_AddDisputeFlowReportFields', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260706170751_AddWalletEscrowAndTotalEarned') THEN

    ALTER TABLE `Wallets` ADD `EscrowBalance` decimal(18,2) NOT NULL DEFAULT 0.0;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260706170751_AddWalletEscrowAndTotalEarned') THEN

    ALTER TABLE `Wallets` ADD `TotalEarned` decimal(18,2) NOT NULL DEFAULT 0.0;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260706170751_AddWalletEscrowAndTotalEarned') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-06 17:07:47'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260706170751_AddWalletEscrowAndTotalEarned') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260706170751_AddWalletEscrowAndTotalEarned', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260707110227_AddPasswordResetFields') THEN

    ALTER TABLE `Users` ADD `PasswordResetExpiry` datetime(6) NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260707110227_AddPasswordResetFields') THEN

    ALTER TABLE `Users` ADD `PasswordResetToken` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260707110227_AddPasswordResetFields') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-07 11:02:25'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260707110227_AddPasswordResetFields') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260707110227_AddPasswordResetFields', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260712082702_AddNewExpertProfileFields') THEN

    ALTER TABLE `ExpertProfiles` ADD `Category` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260712082702_AddNewExpertProfileFields') THEN

    ALTER TABLE `ExpertProfiles` ADD `HourlyRate` decimal(18,2) NOT NULL DEFAULT 0.0;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260712082702_AddNewExpertProfileFields') THEN

    ALTER TABLE `ExpertProfiles` ADD `Industry` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260712082702_AddNewExpertProfileFields') THEN

    ALTER TABLE `ExpertProfiles` ADD `Phone` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260712082702_AddNewExpertProfileFields') THEN

    ALTER TABLE `ExpertProfiles` ADD `Website` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260712082702_AddNewExpertProfileFields') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-12 08:26:58'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260712082702_AddNewExpertProfileFields') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260712082702_AddNewExpertProfileFields', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716022659_AddEmailVerificationFields') THEN

    ALTER TABLE `Users` ADD `EmailVerificationExpiry` datetime(6) NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716022659_AddEmailVerificationFields') THEN

    ALTER TABLE `Users` ADD `EmailVerificationToken` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716022659_AddEmailVerificationFields') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-16 02:26:57'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716022659_AddEmailVerificationFields') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260716022659_AddEmailVerificationFields', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    ALTER TABLE `TransactionLogs` ADD `BankAccountName` varchar(255) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    ALTER TABLE `TransactionLogs` ADD `BankAccountNumber` varchar(100) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    ALTER TABLE `TransactionLogs` ADD `BankCode` varchar(50) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    ALTER TABLE `TransactionLogs` ADD `BankReferenceNo` varchar(255) CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    ALTER TABLE `TransactionLogs` ADD `Description` varchar(500) CHARACTER SET utf8mb4 NOT NULL DEFAULT '';

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    ALTER TABLE `TransactionLogs` ADD `GatewayFee` decimal(18,2) NOT NULL DEFAULT 0.0;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    ALTER TABLE `TransactionLogs` ADD `IsSandbox` tinyint(1) NOT NULL DEFAULT FALSE;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    ALTER TABLE `TransactionLogs` ADD `PlatformFee` decimal(18,2) NOT NULL DEFAULT 0.0;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    ALTER TABLE `TransactionLogs` ADD `ReportId` char(36) COLLATE ascii_general_ci NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    ALTER TABLE `TransactionLogs` ADD `Status` varchar(50) CHARACTER SET utf8mb4 NOT NULL DEFAULT '';

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    ALTER TABLE `TransactionLogs` ADD `UpdatedAt` datetime(6) NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-16 11:11:38'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260716111141_UpdateTransactionLogsTableSchema') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260716111141_UpdateTransactionLogsTableSchema', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260718173819_AddProjectExtensionsAndLogsSchema') THEN

    CREATE TABLE `ProjectActivityLogs` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ProjectId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Action` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
        `Description` varchar(1000) CHARACTER SET utf8mb4 NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        `ActorName` varchar(255) CHARACTER SET utf8mb4 NULL,
        CONSTRAINT `PK_ProjectActivityLogs` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_ProjectActivityLogs_Projects_ProjectId` FOREIGN KEY (`ProjectId`) REFERENCES `Projects` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260718173819_AddProjectExtensionsAndLogsSchema') THEN

    CREATE TABLE `ProjectExtensions` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `ProjectId` char(36) COLLATE ascii_general_ci NOT NULL,
        `TaskId` char(36) COLLATE ascii_general_ci NULL,
        `RequestedDays` int NOT NULL,
        `Reason` varchar(500) CHARACTER SET utf8mb4 NOT NULL,
        `Status` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
        `ClientNote` longtext CHARACTER SET utf8mb4 NULL,
        `CreatedAt` datetime(6) NOT NULL,
        `UpdatedAt` datetime(6) NULL,
        CONSTRAINT `PK_ProjectExtensions` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_ProjectExtensions_Projects_ProjectId` FOREIGN KEY (`ProjectId`) REFERENCES `Projects` (`Id`),
        CONSTRAINT `FK_ProjectExtensions_Tasks_TaskId` FOREIGN KEY (`TaskId`) REFERENCES `Tasks` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260718173819_AddProjectExtensionsAndLogsSchema') THEN

    CREATE TABLE `TaskProgressLogs` (
        `Id` char(36) COLLATE ascii_general_ci NOT NULL,
        `TaskId` char(36) COLLATE ascii_general_ci NOT NULL,
        `Content` varchar(1000) CHARACTER SET utf8mb4 NOT NULL,
        `HoursWorked` double NOT NULL,
        `CreatedAt` datetime(6) NOT NULL,
        CONSTRAINT `PK_TaskProgressLogs` PRIMARY KEY (`Id`),
        CONSTRAINT `FK_TaskProgressLogs_Tasks_TaskId` FOREIGN KEY (`TaskId`) REFERENCES `Tasks` (`Id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260718173819_AddProjectExtensionsAndLogsSchema') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-18 17:38:17'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260718173819_AddProjectExtensionsAndLogsSchema') THEN

    CREATE INDEX `IX_ProjectActivityLogs_ProjectId` ON `ProjectActivityLogs` (`ProjectId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260718173819_AddProjectExtensionsAndLogsSchema') THEN

    CREATE INDEX `IX_ProjectExtensions_ProjectId` ON `ProjectExtensions` (`ProjectId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260718173819_AddProjectExtensionsAndLogsSchema') THEN

    CREATE INDEX `IX_ProjectExtensions_TaskId` ON `ProjectExtensions` (`TaskId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260718173819_AddProjectExtensionsAndLogsSchema') THEN

    CREATE INDEX `IX_TaskProgressLogs_TaskId` ON `TaskProgressLogs` (`TaskId`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260718173819_AddProjectExtensionsAndLogsSchema') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260718173819_AddProjectExtensionsAndLogsSchema', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719082156_UpdateReviewsAndProjectsMetadataSchema') THEN

    ALTER TABLE `Reviews` ADD `ExpertReply` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719082156_UpdateReviewsAndProjectsMetadataSchema') THEN

    ALTER TABLE `Reviews` ADD `ReplyCreatedAt` datetime(6) NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719082156_UpdateReviewsAndProjectsMetadataSchema') THEN

    ALTER TABLE `Projects` ADD `Metadata` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719082156_UpdateReviewsAndProjectsMetadataSchema') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-19 08:21:55'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719082156_UpdateReviewsAndProjectsMetadataSchema') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260719082156_UpdateReviewsAndProjectsMetadataSchema', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719163348_PruneRedundantDBSchema') THEN

    ALTER TABLE `Reports` DROP COLUMN `PartnerEvidenceUrl`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719163348_PruneRedundantDBSchema') THEN

    ALTER TABLE `Reports` DROP COLUMN `PartnerExplanation`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719163348_PruneRedundantDBSchema') THEN

    ALTER TABLE `Contracts` DROP COLUMN `SignedAt`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719163348_PruneRedundantDBSchema') THEN

    ALTER TABLE `Contracts` DROP COLUMN `TotalValue`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719163348_PruneRedundantDBSchema') THEN

    ALTER TABLE `ProjectExtensions` RENAME COLUMN `ClientNote` TO `ResponseNote`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719163348_PruneRedundantDBSchema') THEN

    ALTER TABLE `Contracts` RENAME COLUMN `ContractTerms` TO `Terms`;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719163348_PruneRedundantDBSchema') THEN

    ALTER TABLE `Contracts` ADD `Notes` longtext CHARACTER SET utf8mb4 NULL;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719163348_PruneRedundantDBSchema') THEN

    UPDATE `SystemWallets` SET `UpdatedAt` = TIMESTAMP '2026-07-19 16:33:45'
    WHERE `Id` = '11111111-1111-1111-1111-111111111111';
    SELECT ROW_COUNT();


    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `MigrationId` = '20260719163348_PruneRedundantDBSchema') THEN

    INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
    VALUES ('20260719163348_PruneRedundantDBSchema', '8.0.11');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

