/**
 * AITasker Recommendation Algorithm Helper
 * 
 * Algorithm to filter and rank recommended jobs for Expert based on suitability:
 *   - Hard filtering: Remove jobs that do not match any criteria (Category, Specialization, Skills).
 *   - Priority sorting:
 *      + Priority 1 (Highest): Matches all 3 criteria (Category AND Specialization AND at least 1 Skill).
 *      + Priority 2 (Medium): Matches exactly 2 of 3 criteria.
 *      + Priority 3 (Lowest): Matches only 1 criterion. Internal hierarchy: Category -> Specialization -> Skills.
 *      + Fine-tuning: Within the matching Skills group, prioritize jobs with more overlapping skills.
 */

/**
 * Filters and ranks JobPosts based on compatibility with the Expert profile.
 * 
 * @param {Object} expertData - Expert info (User or direct expertProfile).
 * @param {Array} totalJobs - Array of existing job posts (JobPosts).
 * @param {Array} allSkills - List of all skills from DB to resolve Skill IDs if needed.
 * @returns {Array} List of filtered and ranked recommended jobs.
 */
export function getRecommendedProjects(expertData, totalJobs, allSkills = [], allCategories = []) {
  if (!expertData || !totalJobs || !Array.isArray(totalJobs)) {
    return [];
  }

  // Safely extract expert profile (supports both user object or direct profile)
  const profile = expertData.expertProfile || expertData || {};

  // Retrieve attributes to compare
  let expertCategory = profile.category || "";
  const expertSpecialization = profile.specialization || profile.major || "";
  const expertSkills = profile.skills || [];

  // Decode Expert Category Name and Specialization Name if stored as Guid ID
  let resolvedExpertCatName = expertCategory;
  let resolvedExpertSpecName = expertSpecialization;

  if (Array.isArray(allCategories) && allCategories.length > 0) {
    const catMatch = allCategories.find(c => c.id === expertCategory);
    if (catMatch) {
      resolvedExpertCatName = catMatch.name;
    }
    
    // Find specialization in all categories
    for (const cat of allCategories) {
      const specMatch = cat.specializations?.find(s => s.id === expertSpecialization);
      if (specMatch) {
        resolvedExpertSpecName = specMatch.name;
        // AUTOMATICALLY INFER CATEGORY IF EXPERT HAS NO CATEGORY IN DB
        if (!expertCategory) {
          expertCategory = cat.id;
          resolvedExpertCatName = cat.name;
        }
        break;
      }
    }
  }

  // Resolve skills from IDs to actual names of the Expert (if stored as skill-xxx)
  const expertSkillsResolved = expertSkills.map(sk => {
    if (typeof sk === "string" && sk.startsWith("skill-") && Array.isArray(allSkills)) {
      const match = allSkills.find(s => s.id === sk);
      return match ? match.name : sk;
    }
    return typeof sk === "string" ? sk : sk?.name || "";
  }).filter(Boolean);

  // Iterate and compute match statistics for each job
  const scoredJobs = totalJobs
    .map(job => {
      // 1. Check Category match (direct Guid ID match or decoded name match)
      const jobCatId = job.domainId || job.domain?.id || job.aiCategoryDomainId || "";
      const jobCatName = job.category || job.domain?.name || job.aiCategoryDomain?.name || "";

      const isCategoryMatch = !!(
        (jobCatId && expertCategory && jobCatId === expertCategory) ||
        (jobCatName && resolvedExpertCatName && String(jobCatName).toLowerCase() === String(resolvedExpertCatName).toLowerCase())
      );

      // 2. Check Specialization match (direct Guid ID match or decoded name match)
      const jobSpecId = job.specializationId || "";
      const jobSpecName = typeof job.specialization === 'string' 
        ? job.specialization 
        : (job.specializationName || job.specialization?.name || "");

      const isSpecializationMatch = !!(
        (jobSpecId && expertSpecialization && jobSpecId === expertSpecialization) ||
        (jobSpecName && resolvedExpertSpecName && String(jobSpecName).toLowerCase() === String(resolvedExpertSpecName).toLowerCase())
      );

      // 3. Check Skills match (count matching skills)
      const jobSkills = job.requiredSkills || (Array.isArray(job.jobPostSkills) ? job.jobPostSkills.map(s => s.skill?.name).filter(Boolean) : []);
      let matchedSkillsCount = 0;

      jobSkills.forEach(js => {
        const hasSkill = expertSkillsResolved.some(es => String(es).toLowerCase() === String(js).toLowerCase());
        if (hasSkill) matchedSkillsCount++;
      });
      const isSkillMatch = matchedSkillsCount > 0;

      // 4. Aggregate matching factors (value from 0 to 3)
      const factorCount = (isCategoryMatch ? 1 : 0) + (isSpecializationMatch ? 1 : 0) + (isSkillMatch ? 1 : 0);

      // Compute matchPct based on matching factors to display on UI
      let matchPct = 0;
      if (isCategoryMatch) matchPct += 40;
      if (isSpecializationMatch) matchPct += 30;
      if (jobSkills.length > 0) {
        matchPct += Math.round((matchedSkillsCount / jobSkills.length) * 30);
      } else if (isSkillMatch) {
        matchPct += 30;
      }

      return {
        ...job,
        isCategoryMatch,
        isSpecializationMatch,
        isSkillMatch,
        matchedSkillsCount,
        factorCount,
        matchPct: Math.min(100, Math.max(0, matchPct))
      };
    });
    // Removed hard filtering to always show jobs (even if unmatched), 
    // matched jobs will be sorted to the top.

  // SORTING PRIORITY
  scoredJobs.sort((a, b) => {
    // STEP 1: Sort by matching factor count (3 factors > 2 factors > 1 factor)
    if (b.factorCount !== a.factorCount) {
      return b.factorCount - a.factorCount;
    }

    // STEP 2: If matching exactly 1 factor (factorCount === 1)
    if (a.factorCount === 1) {
      const getSubGroupPriority = (job) => {
        if (job.isCategoryMatch) return 3;       // Category match prioritized
        if (job.isSpecializationMatch) return 2; // Specialization match second
        if (job.isSkillMatch) return 1;          // Skills match last
        return 0;
      };

      const priorityA = getSubGroupPriority(a);
      const priorityB = getSubGroupPriority(b);

      if (priorityB !== priorityA) {
        return priorityB - priorityA;
      }

      // STEP 3: If matching skills only, sort by count descending (fine-tuning)
      if (priorityA === 1) {
        if (b.matchedSkillsCount !== a.matchedSkillsCount) {
          return b.matchedSkillsCount - a.matchedSkillsCount;
        }
      }
    }

    // STEP 4: If in Priority 2 or 1 group, prioritize jobs with more matching skills
    if (b.matchedSkillsCount !== a.matchedSkillsCount) {
      return b.matchedSkillsCount - a.matchedSkillsCount;
    }

    // STEP 5: Last sub-criteria - Sort by newest creation time (createdAt descending)
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    if (dateB.getTime() !== dateA.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }

    // STEP 6: Sort by higher budget
    return (Number(b.budget) || 0) - (Number(a.budget) || 0);
  });

  return scoredJobs;
}

