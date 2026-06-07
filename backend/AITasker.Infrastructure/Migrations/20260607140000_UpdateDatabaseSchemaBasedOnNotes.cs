using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDatabaseSchemaBasedOnNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_Projects_ProjectId",
                table: "Conversations");

            migrationBuilder.RenameColumn(
                name: "ProjectId",
                table: "Conversations",
                newName: "OriginJobPostId");

            migrationBuilder.RenameIndex(
                name: "IX_Conversations_ProjectId",
                table: "Conversations",
                newName: "IX_Conversations_OriginJobPostId");

            migrationBuilder.AddColumn<Guid>(
                name: "ConversationId",
                table: "Projects",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsRead",
                table: "Messages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "TaskFeedbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SenderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskFeedbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskFeedbacks_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaskFeedbacks_Users_SenderId",
                        column: x => x.SenderId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Projects_ConversationId",
                table: "Projects",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskFeedbacks_SenderId",
                table: "TaskFeedbacks",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskFeedbacks_TaskId",
                table: "TaskFeedbacks",
                column: "TaskId");

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_JobPosts_OriginJobPostId",
                table: "Conversations",
                column: "OriginJobPostId",
                principalTable: "JobPosts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Conversations_ConversationId",
                table: "Projects",
                column: "ConversationId",
                principalTable: "Conversations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_JobPosts_OriginJobPostId",
                table: "Conversations");

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Conversations_ConversationId",
                table: "Projects");

            migrationBuilder.DropTable(
                name: "TaskFeedbacks");

            migrationBuilder.DropIndex(
                name: "IX_Projects_ConversationId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "ConversationId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "IsRead",
                table: "Messages");

            migrationBuilder.RenameColumn(
                name: "OriginJobPostId",
                table: "Conversations",
                newName: "ProjectId");

            migrationBuilder.RenameIndex(
                name: "IX_Conversations_OriginJobPostId",
                table: "Conversations",
                newName: "IX_Conversations_ProjectId");

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_Projects_ProjectId",
                table: "Conversations",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
