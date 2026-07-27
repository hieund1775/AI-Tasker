using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker_Modular.Migrations
{
    /// <inheritdoc />
    public partial class UpdateMiniTaskDeadlineDurationSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Deadline",
                table: "MiniTasks");

            migrationBuilder.AddColumn<int>(
                name: "Duration",
                table: "MiniTasks",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "SystemWallets",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "UpdatedAt",
                value: new DateTime(2026, 7, 20, 1, 41, 18, 199, DateTimeKind.Utc).AddTicks(4840));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Duration",
                table: "MiniTasks");

            migrationBuilder.AddColumn<DateTime>(
                name: "Deadline",
                table: "MiniTasks",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "SystemWallets",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "UpdatedAt",
                value: new DateTime(2026, 7, 19, 16, 33, 45, 29, DateTimeKind.Utc).AddTicks(5750));
        }
    }
}
