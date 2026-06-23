using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker_Modular.Migrations
{
    /// <inheritdoc />
    public partial class AddProposalAiChatTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttachmentUrl",
                table: "Proposals",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "AttachmentUrl",
                table: "JobPosts",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttachmentUrl",
                table: "Proposals");

            migrationBuilder.DropColumn(
                name: "AttachmentUrl",
                table: "JobPosts");
        }
    }
}
