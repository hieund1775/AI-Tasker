// =============================================================================
// AITasker Mock API Handler
// =============================================================================
// Intercepts API calls when VITE_USE_MOCK_DB=true and routes them to mock data.
// Simulates network delay (150-400ms) for realistic UX.
// Extracts current user from JWT token for auth-scoped queries.
// =============================================================================

import {
  getUserById,
  listUsers,
  getUserWallet,
  updateUser,
  getExpertProfile,
  createUser,
  listCategories,
  listSkills,
  createCategory,
  createSkill,
  deleteCategory,
  deleteSkill,
  listJobPosts,
  getJobPostById,
  createJobPost,
  updateJobPost,
  listProposals,
  getProposalById,
  createProposal,
  updateProposal,
  updateProposalStatus,
  deleteProposal,
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  updateProjectStatus,
  submitProjectFinalWork,
  acceptProjectFinalDelivery,
  declineProjectFinalDelivery,
  listTransactions,
  createTransaction,
  listReports,
  getReportById,
  createReport,
  updateReport,
  listReviews,
  getReviewById,
  updateReview,
  deleteReview,
  listNotifications,
  updateNotification,
  markAllNotificationsRead,
  createNotification,
  listMessages,
  createMessage,
  listTasks,
  createTask,
  getDashboardStats,
  getRevenueData,
  generateId,
  cancelProjectContract,
} from "./mockDatabase.js";
import {
  notifyFinalWorkSubmitted,
  notifyFinalDeliveryAccepted,
  notifyFinalDeliveryDeclined,
  notifyPaymentReleased,
  notifyDisputeFiled,
  notifyDisputeResolved,
  notifyMoreEvidenceRequested,
} from "../services/notificationHelper.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate network delay (150-400ms) */
function delay() {
  const ms = 150 + Math.random() * 250;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse query string into object */
function parseQuery(queryString) {
  if (!queryString) return {};
  const params = new URLSearchParams(queryString);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

/** Extract user info from JWT token */
function extractUserFromToken(token) {
  if (!token) return null;
  try {
    let payload = null;
    let email = null;
    let userId = null;
    let role = null;
    let name = null;

    if (token.endsWith(".demo-signature")) {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      email = payload.email;
      userId = payload.sub;
      role = payload.role;
      name = payload.name;
    } else {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      email = payload.email || payload.sub;
      userId = payload.sub;
      role = payload.role;
      name = payload.name || payload.fullName;
    }

    if (!email && !userId) return null;

    const allUsers = listUsers();
    let user = allUsers.find(
      (u) =>
        (email && u.email?.toLowerCase() === email.toLowerCase()) ||
        (userId && u.id === userId)
    );

    if (!user) {
      // User doesn't exist in mock database, create them dynamically in the runtime overlay
      const finalRole = role || (email?.toLowerCase().includes("expert") ? "expert" : "client");
      const finalName = name || email?.split("@")[0] || "User";
      const finalId = userId || `user-${Date.now()}`;
      
      const expertProfile = finalRole === "expert" ? {
        jobTitle: "Senior AI Engineer",
        category: "Artificial Intelligence",
        specialization: "Machine Learning",
        skills: ["Python", "PyTorch", "TensorFlow"],
        location: "Vietnam",
        website: "",
        industry: "Technology",
        phone: "+84-555-0201",
        bio: "AI Specialist profile.",
        hourlyRate: 80,
        completedProjects: 0,
        education: "",
        certifications: []
      } : null;

      user = createUser({
        id: finalId,
        email: email || `${finalName.toLowerCase()}@example.com`,
        fullName: finalName,
        role: finalRole,
        password: "password123",
        status: "active",
        hasProfile: true,
        expertProfile,
        wallet: { balance: 50000, pendingBalance: 0, totalEarned: 0 }
      });
    }

    return user;
  } catch (e) {
    console.error("Error extracting user from token:", e);
    return null;
  }
}

/** Simple ApiError class matching the real ApiError shape */
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ---------------------------------------------------------------------------
// Endpoint pattern matchers
// ---------------------------------------------------------------------------

/** Match /Users/{id} pattern: /Users/xxx where xxx is not a known sub-path */
function matchUserId(path) {
  const m = path.match(/^\/Users\/([^/]+)$/i);
  if (!m) return null;
  // Exclude known sub-paths
  const id = m[1];
  if (["login", "register", "logout", "test-expert-profile"].includes(id.toLowerCase())) return null;
  return id;
}

function matchUserExpertProfile(path) {
  const m = path.match(/^\/Users\/([^/]+)\/expert-profile$/i);
  return m ? m[1] : null;
}

function matchJobPostId(path) {
  const m = path.match(/^\/JobPosts\/([^/]+)$/i);
  return m ? m[1] : null;
}

function matchProjectClient(path) {
  const m = path.match(/^\/Projects\/client\/([^/]+)$/i);
  return m ? m[1] : null;
}

function matchProjectExpert(path) {
  const m = path.match(/^\/Projects\/expert\/([^/]+)$/i);
  return m ? m[1] : null;
}

function matchProjectId(path) {
  const m = path.match(/^\/Projects\/([^/]+)$/i);
  return m ? m[1] : null;
}

function matchProjectStatus(path) {
  const m = path.match(/^\/Projects\/([^/]+)\/status$/i);
  return m ? m[1] : null;
}

function matchProjectSubmitWork(path) {
  const m = path.match(/^\/Projects\/([^/]+)\/submit-work$/i);
  return m ? m[1] : null;
}

function matchProjectAcceptFinal(path) {
  const m = path.match(/^\/Projects\/([^/]+)\/accept-final$/i);
  return m ? m[1] : null;
}

function matchProjectDeclineFinal(path) {
  const m = path.match(/^\/Projects\/([^/]+)\/decline-final$/i);
  return m ? m[1] : null;
}


function matchProposalExpert(path) {
  const m = path.match(/^\/Proposals\/expert\/([^/]+)$/i);
  return m ? m[1] : null;
}

function matchProposalJob(path) {
  const m = path.match(/^\/Proposals\/job\/([^/]+)$/i);
  return m ? m[1] : null;
}

function matchProposalId(path) {
  const m = path.match(/^\/Proposals\/([^/]+)$/i);
  return m ? m[1] : null;
}

function matchProposalStatus(path) {
  const m = path.match(/^\/Proposals\/([^/]+)\/status$/i);
  return m ? m[1] : null;
}

function matchCategorySkillId(path) {
  const m = path.match(/^\/category-tags\/skills\/([^/]+)$/);
  return m ? m[1] : null;
}

function matchCategoryCatId(path) {
  const m = path.match(/^\/category-tags\/categories\/([^/]+)$/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Individual route handlers
// ---------------------------------------------------------------------------

async function handleLogin(body) {
  const { email, password } = body || {};
  if (!email || !password) throw new ApiError("Email and password are required.", 400);
  const allUsers = listUsers();
  const user = allUsers.find((u) => u.email?.toLowerCase() === email?.toLowerCase());
  if (!user) throw new ApiError("Invalid email or password.", 401);
  // For mock DB, accept any password with their email or the mock password
  if (password !== user.password && password !== "password123" && password.length < 3) {
    throw new ApiError("Invalid email or password.", 401);
  }
  // Create a mock JWT token
  const header = { alg: "HS256", typ: "JWT" };
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.fullName,
    iat: nowInSeconds,
    exp: nowInSeconds + 24 * 60 * 60,
  };
  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const token = `${encode(header)}.${encode(payload)}.mock-signature`;
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      hasProfile: user.hasProfile,
    },
  };
}

async function handleRegister(body) {
  const { email, password, fullName, role } = body || {};
  if (!email || !password) throw new ApiError("Email and password are required.", 400);
  const allUsers = listUsers();
  if (allUsers.find((u) => u.email?.toLowerCase() === email?.toLowerCase())) {
    throw new ApiError("Email already registered.", 409);
  }
  
  // Actually create user in mock database overlay
  const finalRole = role || "client";
  const expertProfile = finalRole === "expert" ? {
    jobTitle: "Senior AI Engineer",
    category: "Artificial Intelligence",
    specialization: "Machine Learning",
    skills: ["Python", "PyTorch", "TensorFlow"],
    location: "Vietnam",
    website: "",
    industry: "Technology",
    phone: "",
    bio: "AI Specialist profile.",
    hourlyRate: 80,
    completedProjects: 0,
    education: "",
    certifications: []
  } : null;

  createUser({
    id: `user-${Date.now()}`,
    email: email,
    fullName: fullName || email.split("@")[0],
    role: finalRole,
    password: password,
    status: "active",
    hasProfile: true,
    expertProfile,
    wallet: { balance: 50000, pendingBalance: 0, totalEarned: 0 }
  });

  return { success: true, message: "Registration successful. Please login." };
}

async function handleLogout() {
  return { success: true, message: "Logged out successfully." };
}

// =============================================================================
// MAIN ROUTER — exported handler called from api.js
// =============================================================================

export function setupMockMode() {
  // For optional initialization — currently a no-op since all data is static
}

export async function handleMockRequest(endpoint, method, body, authenticated, token) {
  await delay();

  const [path, queryString] = endpoint.split("?");
  const query = parseQuery(queryString);
  const currentUser = token ? extractUserFromToken(token) : null;

  try {
    // ── AUTH ────────────────────────────────────────────────────────────────
    if (path === "/users/login" && method === "POST") return handleLogin(body);
    if (path === "/users/register" && method === "POST") return handleRegister(body);
    if (path === "/users/logout" && method === "POST") return handleLogout();

    // ── USERS ───────────────────────────────────────────────────────────────
    if (path === "/Users" && method === "GET") {
      let users = listUsers();
      // Apply query filters
      if (query.role) users = users.filter((u) => u.role?.toLowerCase() === query.role.toLowerCase());
      if (query.search) {
        const s = query.search.toLowerCase();
        users = users.filter((u) => u.fullName?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s));
      }
      // If limit is specified, return paginated shape
      if (query.limit) {
        const page = parseInt(query.page || "1", 10);
        const limit = parseInt(query.limit, 10);
        const start = (page - 1) * limit;
        return { data: users.slice(start, start + limit), total: users.length, page };
      }
      return users;
    }

    if (method === "GET") {
      const userId = matchUserId(path);
      if (userId) return getUserById(userId);
    }

    if (method === "PUT" || method === "PATCH") {
      const userId = matchUserId(path);
      if (userId) {
        const updated = updateUser(userId, body);
        return getUserById(userId); // return fresh user
      }
    }

    // GET /Users/{id}/expert-profile
    if (method === "GET") {
      const expertId = matchUserExpertProfile(path);
      if (expertId) {
        const profile = getExpertProfile(expertId);
        if (!profile) throw new ApiError("Expert profile not found.", 404);
        return profile;
      }
    }

    // PUT /Users/{id}/expert-profile
    if ((method === "PUT" || method === "POST") && matchUserExpertProfile(path)) {
      const expertId = matchUserExpertProfile(path);
      const userObj = getUserById(expertId);
      if (userObj) {
        const updatedProfile = {
          ...userObj.expertProfile,
          jobTitle: body.jobTitle || "Chưa cập nhật",
          major: body.major || body.specialization || "Chưa cập nhật",
          category: body.category || "",
          specialization: body.specialization || "",
          skills: body.skills || [],
          portfolioUrls: body.portfolioUrls || "",
          bio: body.bio || "",
          hourlyRate: Number(body.hourlyRate) || 0,
          location: body.location || "Chưa cập nhật",
          website: body.website || "",
          industry: body.industry || "",
          phone: body.phone || userObj.expertProfile?.phone || "",
        };
        updateUser(expertId, { 
          expertProfile: updatedProfile, 
          status: body.phone || userObj.status 
        });
      }
      return { success: true, message: "Expert profile updated." };
    }

    // GET /Users/test-expert-profile
    if (path === "/Users/test-expert-profile" && method === "GET") {
      return { hasProfile: currentUser?.expertProfile ? true : false };
    }

    // ── JOB POSTS ───────────────────────────────────────────────────────────
    if (path === "/JobPosts" && method === "GET") {
      let jobs = listJobPosts();
      if (query.clientId) jobs = jobs.filter((j) => j.clientId === query.clientId);
      if (query.status) jobs = jobs.filter((j) => j.status === query.status);
      if (query.search) {
        const s = query.search.toLowerCase();
        jobs = jobs.filter((j) => j.title?.toLowerCase().includes(s) || j.description?.toLowerCase().includes(s));
      }
      return jobs;
    }

    if (path === "/JobPosts/search-filter" && method === "GET") {
      let jobs = listJobPosts();
      if (query.search) {
        const s = query.search.toLowerCase();
        jobs = jobs.filter((j) => j.title?.toLowerCase().includes(s) || j.description?.toLowerCase().includes(s) || j.requiredSkills?.some((sk) => sk.toLowerCase().includes(s)));
      }
      if (query.categoryId) jobs = jobs.filter((j) => j.aiCategoryDomainId === query.categoryId || j.skillIds?.includes(query.categoryId));
      if (query.minBudget) jobs = jobs.filter((j) => j.budget >= parseInt(query.minBudget, 10));
      if (query.maxBudget) jobs = jobs.filter((j) => j.budget <= parseInt(query.maxBudget, 10));
      if (query.status) jobs = jobs.filter((j) => j.status === query.status);
      return jobs;
    }

    if (method === "GET") {
      const jobId = matchJobPostId(path);
      if (jobId) {
        const job = getJobPostById(jobId);
        if (!job) throw new ApiError("Job post not found.", 404);
        return job;
      }
    }

    if (path === "/JobPosts" && method === "POST") {
      const newJob = createJobPost({
        ...body,
        id: generateId("job"),
        clientId: body.clientId || currentUser?.id,
        client: currentUser?.fullName || body.client || "Unknown",
        status: body.status || "open",
        jobPostSkills: (body.skillIds || []).map((sid) => {
          const skills = listSkills();
          const skill = skills.find((s) => s.id === sid);
          return { skillsId: sid, skill: { name: skill?.name || sid } };
        }),
        requiredSkills: body.requiredSkills || [],
      });
      return newJob;
    }

    if (method === "PUT") {
      const jobId = matchJobPostId(path);
      if (jobId) {
        const updated = updateJobPost(jobId, body);
        if (!updated) throw new ApiError("Job post not found.", 404);
        
        if (body.status === "pending_escrow" || body.status === "pending_pay" || body.status === "in_progress") {
          const projects = listProjects();
          const existingProj = projects.find((p) => p.jobPostId === jobId);
          if (!existingProj) {
            const props = listProposals();
            const acceptedProp = props.find((p) => p.jobPostId === jobId && (p.status === "accepted" || p.status === "pending_escrow" || p.status === "pending_pay" || p.status === "Pending" || p.status === "Pending Escrow"));
            if (acceptedProp) {
              // ponytail: check expiry — 7 days from submitted
              const createdAt = new Date(acceptedProp.createdAt).getTime();
              const now = Date.now();
              const isExpired = !isNaN(createdAt) && (now - createdAt > 7 * 24 * 60 * 60 * 1000);
              if (isExpired) throw new ApiError("Proposal has expired (7-day limit). Cannot accept.", 400);

              // Use expert bid amount & estimated days, preserve client original as reference
              createProject({
                id: generateId("proj"),
                jobPostId: jobId,
                clientId: updated.clientId,
                assignedExpertId: acceptedProp.expertId,
                title: updated.title,
                description: updated.description,
                budget: acceptedProp.bidAmount || updated.budget,
                deadline: String(acceptedProp.estimatedDays || updated.deadline),
                originalClientBudget: updated.budget,
                originalClientDeadline: String(updated.deadline),
                status: body.status === "in_progress" ? "active" : body.status,
                acceptedProposalId: acceptedProp.id,
              });

              // Reject all other proposals for the same job post
              props.forEach((p) => {
                if (p.jobPostId === jobId && p.id !== acceptedProp.id && p.status !== "rejected" && p.status !== "declined") {
                  updateProposalStatus(p.id, "rejected");
                }
              });

              // Close the job post
              updateJobPost(jobId, { status: "closed" });
            }
          } else {
            updateProject(existingProj.id, { status: body.status === "in_progress" ? "active" : body.status });
          }
        }
        
        return updated;
      }
    }

    // ── PROJECTS ─────────────────────────────────────────────────────────────
    if (path === "/Projects" && method === "GET") {
      let projects = listProjects();
      if (query.clientId) projects = projects.filter((p) => p.clientId === query.clientId);
      if (query.expertId) projects = projects.filter((p) => p.assignedExpertId === query.expertId);
      if (query.status) projects = projects.filter((p) => p.status === query.status);
      if (query.limit) {
        const page = parseInt(query.page || "1", 10);
        const limit = parseInt(query.limit, 10);
        const start = (page - 1) * limit;
        return { data: projects.slice(start, start + limit), total: projects.length, page };
      }
      return projects;
    }

    if (path === "/Projects" && method === "POST") {
      const newProject = createProject({
        ...body,
        id: generateId("proj"),
        clientId: body.clientId || currentUser?.id,
        status: body.status || "in_progress",
        escrowAmount: body.escrowAmount || body.budget || 0,
      });
      return newProject;
    }

    if (method === "POST") {
      const acceptFinalId = matchProjectAcceptFinal(path);
      if (acceptFinalId) {
        const updated = acceptProjectFinalDelivery(acceptFinalId, currentUser?.fullName || "Client");
        // Notify expert
        if (updated?.assignedExpertId) {
          notifyFinalDeliveryAccepted({
            expertUserId: updated.assignedExpertId,
            clientName: currentUser?.fullName || "Client",
            projectTitle: updated.title || "",
            projectId: acceptFinalId,
          }).catch(() => {});
        }
        return { success: true, projectId: acceptFinalId, project: updated };
      }

      const declineFinalId = matchProjectDeclineFinal(path);
      if (declineFinalId) {
        const updated = declineProjectFinalDelivery(declineFinalId, currentUser?.fullName || "Client", body?.feedback || body?.reason);
        // Notify expert
        if (updated?.assignedExpertId) {
          notifyFinalDeliveryDeclined({
            expertUserId: updated.assignedExpertId,
            clientName: currentUser?.fullName || "Client",
            projectTitle: updated.title || "",
            feedback: body?.feedback || body?.reason || "",
            projectId: declineFinalId,
          }).catch(() => {});
        }
        return { success: true, projectId: declineFinalId, project: updated };
      }
    }


    if (method === "GET") {
      const clientId = matchProjectClient(path);
      if (clientId) return listProjects((p) => p.clientId === clientId);
      const expertId = matchProjectExpert(path);
      if (expertId) return listProjects((p) => p.assignedExpertId === expertId);
      const projId = matchProjectId(path);
      if (projId) {
        const proj = getProjectById(projId);
        if (!proj) throw new ApiError("Project not found.", 404);
        return proj;
      }
    }

    if (method === "PUT") {
      const statusId = matchProjectStatus(path);
      if (statusId) {
        // Extract status from query param
        const urlObj = new URL("http://dummy" + endpoint);
        const newStatus = urlObj.searchParams.get("status");
        if (newStatus) {
          const updated = updateProjectStatus(statusId, newStatus);
          if (!updated) throw new ApiError("Project not found.", 404);
          return { success: true, projectId: statusId, status: newStatus };
        }
        // If status is in body
        if (body?.status) {
          const updated = updateProjectStatus(statusId, body.status);
          return { success: true, projectId: statusId, status: body.status };
        }
        throw new ApiError("Status parameter required.", 400);
      }

      const submitId = matchProjectSubmitWork(path);
      if (submitId) {
        const updated = submitProjectFinalWork(
          submitId,
          currentUser?.fullName || "Expert",
          body?.projectLink || query.projectLink,
          body?.projectFile || query.projectFile
        );
        // Notify client
        if (updated?.clientId) {
          notifyFinalWorkSubmitted({
            clientUserId: updated.clientId,
            expertName: currentUser?.fullName || "Expert",
            projectTitle: updated.title || "",
            projectId: submitId,
          }).catch(() => {});
        }
        return { success: true, projectId: submitId, status: "submitted", project: updated };
      }
    }

    // ── PROPOSALS ────────────────────────────────────────────────────────────
    if (method === "GET") {
      const expertId = matchProposalExpert(path);
      if (expertId) return listProposals((p) => p.expertId === expertId);
      const jobId = matchProposalJob(path);
      if (jobId) {
        // Accept both job post IDs (job-*) and project IDs (proj-*)
        // If it looks like a project ID, resolve to its jobPostId first
        let resolvedJobId = jobId;
        if (jobId.startsWith("proj-")) {
          const proj = getProjectById(jobId);
          if (proj) resolvedJobId = proj.jobPostId;
        }
        return listProposals((p) => p.jobPostId === resolvedJobId);
      }
      // Filter by clientId: find all job posts by this client, then filter proposals
      if (query.clientId) {
        const clientJobs = listJobPosts((j) => j.clientId === query.clientId);
        const clientJobIds = new Set(clientJobs.map((j) => j.id));
        return listProposals((p) => clientJobIds.has(p.jobPostId));
      }
      const propId = matchProposalId(path);
      if (propId) {
        const prop = getProposalById(propId);
        if (!prop) throw new ApiError("Proposal not found.", 404);
        return prop;
      }
    }

    if (path === "/Proposals/submit-proposal" && method === "POST") {
      const newProp = createProposal({
        ...body,
        id: generateId("proposal"),
        expertId: body.expertId || currentUser?.id,
        status: "pending",
      });
      return newProp;
    }

    if (method === "PUT") {
      const statusId = matchProposalStatus(path);
      if (statusId) {
        const urlObj = new URL("http://dummy" + endpoint);
        const newStatus = urlObj.searchParams.get("status");
        const status = newStatus || body?.status;
        if (status) {
          if (status.toLowerCase() === "accepted" || status.toLowerCase() === "accepted") {
            // --- HIRE EXPERT & AUTO-FUND ESCROW (ATOMIC TRANSACTION) ---
            // In mock mode, accepting a proposal immediately:
            //  1. Deducts bidAmount from client's wallet balance → moves to pendingBalance/escrowBalance
            //  2. Sets proposal → "accepted", rejects all other proposals for same job
            //  3. Sets JobPost → "hired", blocks new applications
            //  4. Creates Project with status "active", escrowPaid=true, escrowStatus="paid"
            //  5. Logs escrow_deposit transaction
            // There is NO intermediate "pending_escrow" step in mock mode — escrow is auto-funded.
            // The Client's wallet.balance must have sufficient funds (checked before proceeding).
            const proposal = getProposalById(statusId);
            if (!proposal) throw new ApiError("Không tìm thấy đề xuất (Proposal).", 404);

            const jobPost = getJobPostById(proposal.jobPostId);
            if (!jobPost) throw new ApiError("Không tìm thấy tin tuyển dụng (Job Post).", 404);

            const clientUser = getUserById(jobPost.clientId);
            if (!clientUser) throw new ApiError("Không tìm thấy thông tin Client.", 404);

            const bidAmount = Number(proposal.bidAmount) || 0;
            const wallet = clientUser.wallet || { balance: 0, pendingBalance: 0, totalEarned: 0 };

            // Kiểm tra số dư ví khả dụng của Client
            if (wallet.balance < bidAmount) {
              throw new ApiError(
                `Số dư ví khả dụng không đủ để thực hiện thuê Expert. Yêu cầu: ${bidAmount.toLocaleString()}, hiện có: ${wallet.balance.toLocaleString()}. Vui lòng nạp thêm tiền.`,
                400
              );
            }

            // 1. Trừ tiền ví Client và chuyển vào số dư ký quỹ (Atomic Update)
            wallet.balance = Number((wallet.balance - bidAmount).toFixed(2));
            wallet.pendingBalance = Number(((wallet.pendingBalance || 0) + bidAmount).toFixed(2));
            wallet.escrowBalance = Number(((wallet.escrowBalance || 0) + bidAmount).toFixed(2));
            updateUser(clientUser.id, { wallet: { ...wallet } });

            // 2. Chuyển proposal được chọn thành "accepted"
            updateProposalStatus(statusId, "accepted");

            // 3. Từ chối ("rejected") toàn bộ các proposal còn lại của Job đó
            const allProps = listProposals();
            for (const other of allProps) {
              if (other.jobPostId === proposal.jobPostId && other.id !== statusId && other.status !== "declined" && other.status !== "rejected") {
                updateProposalStatus(other.id, "rejected");
              }
            }

            // 4. Cập nhật trạng thái JobPost thành "Accepted" và đồng bộ ngân sách/timeline từ proposal
            const estDays = Number(proposal.estimatedDays) || 14;
            updateJobPost(jobPost.id, {
              status: "Accepted",
              budget: bidAmount,
              deadline: estDays
            });

            // Trích xuất danh sách Task & Milestones cấu trúc từ proposal (nếu có)
            let proposalTasks = [];
            try {
              const coverLetterParsed = JSON.parse(proposal.coverLetter);
              if (coverLetterParsed && Array.isArray(coverLetterParsed.tasks)) {
                // Determine projectId early so we can attach it to tasks
                const projects = listProjects();
                const existingProj = projects.find((p) => p.jobPostId === jobPost.id);
                const newProjectId = existingProj ? existingProj.id : generateId("proj");

                // Filter: exclude pending/rejected proposed tasks, keep only client + accepted
                const acceptedTasks = coverLetterParsed.tasks.filter((t) => {
                  const src = t.source || "expert";
                  const approval = t.approvalStatus || "accepted"; // client tasks default accepted
                  // Client tasks always included
                  if (src === "client" || src === "client_use_case_fallback") return true;
                  // Expert tasks only if explicitly accepted
                  return approval === "accepted";
                });

                proposalTasks = acceptedTasks.map((t, idx) => {
                  const generatedTaskId = t.id || `task-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`;
                  const ucIndex = t.useCaseIndex != null ? Number(t.useCaseIndex) : (idx % (jobPost.useCases?.length || 1));
                  const ucTitle = t.useCaseTitle || (jobPost.useCases && jobPost.useCases[ucIndex]?.title) || "Use Case";
                  const ucId = t.useCaseId || (jobPost.useCases && jobPost.useCases[ucIndex]?.id) || "";
                  return {
                    id: generatedTaskId,
                    projectId: newProjectId,
                    useCaseId: ucId,
                    useCaseIndex: ucIndex,
                    useCaseTitle: ucTitle,
                    title: t.title || `Task ${idx + 1}`,
                    description: t.description || "",
                    source: t.source || "expert",
                    status: "not_started",
                    progress: 0,
                    assignedTo: proposal.expertId,
                    deadline: String(jobPost.deadline || ""),
                    miniTasks: (t.miniTasks || []).map((mt, mtIdx) => ({
                      id: mt.id || `mt-${Date.now()}-${idx}-${mtIdx}-${Math.random().toString(36).slice(2, 5)}`,
                      projectId: newProjectId,
                      taskId: generatedTaskId,
                      title: mt.title || `Mini task ${mtIdx + 1}`,
                      status: "pending",
                      isCompleted: false,
                      description: "",
                      order: mtIdx,
                    })),
                  };
                });

                console.log("[mockApiHandler] Accepted proposal:", proposal.id);
                console.log("[mockApiHandler] Parsed proposalTasks from JSON:", proposalTasks);
              }
            } catch (e) {
              // coverLetter is plain text, not JSON — generate default tasks
              console.log("[mockApiHandler] coverLetter is not JSON — generating default tasks");
            }

            // Fallback: generate default tasks when coverLetter doesn't contain structured tasks
            if (proposalTasks.length === 0) {
              const projects = listProjects();
              const existingProj = projects.find((p) => p.jobPostId === jobPost.id);
              const newProjectId = existingProj ? existingProj.id : generateId("proj");
              const deadlineStr = String(jobPost.deadline || "30");
              const now = Date.now();

              const defaultTasks = [
                {
                  title: "Project Setup & Planning",
                  miniTasks: [
                    { title: "Requirements analysis & scope definition" },
                    { title: "Technical architecture & tool selection" },
                    { title: "Development environment setup" },
                  ],
                },
                {
                  title: "Core Implementation",
                  miniTasks: [
                    { title: "Core feature development" },
                    { title: "Data pipeline & integration" },
                    { title: "API / service layer implementation" },
                  ],
                },
                {
                  title: "Testing & Quality Assurance",
                  miniTasks: [
                    { title: "Unit & integration testing" },
                    { title: "Performance & load testing" },
                    { title: "Bug fixing & refinement" },
                  ],
                },
                {
                  title: "Deployment & Handover",
                  miniTasks: [
                    { title: "Production deployment" },
                    { title: "Documentation & runbooks" },
                    { title: "Client handover & training" },
                  ],
                },
              ];

              proposalTasks = defaultTasks.map((t, idx) => {
                const generatedTaskId = `task-${now}-${idx}-${Math.random().toString(36).slice(2, 7)}`;
                const ucIndex = idx % (jobPost.useCases?.length || 1);
                const ucTitle = (jobPost.useCases && jobPost.useCases[ucIndex]?.title) || "Use Case";
                const ucId = (jobPost.useCases && jobPost.useCases[ucIndex]?.id) || "";
                return {
                  id: generatedTaskId,
                  projectId: newProjectId,
                  title: t.title,
                  description: "",
                  status: "not_started",
                  progress: 0,
                  assignedTo: proposal.expertId,
                  deadline: deadlineStr,
                  useCaseIndex: ucIndex,
                  useCaseId: ucId,
                  useCaseTitle: ucTitle,
                  miniTasks: t.miniTasks.map((mt, mtIdx) => ({
                    id: `mt-${now}-${idx}-${mtIdx}-${Math.random().toString(36).slice(2, 7)}`,
                    projectId: newProjectId,
                    taskId: generatedTaskId,
                    title: mt.title,
                    status: "pending",
                    isCompleted: false,
                    description: "",
                    order: mtIdx,
                  })),
                };
              });

              console.log("[mockApiHandler] Generated", proposalTasks.length, "default tasks for proposal:", proposal.id);
            }

            // 5. Khởi tạo/Cập nhật Project mới dạng "active" với escrowPaid và escrowStatus = "paid"
            const projects = listProjects();
            const existingProj = projects.find((p) => p.jobPostId === jobPost.id);
            let newProject;
            if (existingProj) {
              newProject = updateProject(existingProj.id, {
                status: "active",
                budget: bidAmount,
                deadline: String(estDays),
                originalUseCaseDays: jobPost.originalUseCaseDays,
                useCases: jobPost.useCases,
                escrowAmount: bidAmount,
                escrowPaid: true,
                escrowStatus: "paid",
                updatedAt: new Date().toISOString(),
                ...(proposalTasks.length > 0 ? { tasks: proposalTasks } : {}),
              });
            } else {
              const newProjectId = generateId("proj");
              newProject = createProject({
                id: newProjectId,
                jobPostId: jobPost.id,
                clientId: jobPost.clientId,
                assignedExpertId: proposal.expertId,
                title: jobPost.title,
                description: jobPost.description,
                useCases: jobPost.useCases,
                budget: bidAmount,
                deadline: String(estDays),
                originalUseCaseDays: jobPost.originalUseCaseDays,
                escrowAmount: bidAmount,
                status: "active",
                escrowPaid: true,
                escrowStatus: "paid",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                tasks: proposalTasks.length > 0 ? proposalTasks : [],
              });
            }

            // Sync tasks to the global tasks table so listTasks() finds them
            if (proposalTasks.length > 0 && newProject) {
              for (const task of proposalTasks) {
                createTask({
                  id: task.id,
                  projectId: task.projectId || newProject.id,
                  title: task.title,
                  description: task.description || "",
                  status: task.status || "not_started",
                  assignedTo: task.assignedTo || proposal.expertId,
                  approval: null,
                  deadline: task.deadline || String(jobPost.deadline || ""),
                  useCaseIndex: task.useCaseIndex,
                  useCaseId: task.useCaseId || "",
                  useCaseTitle: task.useCaseTitle,
                  miniTasks: (task.miniTasks || []).map((mt) => ({
                    id: mt.id,
                    title: mt.title,
                    description: mt.description || "",
                    status: mt.status || "pending",
                    order: mt.order != null ? mt.order : 0,
                  })),
                  createdAt: new Date().toISOString(),
                });
              }
              console.log("[mockApiHandler] Synced", proposalTasks.length, "tasks to global tasks table");
            }

            console.log("[mockApiHandler] Generated project:", newProject);

            // 6. Ghi Transaction Log ký quỹ
            createTransaction({
              id: generateId("txn"),
              projectId: newProject.id,
              fromUserId: jobPost.clientId,
              toUserId: proposal.expertId,
              amount: bidAmount,
              type: "escrow_deposit",
              status: "completed",
              description: `Ký quỹ tự động khi thuê Expert cho dự án: ${jobPost.title}`,
              createdAt: new Date().toISOString(),
            });

            // Gửi sự kiện cập nhật DB toàn cục
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("aitasker_db_update"));
            }

            return { success: true, proposalId: statusId, status: "accepted", projectId: newProject.id };
          }

          const updated = updateProposalStatus(statusId, status);
          if (!updated) throw new ApiError("Proposal not found.", 404);
          return { success: true, proposalId: statusId, status };
        }
        throw new ApiError("Status parameter required.", 400);
      }
      const propId = matchProposalId(path);
      if (propId) {
        const updated = updateProposal(propId, body);
        if (!updated) throw new ApiError("Proposal not found.", 404);
        return updated;
      }
    }

    // ── CATEGORY TAGS ─────────────────────────────────────────────────────────
    if (path === "/category-tags/skills" && method === "GET") return listSkills();
    if (path === "/category-tags/skills" && method === "POST") return createSkill(body);
    if (path === "/category-tags/categories" && method === "GET") return listCategories();
    if (path === "/category-tags/categories" && method === "POST") return createCategory(body);

    if (method === "DELETE") {
      const skillId = matchCategorySkillId(path);
      if (skillId) { deleteSkill(skillId); return { success: true }; }
      const catId = matchCategoryCatId(path);
      if (catId) { deleteCategory(catId); return { success: true }; }

      const matchProp = path.match(/^\/Proposals\/([^/]+)$/i);
      if (matchProp) {
        const propId = matchProp[1];
        deleteProposal(propId);
        return { success: true };
      }
    }

    // ── TRANSACTIONS / INTERACTIONS ──────────────────────────────────────────
    if (path === "/interactions" && method === "GET") {
      let txns = listTransactions();
      if (query.projectId) txns = txns.filter((t) => t.projectId === query.projectId);
      if (query.userId) txns = txns.filter((t) => t.fromUserId === query.userId || t.toUserId === query.userId);
      return txns;
    }

    if (path === "/interactions/transaction" && method === "POST") {
      const txn = createTransaction({
        ...body,
        id: generateId("txn"),
        status: "completed",
        fromUserId: body.fromUserId || currentUser?.id,
      });
      if ((body.type === "escrow_deposit" || body.type === "escrow_payment" || body.transactionType === "escrow_payment") && currentUser) {
        const userObj = getUserById(currentUser.id);
        if (userObj && userObj.wallet) {
          const currentBalance = userObj.wallet.balance || 0;
          const currentEscrow = userObj.wallet.escrowBalance || userObj.wallet.pendingBalance || 0;
          const amt = Number(body.amount) || 0;
          const newWallet = {
            ...userObj.wallet,
            balance: Number((currentBalance - amt).toFixed(2)),
            escrowBalance: Number((currentEscrow + amt).toFixed(2)),
            pendingBalance: Number((currentEscrow + amt).toFixed(2)),
          };
          updateUser(currentUser.id, { wallet: newWallet });
        }
        if (body.projectId) {
          let targetProjId = body.projectId;
          if (body.projectId.startsWith("job-")) {
            const projectsList = listProjects();
            const projObj = projectsList.find((p) => p.jobPostId === body.projectId);
            if (projObj) targetProjId = projObj.id;
          }
          updateProject(targetProjId, { escrowPaid: true, escrowStatus: "paid", status: "active" });
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
      }
      if ((body.type === "release_payment" || body.type === "escrow_release" || body.type === "release_escrow" || body.transactionType === "release_payment") && body.projectId) {
        const proj = getProjectById(body.projectId);
        if (proj) {
          updateProjectStatus(proj.id, "completed");
          if (proj.jobPostId) {
            updateJobPost(proj.jobPostId, { status: "completed" });
          }
          const clientUser = getUserById(proj.clientId);
          if (clientUser && clientUser.wallet) {
            const currentEscrow = clientUser.wallet.escrowBalance || clientUser.wallet.pendingBalance || 0;
            const amt = Number(body.amount) || proj.budget || 0;
            updateUser(proj.clientId, {
              wallet: {
                ...clientUser.wallet,
                escrowBalance: Math.max(0, currentEscrow - amt),
                pendingBalance: Math.max(0, currentEscrow - amt),
              }
            });
          }
          const expertId = proj.assignedExpertId || proj.expertId || body.expertId;
          if (expertId) {
            const expertUser = getUserById(expertId);
            if (expertUser && expertUser.wallet) {
              const currentBalance = expertUser.wallet.balance || 0;
              const currentEarned = expertUser.wallet.totalEarned || 0;
              const currentPending = expertUser.wallet.pendingBalance || 0;
              const amt = Number(body.amount) || proj.budget || 0;
              updateUser(expertId, {
                wallet: {
                  ...expertUser.wallet,
                  balance: currentBalance + amt,
                  totalEarned: currentEarned + amt,
                  pendingBalance: Math.max(0, currentPending - amt),
                }
              });
              // Notify expert of normal payment release (skip if dispute already handled it)
              const existingReports = listReports().filter(r => r.projectId === proj.id);
              const disputeHandledRelease = existingReports.some(r =>
                r.status === "Resolved" && (r.resolution === "stopped" || r.resolution === "force_payout")
              );
              if (!disputeHandledRelease) {
                const clientUserForNotify = getUserById(proj.clientId);
                notifyPaymentReleased({
                  expertUserId: expertId,
                  clientName: clientUserForNotify?.fullName || "Client",
                  projectTitle: proj.title || "",
                  amount: String(amt || 0),
                  projectId: proj.id,
                }).catch(() => {});
              }
            }
          }
        }
      }
      // Contract cancellation — client splits escrow by progress
      if ((body.type === "cancel_contract" || body.transactionType === "cancel_contract") && body.projectId) {
        const result = cancelProjectContract(body.projectId, currentUser?.id, body.reason);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
        return { success: true, ...result };
      }
      if ((body.type === "dispute_refund" || body.transactionType === "dispute_refund") && body.projectId) {
        const proj = getProjectById(body.projectId);
        if (proj) {
          updateProjectStatus(proj.id, "cancelled");
          if (proj.jobPostId) {
            updateJobPost(proj.jobPostId, { status: "cancelled" });
          }
          const clientUser = getUserById(proj.clientId);
          if (clientUser && clientUser.wallet) {
            const currentBalance = clientUser.wallet.balance || 0;
            const currentEscrow = clientUser.wallet.escrowBalance || clientUser.wallet.pendingBalance || 0;
            const amt = Number(body.amount) || proj.budget || 0;
            updateUser(proj.clientId, {
              wallet: {
                ...clientUser.wallet,
                balance: Number((currentBalance + amt).toFixed(2)),
                escrowBalance: Math.max(0, Number((currentEscrow - amt).toFixed(2))),
                pendingBalance: Math.max(0, Number((currentEscrow - amt).toFixed(2))),
              }
            });
          }
        }
      }
      return { success: true, transactionId: txn.id, ...txn };
    }

    // ── NOTIFICATIONS ────────────────────────────────────────────────────────
    if (path === "/notifications" && method === "GET") {
      let notifs = listNotifications();
      if (currentUser) notifs = notifs.filter((n) => n.userId === currentUser.id);
      if (query.type) notifs = notifs.filter((n) => n.type === query.type);
      if (query.isRead !== undefined) notifs = notifs.filter((n) => n.isRead === (query.isRead === "true"));
      // Sort by newest first
      notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return notifs;
    }

    if (path === "/notifications" && method === "POST") {
      const notif = createNotification({
        userId: body.userId || currentUser?.id,
        title: body.title,
        message: body.message,
        type: body.type || "system",
        linkTo: body.linkTo || "",
        createdAt: body.createdAt || new Date().toISOString(),
      });
      return notif;
    }

    if (path === "/notifications/read-all" && method === "PUT") {
      if (currentUser) markAllNotificationsRead(currentUser.id);
      return { success: true };
    }

    if (method === "PUT") {
      const matchNotif = path.match(/^\/notifications\/([^/]+)\/read$/i);
      if (matchNotif) {
        const notifId = matchNotif[1];
        updateNotification(notifId, { isRead: true });
        return { success: true };
      }
    }

    // ── MESSAGES ─────────────────────────────────────────────────────────────
    if (path === "/messages" && method === "GET") {
      let msgs = listMessages();
      if (currentUser) msgs = msgs.filter((m) => m.senderId === currentUser.id || m.receiverId === currentUser.id);
      if (query.projectId) msgs = msgs.filter((m) => m.projectId === query.projectId);
      msgs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return msgs;
    }

    if (path === "/messages" && method === "POST") {
      const msg = createMessage({
        ...body,
        id: generateId("msg"),
        senderId: body.senderId || currentUser?.id,
        isRead: false,
      });
      return msg;
    }

    // ── REVIEWS ──────────────────────────────────────────────────────────────
    if (path === "/reviews" && method === "GET") {
      let revs = listReviews();
      if (query.targetUserId) revs = revs.filter((r) => r.targetUserId === query.targetUserId);
      if (query.projectId) revs = revs.filter((r) => r.projectId === query.projectId);
      if (query.status) revs = revs.filter((r) => (r.status || "Visible") === query.status);
      return revs;
    }

    // Review detail, hide, delete, restore — match /reviews/{id}
    const reviewIdMatch = path.match(/^\/reviews\/(.+)$/);
    if (reviewIdMatch) {
      const reviewId = reviewIdMatch[1];
      const review = listReviews().find((r) => r.id === reviewId);
      if (!review) throw new ApiError("Review not found.", 404);

      if (method === "GET") return review;

      if (method === "PUT") {
        const newStatus = body.status || body.action;
        if (newStatus === "Hidden" || newStatus === "Visible" || newStatus === "Deleted") {
          updateReview(reviewId, { ...body, status: newStatus });
          return { success: true, reviewId, status: newStatus };
        }
        updateReview(reviewId, body);
        return { success: true, reviewId };
      }

      if (method === "DELETE") {
        deleteReview(reviewId);
        return { success: true, reviewId, deleted: true };
      }
    }

    // ── REPORTS / DISPUTES ───────────────────────────────────────────────────
    if (path === "/reports" && method === "GET") {
      let reports = listReports();
      if (query.status) reports = reports.filter((r) => r.status === query.status);
      if (query.projectId) reports = reports.filter((r) => r.projectId === query.projectId);
      return { data: reports, total: reports.length, page: 1 };
    }

    if (path === "/reports" && method === "POST") {
      const report = createReport({
        ...body,
        id: generateId("report"),
        reporterId: body.reporterId || currentUser?.id,
        status: "Pending",
      });
      return report;
    }

    // Single report detail, accept, reject — match /reports/{id}
    const reportIdMatch = path.match(/^\/reports\/(.+)$/);
    if (reportIdMatch && method === "GET") {
      const report = getReportById(reportIdMatch[1]);
      if (!report) throw new ApiError("Report not found.", 404);
      return report;
    }
    if (reportIdMatch && method === "PUT") {
      const report = getReportById(reportIdMatch[1]);
      if (!report) throw new ApiError("Report not found.", 404);
      
      const action = body.action || body.status;
      const isClientReporter = report.reporterRole === "client";
      
      // 1. Initial Appraisal: Accept Report
      if (action === "Accepted" || action === "accept") {
        const awaitingStatus = isClientReporter ? "Awaiting Expert" : "Awaiting Client";
        const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        
        updateReport(report.id, {
          status: awaitingStatus,
          replyDeadline: deadline,
          acceptedAt: new Date().toISOString(),
          adminNote: body.adminNote || body.note || "",
        });
        
        const project = getProjectById(report.projectId);
        if (project) {
          updateProjectStatus(project.id, "Disputed");
          // Notify accused party
          const accusedId = isClientReporter ? project.assignedExpertId : project.clientId;
          const reporterName = currentUser?.fullName || "Admin";
          if (accusedId) {
            notifyDisputeFiled({
              accusedUserId: accusedId,
              reporterName,
              projectTitle: project.title || "",
              deadline,
              projectId: project.id,
              reportId: report.id,
            }).catch(() => {});
          }
        }
        
        // Dispatch event
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
        return { success: true, reportId: report.id, status: awaitingStatus };
      }
      
      // 2. Initial Appraisal: Reject Report
      if (action === "Rejected" || action === "reject") {
        updateReport(report.id, {
          status: "Rejected",
          adminNote: body.reason || body.note || "",
          rejectionReason: body.reason || body.note || "",
          resolvedAt: new Date().toISOString()
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
        return { success: true, reportId: report.id, status: "Rejected" };
      }

      // 3. Expert Submits Explanation (Type 1)
      if (body.expertExplanation) {
        updateReport(report.id, {
          expertExplanation: body.expertExplanation,
          expertExplanationEvidence: body.expertExplanationEvidence || [],
          status: "Pending Admin",
          replyDeadline: null // clear deadline
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
        return { success: true, reportId: report.id, status: "Pending Admin" };
      }

      // 4. Client Submits Explanation (Type 2)
      if (body.clientExplanation) {
        updateReport(report.id, {
          clientExplanation: body.clientExplanation,
          clientExplanationEvidence: body.clientExplanationEvidence || [],
          status: "Pending Admin",
          replyDeadline: null // clear deadline
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
        return { success: true, reportId: report.id, status: "Pending Admin" };
      }

      // 5. Request More Evidence
      if (action === "requestMoreEvidence" || body.requestMoreEvidence) {
        const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        updateReport(report.id, {
          status: "Awaiting Evidence",
          replyDeadline: deadline,
          adminNote: body.adminNote || report.adminNote || "",
          clientEvidenceSubmitted: false,
          expertEvidenceSubmitted: false,
        });
        // Notify accused party
        const evidenceProj = getProjectById(report.projectId);
        const evidenceAccusedId = isClientReporter ? evidenceProj?.assignedExpertId : evidenceProj?.clientId;
        if (evidenceAccusedId) {
          notifyMoreEvidenceRequested({
            userId: evidenceAccusedId,
            projectTitle: evidenceProj?.title || "",
            adminNote: body.adminNote || "",
            projectId: evidenceProj?.id || report.projectId,
          }).catch(() => {});
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
        return { success: true, reportId: report.id, status: "Awaiting Evidence" };
      }

      // 5b. Client Submits Evidence
      if (body.clientEvidence) {
        const prevEvidence = report.clientEvidenceList || [];
        const newEvidenceList = [...prevEvidence, {
          fileName: body.clientEvidence,
          note: body.clientEvidenceNote || "",
          submittedAt: new Date().toISOString()
        }];
        const isExpertDone = report.expertEvidenceSubmitted === true;
        const newStatus = isExpertDone ? "Pending Admin" : "Awaiting Evidence";
        updateReport(report.id, {
          clientEvidenceList: newEvidenceList,
          clientEvidenceSubmitted: true,
          status: newStatus,
          replyDeadline: newStatus === "Pending Admin" ? null : report.replyDeadline
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
        return { success: true, reportId: report.id, status: newStatus };
      }

      // 5c. Expert Submits Evidence
      if (body.expertEvidence) {
        const prevEvidence = report.expertEvidenceList || [];
        const newEvidenceList = [...prevEvidence, {
          fileName: body.expertEvidence,
          note: body.expertEvidenceNote || "",
          submittedAt: new Date().toISOString()
        }];
        const isClientDone = report.clientEvidenceSubmitted === true;
        const newStatus = isClientDone ? "Pending Admin" : "Awaiting Evidence";
        updateReport(report.id, {
          expertEvidenceList: newEvidenceList,
          expertEvidenceSubmitted: true,
          status: newStatus,
          replyDeadline: newStatus === "Pending Admin" ? null : report.replyDeadline
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
        return { success: true, reportId: report.id, status: newStatus };
      }

      // 6. Continue Project (Unlocks dispute, resumes project)
      if (action === "continue" || body.resolution === "continued") {
        updateReport(report.id, {
          status: "Resolved",
          resolution: "continued",
          resolvedAt: new Date().toISOString()
        });
        const projectC = getProjectById(report.projectId);
        if (projectC) {
          updateProjectStatus(projectC.id, "in_progress");
          // Notify both parties: dispute resolved
          [projectC.clientId, projectC.assignedExpertId].filter(Boolean).forEach((uid) => {
            notifyDisputeResolved({ userId: uid, projectTitle: projectC.title || "", resolution: "continued", projectId: projectC.id }).catch(() => {});
          });
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
        return { success: true, reportId: report.id, status: "Resolved" };
      }

      // 7. Stop Project (Luồng 1 final decision)
      if (action === "stop" || body.resolution === "stopped") {
        const moneyAction = body.moneyAction || "refund";
        updateReport(report.id, {
          status: "Resolved",
          resolution: "stopped",
          moneyAction,
          resolvedAt: new Date().toISOString()
        });
        
        const proj = getProjectById(report.projectId);
        if (proj) {
          if (moneyAction === "refund") {
            // Refund to Client
            updateProjectStatus(proj.id, "cancelled");
            if (proj.jobPostId) updateJobPost(proj.jobPostId, { status: "cancelled" });
            // Notify both: dispute resolved with refund
            [proj.clientId, proj.assignedExpertId].filter(Boolean).forEach((uid) => {
              notifyDisputeResolved({ userId: uid, projectTitle: proj.title || "", resolution: "stopped — refunded to Client", projectId: proj.id }).catch(() => {});
            });
            const clientUser = getUserById(proj.clientId);
            if (clientUser && clientUser.wallet) {
              const currentBalance = clientUser.wallet.balance || 0;
              const currentEscrow = clientUser.wallet.escrowBalance || clientUser.wallet.pendingBalance || 0;
              const amt = proj.budget || 0;
              updateUser(proj.clientId, {
                wallet: {
                  ...clientUser.wallet,
                  balance: Number((currentBalance + amt).toFixed(2)),
                  escrowBalance: Math.max(0, Number((currentEscrow - amt).toFixed(2))),
                  pendingBalance: Math.max(0, Number((currentEscrow - amt).toFixed(2))),
                }
              });
            }
          } else {
            // Release to Expert
            updateProjectStatus(proj.id, "completed");
            if (proj.jobPostId) updateJobPost(proj.jobPostId, { status: "completed" });
            // Notify both: dispute resolved with release
            [proj.clientId, proj.assignedExpertId].filter(Boolean).forEach((uid) => {
              notifyDisputeResolved({ userId: uid, projectTitle: proj.title || "", resolution: "stopped — released to Expert", projectId: proj.id }).catch(() => {});
            });
            const clientUser = getUserById(proj.clientId);
            if (clientUser && clientUser.wallet) {
              const currentEscrow = clientUser.wallet.escrowBalance || clientUser.wallet.pendingBalance || 0;
              const amt = proj.budget || 0;
              updateUser(proj.clientId, {
                wallet: {
                  ...clientUser.wallet,
                  escrowBalance: Math.max(0, currentEscrow - amt),
                  pendingBalance: Math.max(0, currentEscrow - amt),
                }
              });
            }
            const expertId = proj.assignedExpertId || proj.expertId || report.expertId;
            if (expertId) {
              const expertUser = getUserById(expertId);
              if (expertUser && expertUser.wallet) {
                const currentBalance = expertUser.wallet.balance || 0;
                const currentEarned = expertUser.wallet.totalEarned || 0;
                const currentPending = expertUser.wallet.pendingBalance || 0;
                const amt = proj.budget || 0;
                updateUser(expertId, {
                  wallet: {
                    ...expertUser.wallet,
                    balance: currentBalance + amt,
                    totalEarned: currentEarned + amt,
                    pendingBalance: Math.max(0, currentPending - amt),
                  }
                });
                // Notify expert of payment release
                notifyPaymentReleased({
                  expertUserId: expertId,
                  clientName: "Client",
                  projectTitle: proj.title || "",
                  amount: String(amt || 0),
                  projectId: proj.id,
                }).catch(() => {});
              }
            }
          }
        }
        
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
        return { success: true, reportId: report.id, status: "Resolved" };
      }

      // 8. Force Payout (Luồng 2 final decision)
      if (action === "force_payout" || body.resolution === "force_payout") {
        updateReport(report.id, {
          status: "Resolved",
          resolution: "force_payout",
          resolvedAt: new Date().toISOString()
        });
        
        const proj = getProjectById(report.projectId);
        if (proj) {
          updateProjectStatus(proj.id, "completed");
          if (proj.jobPostId) updateJobPost(proj.jobPostId, { status: "completed" });
          const clientUser = getUserById(proj.clientId);
          if (clientUser && clientUser.wallet) {
            const currentEscrow = clientUser.wallet.escrowBalance || clientUser.wallet.pendingBalance || 0;
            const amt = proj.budget || 0;
            updateUser(proj.clientId, {
              wallet: {
                ...clientUser.wallet,
                escrowBalance: Math.max(0, currentEscrow - amt),
                pendingBalance: Math.max(0, currentEscrow - amt),
              }
            });
          }
          const expertId = proj.assignedExpertId || proj.expertId || report.expertId || report.reporterId;
          if (expertId) {
            const expertUser = getUserById(expertId);
            if (expertUser && expertUser.wallet) {
              const currentBalance = expertUser.wallet.balance || 0;
              const currentEarned = expertUser.wallet.totalEarned || 0;
              const currentPending = expertUser.wallet.pendingBalance || 0;
              const amt = proj.budget || 0;
              updateUser(expertId, {
                wallet: {
                  ...expertUser.wallet,
                  balance: currentBalance + amt,
                  totalEarned: currentEarned + amt,
                  pendingBalance: Math.max(0, currentPending - amt),
                }
              });
              // Notify expert of payment release (force payout)
              notifyPaymentReleased({
                expertUserId: expertId,
                clientName: "Admin",
                projectTitle: proj.title || "",
                amount: String(amt || 0),
                projectId: proj.id,
              }).catch(() => {});
            }
          }
          // Notify both: dispute resolved via force payout
          [proj.clientId, proj.assignedExpertId].filter(Boolean).forEach((uid) => {
            notifyDisputeResolved({ userId: uid, projectTitle: proj.title || "", resolution: "force_payout — released to Expert", projectId: proj.id }).catch(() => {});
          });
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
        return { success: true, reportId: report.id, status: "Resolved" };
      }

      // 9. Force Refund (Luồng 2 final decision)
      if (action === "force_refund" || body.resolution === "force_refund") {
        updateReport(report.id, {
          status: "Resolved",
          resolution: "force_refund",
          resolvedAt: new Date().toISOString()
        });

        const proj = getProjectById(report.projectId);
        if (proj) {
          updateProjectStatus(proj.id, "cancelled");
          if (proj.jobPostId) updateJobPost(proj.jobPostId, { status: "cancelled" });
          // Notify both: dispute resolved via force refund
          [proj.clientId, proj.assignedExpertId].filter(Boolean).forEach((uid) => {
            notifyDisputeResolved({ userId: uid, projectTitle: proj.title || "", resolution: "force_refund — refunded to Client", projectId: proj.id }).catch(() => {});
          });
          const clientUser = getUserById(proj.clientId);
          if (clientUser && clientUser.wallet) {
            const currentBalance = clientUser.wallet.balance || 0;
            const currentEscrow = clientUser.wallet.escrowBalance || clientUser.wallet.pendingBalance || 0;
            const amt = proj.budget || 0;
            updateUser(proj.clientId, {
              wallet: {
                ...clientUser.wallet,
                balance: Number((currentBalance + amt).toFixed(2)),
                escrowBalance: Math.max(0, Number((currentEscrow - amt).toFixed(2))),
                pendingBalance: Math.max(0, Number((currentEscrow - amt).toFixed(2))),
              }
            });
          }
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("aitasker_db_update"));
        }
        return { success: true, reportId: report.id, status: "Resolved" };
      }

      // Generic update fallback
      updateReport(report.id, body);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      }
      return { success: true, reportId: report.id };
    }

    // ── TASKS / TIMELINE ────────────────────────────────────────────────────
    if (path === "/tasks" && method === "GET") {
      let tasks = listTasks();
      if (query.projectId) tasks = tasks.filter((t) => t.projectId === query.projectId);
      return tasks;
    }

    if (path.startsWith("/tasks/") && path.endsWith("/request-product") && method === "POST") {
      const parts = path.split("/");
      const taskId = parts[2];
      const task = requestUrgentSubmission(taskId, "Client");
      return { success: true, task };
    }

    // ── DASHBOARD STATS ──────────────────────────────────────────────────────
    if (path === "/dashboard/stats" && method === "GET") {
      return getDashboardStats();
    }

    // ── REVENUE ───────────────────────────────────────────────────────────────
    if (path === "/revenue" && method === "GET") {
      return getRevenueData();
    }

    // ── WALLET ───────────────────────────────────────────────────────────────
    if (path === "/wallet" && method === "GET") {
      if (currentUser) return getUserWallet(currentUser.id);
      return { balance: 0, pendingBalance: 0, totalEarned: 0 };
    }

    // ── FALLBACK ─────────────────────────────────────────────────────────────
    // For any unrecognized endpoint, return an empty result rather than error
    // to keep pages from crashing on unimplemented endpoints
    console.warn(`[MockAPI] Unrecognized endpoint: ${method} ${path} — returning empty/null`);
    if (method === "GET") return query.limit ? { data: [], total: 0, page: 1 } : [];
    return { success: true, note: "Mock fallback — endpoint not implemented" };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error(`[MockAPI] Error handling ${method} ${path}:`, err);
    throw new ApiError(err.message || "Internal mock error", 500);
  }
}