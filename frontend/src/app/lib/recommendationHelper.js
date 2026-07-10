/**
 * AITasker Recommendation Algorithm Helper
 * 
 * Thuật toán lọc và xếp hạng các công việc gợi ý cho Expert dựa trên mức độ phù hợp:
 *   - Lọc cứng: Loại bỏ các Job không trùng khớp bất kỳ yếu tố nào (Category, Specialization, Skills).
 *   - Sắp xếp thứ tự ưu tiên:
 *      + Ưu tiên 1 (Cao nhất): Trùng cả 3 yếu tố (Category VÀ Specialization VÀ ít nhất 1 Skill).
 *      + Ưu tiên 2 (Trung bình): Trùng đúng 2 trong 3 yếu tố.
 *      + Ưu tiên 3 (Thấp nhất): Chỉ trùng duy nhất 1 yếu tố. Phân cấp nội bộ: Trùng Category -> Trùng Specialization -> Trùng Skills.
 *      + Tinh chỉnh (Fine-tuning): Trong nhóm trùng Skills, ưu tiên các Job trùng nhiều Skill với Expert hơn.
 */

/**
 * Lọc và sắp xếp các JobPost theo mức độ tương thích với hồ sơ Expert.
 * 
 * @param {Object} expertData - Thông tin Expert (User hoặc expertProfile trực tiếp).
 * @param {Array} totalJobs - Mảng các công việc hiện có (JobPosts).
 * @param {Array} allSkills - Danh sách tất cả các Skill từ DB để phân giải Skill ID nếu cần.
 * @returns {Array} Danh sách công việc được gợi ý đã qua lọc và xếp hạng.
 */
