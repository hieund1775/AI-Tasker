using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker_Modular.Migrations
{
    /// <inheritdoc />
    public partial class AddJobPostWBS : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Deadline",
                table: "ProposalMiniTasks");

            migrationBuilder.AddColumn<string>(
                name: "Implementation",
                table: "JobPosts",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "JobPostTasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    JobPostId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Title = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobPostTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobPostTasks_JobPosts_JobPostId",
                        column: x => x.JobPostId,
                        principalTable: "JobPosts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "JobPostMiniTasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    JobPostTaskId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Title = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Duration = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobPostMiniTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobPostMiniTasks_JobPostTasks_JobPostTaskId",
                        column: x => x.JobPostTaskId,
                        principalTable: "JobPostTasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "SystemWallets",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "UpdatedAt",
                value: new DateTime(2026, 6, 30, 16, 52, 8, 716, DateTimeKind.Utc).AddTicks(6476));

            migrationBuilder.CreateIndex(
                name: "IX_JobPostMiniTasks_JobPostTaskId",
                table: "JobPostMiniTasks",
                column: "JobPostTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_JobPostTasks_JobPostId",
                table: "JobPostTasks",
                column: "JobPostId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JobPostMiniTasks");

            migrationBuilder.DropTable(
                name: "JobPostTasks");

            migrationBuilder.DropColumn(
                name: "Implementation",
                table: "JobPosts");

            migrationBuilder.AddColumn<DateTime>(
                name: "Deadline",
                table: "ProposalMiniTasks",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "SystemWallets",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "UpdatedAt",
                value: new DateTime(2026, 6, 30, 15, 57, 20, 382, DateTimeKind.Utc).AddTicks(9169));
        }
    }
}
