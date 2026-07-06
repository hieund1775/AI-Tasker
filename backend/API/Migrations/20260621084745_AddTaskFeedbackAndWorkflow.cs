using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker_Modular.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskFeedbackAndWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FeedbackContent",
                table: "Tasks",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<Guid>(
                name: "FeedbackSenderId",
                table: "Tasks",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_FeedbackSenderId",
                table: "Tasks",
                column: "FeedbackSenderId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Users_FeedbackSenderId",
                table: "Tasks",
                column: "FeedbackSenderId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Users_FeedbackSenderId",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_FeedbackSenderId",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "FeedbackContent",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "FeedbackSenderId",
                table: "Tasks");
        }
    }
}