export function getRecommendedProjects(expertData, totalJobs, allSkills = [], allCategories = []) {
  if (!expertData || !totalJobs || !Array.isArray(totalJobs)) {
    return [];
  }

  // Trích xuất profile chuyên gia an toàn (chấp nhận cả đối tượng user hoặc profile trực tiếp)
  const profile = expertData.expertProfile || expertData || {};

  // Lấy các thuộc tính cần so sánh
  let expertCategory = profile.category || "";
  const expertSpecialization = profile.specialization || profile.major || "";
  const expertSkills = profile.skills || [];

  // Giải mã Category Name và Specialization Name của Expert nếu lưu dưới dạng Guid ID
  let resolvedExpertCatName = expertCategory;
  let resolvedExpertSpecName = expertSpecialization;

  if (Array.isArray(allCategories) && allCategories.length > 0) {
    const catMatch = allCategories.find(c => c.id === expertCategory);
    if (catMatch) {
      resolvedExpertCatName = catMatch.name;
    }
    
    // Tìm specialization trong tất cả các category
    for (const cat of allCategories) {
      const specMatch = cat.specializations?.find(s => s.id === expertSpecialization);
      if (specMatch) {
        resolvedExpertSpecName = specMatch.name;
        // TỰ ĐỘNG SUY RA CATEGORY NẾU CHUYÊN GIA KHÔNG LƯU CATEGORY TRONG DB
        if (!expertCategory) {
          expertCategory = cat.id;
          resolvedExpertCatName = cat.name;
        }
        break;
      }
    }
  }

  // Phân giải skill từ ID sang tên thực tế của Expert (nếu lưu dưới dạng skill-xxx)
  const expertSkillsResolved = expertSkills.map(sk => {
    if (typeof sk === "string" && sk.startsWith("skill-") && Array.isArray(allSkills)) {
      const match = allSkills.find(s => s.id === sk);
      return match ? match.name : sk;
    }
    return typeof sk === "string" ? sk : sk?.name || "";
  }).filter(Boolean);

  // Duyệt và tính toán các chỉ số trùng khớp của từng Job
  const scoredJobs = totalJobs
    .map(job => {
      // 1. Kiểm tra trùng Category (Bằng Guid ID trực tiếp hoặc giải mã tên giống nhau)
      const jobCatId = job.domainId || job.domain?.id || job.aiCategoryDomainId || "";
      const jobCatName = job.category || job.domain?.name || job.aiCategoryDomain?.name || "";

      const isCategoryMatch = !!(
        (jobCatId && expertCategory && jobCatId === expertCategory) ||
        (jobCatName && resolvedExpertCatName && String(jobCatName).toLowerCase() === String(resolvedExpertCatName).toLowerCase())
      );

      // 2. Kiểm tra trùng Specialization (Bằng Guid ID trực tiếp hoặc giải mã tên giống nhau)
      const jobSpecId = job.specializationId || "";
      const jobSpecName = typeof job.specialization === 'string' 
        ? job.specialization 
        : (job.specializationName || job.specialization?.name || "");

      const isSpecializationMatch = !!(
        (jobSpecId && expertSpecialization && jobSpecId === expertSpecialization) ||
        (jobSpecName && resolvedExpertSpecName && String(jobSpecName).toLowerCase() === String(resolvedExpertSpecName).toLowerCase())
      );

      // 3. Kiểm tra trùng Skills (Đếm số lượng skill trùng khớp)
      const jobSkills = job.requiredSkills || (Array.isArray(job.jobPostSkills) ? job.jobPostSkills.map(s => s.skill?.name).filter(Boolean) : []);
      let matchedSkillsCount = 0;

      jobSkills.forEach(js => {
        const hasSkill = expertSkillsResolved.some(es => String(es).toLowerCase() === String(js).toLowerCase());
        if (hasSkill) matchedSkillsCount++;
      });
      const isSkillMatch = matchedSkillsCount > 0;

      // 4. Tổng hợp số yếu tố trùng khớp (Giá trị từ 0 đến 3)
      const factorCount = (isCategoryMatch ? 1 : 0) + (isSpecializationMatch ? 1 : 0) + (isSkillMatch ? 1 : 0);

      // Tính tỷ lệ matchPct thực tế dựa trên các yếu tố trùng khớp để hiển thị UI
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
    // Đã bỏ BỘ LỌC CỨNG để luôn hiển thị công việc (kể cả khi chưa khớp), 
    // công việc khớp sẽ được xếp lên đầu.

  // XẾP HẠNG ƯU TIÊN (Sorting Priority)
  scoredJobs.sort((a, b) => {
    // BƯỚC 1: Sắp xếp theo số lượng yếu tố trùng khớp (3 yếu tố > 2 yếu tố > 1 yếu tố)
    if (b.factorCount !== a.factorCount) {
      return b.factorCount - a.factorCount;
    }

    // BƯỚC 2: Nếu cùng trùng 1 yếu tố (factorCount === 1)
    if (a.factorCount === 1) {
      const getSubGroupPriority = (job) => {
        if (job.isCategoryMatch) return 3;       // Trùng Category xếp trước
        if (job.isSpecializationMatch) return 2; // Trùng Specialization xếp sau
        if (job.isSkillMatch) return 1;          // Trùng Skills xếp cuối
        return 0;
      };

      const priorityA = getSubGroupPriority(a);
      const priorityB = getSubGroupPriority(b);

      if (priorityB !== priorityA) {
        return priorityB - priorityA;
      }

      // BƯỚC 3: Nếu cùng trùng duy nhất Skills, xếp theo số lượng skill trùng giảm dần (Fine-tuning)
      if (priorityA === 1) {
        if (b.matchedSkillsCount !== a.matchedSkillsCount) {
          return b.matchedSkillsCount - a.matchedSkillsCount;
        }
      }
    }

    // BƯỚC 4: Nếu cùng nhóm Ưu tiên 2 hoặc Ưu tiên 1, ưu tiên thêm Job nào có số skill trùng khớp nhiều hơn
    if (b.matchedSkillsCount !== a.matchedSkillsCount) {
      return b.matchedSkillsCount - a.matchedSkillsCount;
    }

    // BƯỚC 5: Tiêu chí phụ cuối - Sắp xếp theo thời gian tạo mới nhất (createdAt giảm dần)
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    if (dateB.getTime() !== dateA.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }

    // BƯỚC 6: Xếp theo ngân sách lớn hơn
    return (Number(b.budget) || 0) - (Number(a.budget) || 0);
  });

  return scoredJobs;
}

/**
 * Lọc và sắp xếp các Expert theo mức độ tương thích với một Project cụ thể (dành cho Client).
 * 
 * @param {Object} projectData - Thông tin Project (chứa category, specialization, requiredSkills).
 * @param {Array} totalExperts - Mảng các chuyên gia hiện có.
 * @param {Array} allSkills - Danh sách tất cả các Skill từ DB.
 * @param {Array} allCategories - Danh sách tất cả các Category từ DB.
 * @returns {Array} Danh sách Expert được gợi ý đã qua xếp hạng.
 */
export function getRecommendedExperts(projectData, totalExperts, allSkills = [], allCategories = []) {
  if (!projectData || !totalExperts || !Array.isArray(totalExperts)) {
    return [];
  }

  // 1. Lấy thông tin từ Project
  const projectCatId = projectData.category || "";
  const projectSpecId = projectData.specialization || "";
  const projectSkillIds = projectData.requiredSkills || [];

  // Giải mã tên Category & Specialization của Project (trường hợp Client chọn Guid ID từ Dropdown)
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

  // Giải mã kỹ năng của Project
  const resolvedProjectSkills = projectSkillIds.map(sk => {
    if (typeof sk === "string" && sk.startsWith("skill-") && Array.isArray(allSkills)) {
      const match = allSkills.find(s => s.id === sk);
      return match ? match.name : sk;
    }
    return typeof sk === "string" ? sk : sk?.name || "";
  });

  // 2. Chấm điểm từng Expert
  const scoredExperts = totalExperts.map(expert => {
    // Trích xuất từ object Expert đã map hoặc user object nguyên gốc
    const profile = expert.expertProfile || expert || {};
    let expCatName = profile.category || expert.category || "";
    let expSpecName = profile.specialization || profile.major || expert.specialization || "";
    
    // Giải mã ID của Expert nếu bị lưu thành Guid
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

    // Tính toán trùng khớp (Chấp nhận trùng ID hoặc trùng Tên đã giải mã)
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
    
    // Hệ thống tính điểm
    let score = 0;
    if (isCategoryMatch) score += 10;
    if (isSpecializationMatch) score += 20; // Trùng chuyên ngành là quan trọng nhất
    score += matchedSkillsCount * 5; // Mỗi kỹ năng trùng cộng 5 điểm

    // Boost cho Expert mới (<= 3 projects)
    const completed = profile.completedProjects || expert.completedProjects || 0;
    if (completed <= 3) {
      score += 15;
    }

    return {
      ...expert,
      score,
      matchedSkillsCount,
      // Cập nhật lại UI bằng tên đã giải mã đẹp
      category: resolvedProjectCatName && isCategoryMatch ? resolvedProjectCatName : (expCatName.match(/^[0-9a-fA-F-]{36}$/) ? "AI & Computing" : expCatName),
      specialization: resolvedProjectSpecName && isSpecializationMatch ? resolvedProjectSpecName : (expSpecName.match(/^[0-9a-fA-F-]{36}$/) ? "AI Specialist" : expSpecName),
      skills: resolvedExpSkills
    };
  });

  // 3. Xếp hạng
  return scoredExperts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.matchedSkillsCount !== a.matchedSkillsCount) return b.matchedSkillsCount - a.matchedSkillsCount;
    return (b.rating || 0) - (a.rating || 0);
  });
}