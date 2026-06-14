using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AITasker_Modular.Migrations
{
    /// <inheritdoc />
    public partial class MakeExpertProposalUniquePerJob : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Proposals_JobPostId",
                table: "Proposals");

            migrationBuilder.CreateIndex(
                name: "IX_Proposals_JobPostId_ExpertId",
                table: "Proposals",
                columns: new[] { "JobPostId", "ExpertId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Proposals_JobPostId_ExpertId",
                table: "Proposals");

            migrationBuilder.CreateIndex(
                name: "IX_Proposals_JobPostId",
                table: "Proposals",
                column: "JobPostId");
        }
    }
}