/**
 * Filters and ranks Experts based on compatibility with a specific Project (for Client).
 * 
 * @param {Object} projectData - Project details (contains category, specialization, requiredSkills).
 * @param {Array} totalExperts - Array of existing experts.
 * @param {Array} allSkills - List of all skills from DB.
 * @param {Array} allCategories - List of all categories from DB.
 * @returns {Array} List of ranked recommended Experts.
 */
export function getRecommendedExperts(projectData, totalExperts, allSkills = [], allCategories = []) {
  if (!projectData || !totalExperts || !Array.isArray(totalExperts)) {
    return [];
  }

  // 1. Get info from Project
  const projectCatId = projectData.category || "";
  const projectSpecId = projectData.specialization || "";
  const projectSkillIds = projectData.requiredSkills || [];

  // Decode Project Category & Specialization name (if Client selects Guid ID from Dropdown)
  let resolvedProjectCatName = projectCatId;
  let resolvedProjectSpecName = projectSpecId;
  
  if (Array.isArray(allCategories) && allCategories.length > 0) {
    const catMatch = allCategories.find(c => c.id === projectCatId);
    if (catMatch) resolvedProjectCatName = catMatch.name;

    for (const cat of allCategories) {
      const specMatch = cat.specializations?.find(s => s.id === projectSpecId);
      if (specMatch) {
        resolvedProjectSpecName = specMatch.name;
        break;
      }
    }
  }

  // Decode Project skills
  const resolvedProjectSkills = projectSkillIds.map(sk => {
    if (typeof sk === "string" && sk.startsWith("skill-") && Array.isArray(allSkills)) {
      const match = allSkills.find(s => s.id === sk);
      return match ? match.name : sk;
    }
    return typeof sk === "string" ? sk : sk?.name || "";
  });

  // 2. Score each Expert
  const scoredExperts = totalExperts.map(expert => {
    // Extract from mapped Expert object or original user object
    const profile = expert.expertProfile || expert || {};
    let expCatName = profile.category || expert.category || "";
    let expSpecName = profile.specialization || profile.major || expert.specialization || "";
    
    // Decode Expert ID if stored as Guid
    if (Array.isArray(allCategories) && allCategories.length > 0) {
      const cMatch = allCategories.find(c => c.id === expCatName);
      if (cMatch) expCatName = cMatch.name;

      for (const cat of allCategories) {
        const sMatch = cat.specializations?.find(s => s.id === expSpecName);
        if (sMatch) {
          expSpecName = sMatch.name;
          if (!expCatName) {
            expCatName = cat.name;
          }
          break;
        }
      }
    }

    const expertSkills = profile.skills || expert.skills || [];
    const resolvedExpSkills = expertSkills.map(sk => {
      if (typeof sk === "string" && sk.startsWith("skill-") && Array.isArray(allSkills)) {
        const match = allSkills.find(s => s.id === sk);
        return match ? match.name : sk;
      }
      return typeof sk === "string" ? sk : sk?.name || "";
    });

    // Compute match (Accept matching ID or decoded Name)
    const isCategoryMatch = !!(
      (projectCatId && expCatName === projectCatId) || 
      (resolvedProjectCatName && expCatName.toLowerCase() === resolvedProjectCatName.toLowerCase())
    );

    const isSpecializationMatch = !!(
      (projectSpecId && expSpecName === projectSpecId) || 
      (resolvedProjectSpecName && expSpecName.toLowerCase() === resolvedProjectSpecName.toLowerCase())
    );

    let matchedSkillsCount = 0;
    resolvedProjectSkills.forEach(ps => {
      if (resolvedExpSkills.some(es => es.toLowerCase() === ps.toLowerCase())) {
        matchedSkillsCount++;
      }
    });
    
    // Scoring system
    let score = 0;
    if (isCategoryMatch) score += 10;
    if (isSpecializationMatch) score += 20; // Specialization match is the most important
    score += matchedSkillsCount * 5; // Each matching skill adds 5 points

    // Boost for new Experts (<= 3 projects)
    const completed = profile.completedProjects || expert.completedProjects || 0;
    if (completed <= 3) {
      score += 15;
    }

    return {
      ...expert,
      score,
      matchedSkillsCount,
      // Update UI with clean decoded names
      category: resolvedProjectCatName && isCategoryMatch ? resolvedProjectCatName : (expCatName.match(/^[0-9a-fA-F-]{36}$/) ? "AI & Computing" : expCatName),
      specialization: resolvedProjectSpecName && isSpecializationMatch ? resolvedProjectSpecName : (expSpecName.match(/^[0-9a-fA-F-]{36}$/) ? "AI Specialist" : expSpecName),
      skills: resolvedExpSkills
    };
  });

  // 3. Ranking
  return scoredExperts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.matchedSkillsCount !== a.matchedSkillsCount) return b.matchedSkillsCount - a.matchedSkillsCount;
    return (b.rating || 0) - (a.rating || 0);
  });
}