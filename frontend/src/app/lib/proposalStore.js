// =============================================================================
// Proposal Store — provides helper utilities for proposal display.
// Real API calls are now used via api.proposals.*.
// =============================================================================

/**
 * Compute a match/trust score for a proposal based on available trust signals.
 *
 * Scoring factors:
 *   - Expert rating (0-5) contributes up to 25 points
 *   - Completed projects contributes up to 15 points (50+ projects = max)
 *   - Review count contributes up to 10 points (30+ reviews = max)
 *   - Bid competitiveness vs job budget contributes up to 10 points
 *
 * Base score starts at 40. Maximum possible is 100.
 * New experts with no data will show ~40 (not misleadingly high).
 *
 * @param {Object} proposal - Proposal object with trust signal fields
 * @returns {{ score: number, label: string }} Score 40-100 and a descriptive label
 */
export function getMatchPercentage(proposal) {
  let score = 40; // Base score — honest about lack of data

  // Factor in expert rating (0-5 scale → contributes up to 25 points)
  if (proposal.expertAverageRating != null && proposal.expertAverageRating > 0) {
    score += (Math.min(proposal.expertAverageRating, 5) / 5) * 25;
  }

  // Factor in completed projects (up to 15 points for 50+ projects)
  if (proposal.expertCompletedProjects != null && proposal.expertCompletedProjects > 0) {
    score += Math.min(proposal.expertCompletedProjects / 3.33, 15);
  }

  // Factor in review count (up to 10 points for 30+ reviews)
  if (proposal.expertReviewCount != null && proposal.expertReviewCount > 0) {
    score += Math.min(proposal.expertReviewCount / 3, 10);
  }

  // Factor in bid competitiveness (up to 10 points)
  // Closer to budget but not exceeding = better
  if (proposal.bidAmount != null && proposal.jobBudget != null && proposal.jobBudget > 0) {
    const ratio = proposal.bidAmount / proposal.jobBudget;
    if (ratio >= 0.7 && ratio <= 1.0) {
      score += 10;
    } else if (ratio > 0.4 && ratio < 0.7) {
      score += 5;
    } else if (ratio > 1.0 && ratio <= 1.3) {
      score += 3;
    }
  }

  const finalScore = Math.min(Math.max(Math.round(score), 40), 100);

  // Descriptive label based on score tier
  let label;
  if (finalScore >= 90) label = "Top Match";
  else if (finalScore >= 75) label = "Strong Match";
  else if (finalScore >= 60) label = "Good Match";
  else if (finalScore >= 45) label = "New Expert";
  else label = "Not Enough Data";

  return { score: finalScore, label };
}
