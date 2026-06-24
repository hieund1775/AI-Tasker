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
export function getRecommendedProjects(expertData, totalJobs, allSkills = []) {
  if (!expertData || !totalJobs || !Array.isArray(totalJobs)) {
    return [];
  }

  // Trích xuất profile chuyên gia an toàn (chấp nhận cả đối tượng user hoặc profile trực tiếp)
  const profile = expertData.expertProfile || expertData || {};

  // Lấy các thuộc tính cần so sánh
  const expertCategory = profile.category || "";
  const expertSpecialization = profile.specialization || profile.major || "";
  const expertSkills = profile.skills || [];

  // Phân giải skill từ ID sang tên thực tế của Expert (nếu lưu dưới dạng skill-xxx)
  const expertSkillsResolved = expertSkills.map(sk => {
    if (typeof sk === "string" && sk.startsWith("skill-") && Array.isArray(allSkills)) {
      const match = allSkills.find(s => s.id === sk);
      return match ? match.name : sk;
    }
    return typeof sk === "string" ? sk : sk?.name || "";
  });

  // Duyệt và tính toán các chỉ số trùng khớp của từng Job
  const scoredJobs = totalJobs
    .map(job => {
      // 1. Kiểm tra trùng Category (Không phân biệt hoa thường)
      const jobCat = job.category || job.aiCategoryDomain?.name || "";
      const isCategoryMatch = !!(jobCat && expertCategory && jobCat.toLowerCase() === expertCategory.toLowerCase());

      // 2. Kiểm tra trùng Specialization (Không phân biệt hoa thường)
      const jobSpec = job.specialization || "";
      const isSpecializationMatch = !!(jobSpec && expertSpecialization && jobSpec.toLowerCase() === expertSpecialization.toLowerCase());

      // 3. Kiểm tra trùng Skills (Đếm số lượng skill trùng khớp)
      const jobSkills = job.requiredSkills || job.jobPostSkills?.map(s => s.skill?.name) || [];
      let matchedSkillsCount = 0;

      jobSkills.forEach(js => {
        const hasSkill = expertSkillsResolved.some(es => es.toLowerCase() === js.toLowerCase());
        if (hasSkill) matchedSkillsCount++;
      });
      const isSkillMatch = matchedSkillsCount > 0;

      // 4. Tổng hợp số yếu tố trùng khớp (Giá trị từ 0 đến 3)
      const factorCount = (isCategoryMatch ? 1 : 0) + (isSpecializationMatch ? 1 : 0) + (isSkillMatch ? 1 : 0);

      // Tính tỷ lệ matchPct thực tế dựa trên các yếu tố trùng khớp để hiển thị UI
      // Category: 40%, Specialization: 30%, Skills: 30% (tính theo tỷ lệ số skill trùng / tổng số skill yêu cầu)
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
    })
    // BỘ LỌC CỨNG (Filtering): Loại bỏ hoàn toàn nếu không trùng khớp bất kỳ yếu tố nào
    .filter(job => job.factorCount > 0);

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
    return b.budget - a.budget;
  });

  return scoredJobs;
}
