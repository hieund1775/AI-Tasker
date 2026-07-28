using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker_Modular.Migrations
{
    /// <inheritdoc />
    public partial class AddDisputeFlowReportFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClientExplanation",
                table: "Reports",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ClientExplanationDescription",
                table: "Reports",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ClientExplanationDesiredResolution",
                table: "Reports",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ClientExplanationEvidence",
                table: "Reports",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ClientExplanationReason",
                table: "Reports",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "CurrentRoundClientSubmitted",
                table: "Reports",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CurrentRoundExpertSubmitted",
                table: "Reports",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ExpertExplanation",
                table: "Reports",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ExpertExplanationDescription",
                table: "Reports",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ExpertExplanationDesiredResolution",
                table: "Reports",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ExpertExplanationEvidence",
                table: "Reports",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ExpertExplanationReason",
                table: "Reports",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "ReplyDeadline",
                table: "Reports",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "SystemWallets",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "UpdatedAt",
                value: new DateTime(2026, 7, 5, 18, 19, 10, 945, DateTimeKind.Utc).AddTicks(623));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClientExplanation",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "ClientExplanationDescription",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "ClientExplanationDesiredResolution",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "ClientExplanationEvidence",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "ClientExplanationReason",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "CurrentRoundClientSubmitted",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "CurrentRoundExpertSubmitted",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "ExpertExplanation",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "ExpertExplanationDescription",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "ExpertExplanationDesiredResolution",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "ExpertExplanationEvidence",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "ExpertExplanationReason",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "ReplyDeadline",
                table: "Reports");

            migrationBuilder.UpdateData(
                table: "SystemWallets",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "UpdatedAt",
                value: new DateTime(2026, 7, 5, 12, 9, 8, 391, DateTimeKind.Utc).AddTicks(2634));
        }
    }
}
