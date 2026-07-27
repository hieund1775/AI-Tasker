using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker_Modular.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTransactionLogsTableSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BankAccountName",
                table: "TransactionLogs",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BankAccountNumber",
                table: "TransactionLogs",
                type: "varchar(100)",
                maxLength: 100,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BankCode",
                table: "TransactionLogs",
                type: "varchar(50)",
                maxLength: 50,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "BankReferenceNo",
                table: "TransactionLogs",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "TransactionLogs",
                type: "varchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "GatewayFee",
                table: "TransactionLogs",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "IsSandbox",
                table: "TransactionLogs",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "PlatformFee",
                table: "TransactionLogs",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "ReportId",
                table: "TransactionLogs",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "TransactionLogs",
                type: "varchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "TransactionLogs",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "SystemWallets",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "UpdatedAt",
                value: new DateTime(2026, 7, 16, 11, 11, 38, 828, DateTimeKind.Utc).AddTicks(3275));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BankAccountName",
                table: "TransactionLogs");

            migrationBuilder.DropColumn(
                name: "BankAccountNumber",
                table: "TransactionLogs");

            migrationBuilder.DropColumn(
                name: "BankCode",
                table: "TransactionLogs");

            migrationBuilder.DropColumn(
                name: "BankReferenceNo",
                table: "TransactionLogs");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "TransactionLogs");

            migrationBuilder.DropColumn(
                name: "GatewayFee",
                table: "TransactionLogs");

            migrationBuilder.DropColumn(
                name: "IsSandbox",
                table: "TransactionLogs");

            migrationBuilder.DropColumn(
                name: "PlatformFee",
                table: "TransactionLogs");

            migrationBuilder.DropColumn(
                name: "ReportId",
                table: "TransactionLogs");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "TransactionLogs");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "TransactionLogs");

            migrationBuilder.UpdateData(
                table: "SystemWallets",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "UpdatedAt",
                value: new DateTime(2026, 7, 16, 2, 26, 57, 62, DateTimeKind.Utc).AddTicks(2204));
        }
    }
}
