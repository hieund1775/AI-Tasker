using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveTaskFeedbackAndIntegrateToMiniTask : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaskFeedbacks");

            migrationBuilder.AddColumn<string>(
                name: "FeedbackContent",
                table: "MiniTasks",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "FeedbackSenderId",
                table: "MiniTasks",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MiniTasks_FeedbackSenderId",
                table: "MiniTasks",
                column: "FeedbackSenderId");

            migrationBuilder.AddForeignKey(
                name: "FK_MiniTasks_Users_FeedbackSenderId",
                table: "MiniTasks",
                column: "FeedbackSenderId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MiniTasks_Users_FeedbackSenderId",
                table: "MiniTasks");

            migrationBuilder.DropIndex(
                name: "IX_MiniTasks_FeedbackSenderId",
                table: "MiniTasks");

            migrationBuilder.DropColumn(
                name: "FeedbackContent",
                table: "MiniTasks");

            migrationBuilder.DropColumn(
                name: "FeedbackSenderId",
                table: "MiniTasks");

            migrationBuilder.CreateTable(
                name: "TaskFeedbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SenderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
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
                name: "IX_TaskFeedbacks_SenderId",
                table: "TaskFeedbacks",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskFeedbacks_TaskId",
                table: "TaskFeedbacks",
                column: "TaskId");
        }
    }
}
