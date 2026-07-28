using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker_Modular.Migrations
{
    /// <inheritdoc />
    public partial class PruneRedundantDBSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PartnerEvidenceUrl",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "PartnerExplanation",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "SignedAt",
                table: "Contracts");

            migrationBuilder.DropColumn(
                name: "TotalValue",
                table: "Contracts");

            migrationBuilder.RenameColumn(
                name: "ClientNote",
                table: "ProjectExtensions",
                newName: "ResponseNote");

            migrationBuilder.RenameColumn(
                name: "ContractTerms",
                table: "Contracts",
                newName: "Terms");

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Contracts",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.UpdateData(
                table: "SystemWallets",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "UpdatedAt",
                value: new DateTime(2026, 7, 19, 16, 33, 45, 29, DateTimeKind.Utc).AddTicks(5750));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Contracts");

            migrationBuilder.RenameColumn(
                name: "ResponseNote",
                table: "ProjectExtensions",
                newName: "ClientNote");

            migrationBuilder.RenameColumn(
                name: "Terms",
                table: "Contracts",
                newName: "ContractTerms");

            migrationBuilder.AddColumn<string>(
                name: "PartnerEvidenceUrl",
                table: "Reports",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PartnerExplanation",
                table: "Reports",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "SignedAt",
                table: "Contracts",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalValue",
                table: "Contracts",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.UpdateData(
                table: "SystemWallets",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "UpdatedAt",
                value: new DateTime(2026, 7, 19, 8, 21, 55, 521, DateTimeKind.Utc).AddTicks(8904));
        }
    }
}
