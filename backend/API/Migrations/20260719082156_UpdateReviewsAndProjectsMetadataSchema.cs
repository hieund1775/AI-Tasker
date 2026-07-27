using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker_Modular.Migrations
{
    /// <inheritdoc />
    public partial class UpdateReviewsAndProjectsMetadataSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExpertReply",
                table: "Reviews",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "ReplyCreatedAt",
                table: "Reviews",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Metadata",
                table: "Projects",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "SystemWallets",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "UpdatedAt",
                value: new DateTime(2026, 7, 19, 8, 21, 55, 521, DateTimeKind.Utc).AddTicks(8904));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExpertReply",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "ReplyCreatedAt",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "Metadata",
                table: "Projects");

            migrationBuilder.UpdateData(
                table: "SystemWallets",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "UpdatedAt",
                value: new DateTime(2026, 7, 18, 17, 38, 17, 77, DateTimeKind.Utc).AddTicks(702));
        }
    }
}
