using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker_Modular.Migrations
{
    /// <inheritdoc />
    public partial class UpdateProposalSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "CoverLetter",
                table: "Proposals",
                newName: "Title");

            migrationBuilder.AddColumn<string>(
                name: "Dependencies",
                table: "Proposals",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "EstimatedDuration",
                table: "Proposals",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Implementation",
                table: "Proposals",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Introduction",
                table: "Proposals",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Portfolio",
                table: "Proposals",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Technical",
                table: "Proposals",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "UseCaseName",
                table: "JobRequirements",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Dependencies",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "EstimatedDuration",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "Implementation",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "Introduction",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "Portfolio",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "Technical",
                table: "Proposals");

            migrationBuilder.RenameColumn(
                name: "Title",
                table: "Proposals",
                newName: "CoverLetter");

            migrationBuilder.AlterColumn<string>(
                name: "UseCaseName",
                table: "JobRequirements",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);
        }
    }
}
