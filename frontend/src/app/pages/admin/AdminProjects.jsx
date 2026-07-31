// =============================================================================
// AdminProjects - Project list management for Admin/Owner.
//
// Shows all platform projects with:
//   - Search by title
//   - Status filter
//   - View project detail modal (full overview, WBS, attachments)
//   - View proposals modal (all proposals submitted for the project)
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { Search, Eye, Filter, X, Briefcase, Calendar, User, DollarSign, FileText, Paperclip, Image, FolderOpen, CheckCircle, Clock, Sparkles } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { formatDateTime } from "../../lib/dateUtils.js";
import { STATUS_LABELS } from "../../lib/projectStatusConfig.js";
import api, { enrichFileUrl, parseProposalWbs, cleanFileName } from "../../../services/api.js";
import { downloadFile } from "../../lib/downloadFileUtils.js";

const PROJECT_STATUS_FILTER_OPTIONS = [
  { value: "reviewing_proposals", label: STATUS_LABELS.reviewing_proposals },
  { value: "pending_escrow", label: STATUS_LABELS.pending_escrow },
  { value: "in_progress", label: STATUS_LABELS.in_progress },
  { value: "waiting_review", label: STATUS_LABELS.waiting_review },
  { value: "needs_revision", label: STATUS_LABELS.needs_revision },
  { value: "awaiting_cancellation", label: STATUS_LABELS.awaiting_cancellation },
  { value: "disputed", label: STATUS_LABELS.disputed },
  {
    value: "completed",
    label: STATUS_LABELS.completed,
    values: ["completed", "settled_dispute"],
  },
  {
    value: "cancelled",
    label: STATUS_LABELS.cancelled,
    values: ["cancelled", "contract_cancelled", "cancel_done"],
  },
];

export function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [selectedDetailProject, setSelectedDetailProject] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [fullProjectDetail, setFullProjectDetail] = useState(null);

  const [selectedProposalProject, setSelectedProposalProject] = useState(null);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [proposalsList, setProposalsList] = useState([]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all job posts from system
      const allJobsRes = await api.jobPosts.list({ pageSize: 500 }).catch(() => []);
      const allJobs = Array.isArray(allJobsRes) ? allJobsRes : (allJobsRes?.data || []);

      // Fetch projects across users
      const usersRes = await api.users.list({ timeout: 5000 }).catch(() => []);
      const users = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);

      const projectPromises = [
        api.projects.list().catch(() => [])
      ];
      users.forEach(u => {
        const uId = u.id || u.Id;
        if (uId) {
          projectPromises.push(api.users.getClientProjects(uId).catch(() => []));
          projectPromises.push(api.users.getExpertProjects(uId).catch(() => []));
        }
      });

      const projectsResults = await Promise.all(projectPromises);
      const raw = [];
      const seenIds = new Set();

      // Add job posts
      allJobs.forEach(j => {
        const jId = String(j.id || j.Id).toLowerCase();
        if (jId && !seenIds.has(jId)) {
          seenIds.add(jId);
          raw.push(j);
        }
      });

      // Add projects
      projectsResults.forEach(list => {
        if (Array.isArray(list)) {
          list.forEach(p => {
            const pId = String(p.id || p.Id).toLowerCase();
            if (pId && !seenIds.has(pId)) {
              seenIds.add(pId);
              raw.push(p);
            }
          });
        }
      });

      const normalized = raw.map(p => {
        const projId = p.id || p.Id;
        const localStatus = localStorage.getItem(`project_status_${projId}`) || p.status || p.Status || "";
        let statusKey = localStatus.toLowerCase().replace(/[\s_]+/g, "");

        if (statusKey === "inprogress" || statusKey === "active") {
          statusKey = "in_progress";
        } else if (statusKey === "pendingescrow" || statusKey === "pendingpayment") {
          statusKey = "pending_escrow";
        } else if (statusKey === "open" || statusKey === "reviewingproposals") {
          statusKey = "reviewing_proposals";
        } else if (statusKey === "waitingreview" || statusKey === "pendingreview") {
          statusKey = "waiting_review";
        } else if (statusKey === "needsrevision") {
          statusKey = "needs_revision";
        } else if (statusKey === "awaitingcancellation") {
          statusKey = "awaiting_cancellation";
        } else if (statusKey === "completed" || statusKey === "complete") {
          statusKey = "completed";
        } else if (statusKey === "cancelled" || statusKey === "stopped") {
          statusKey = "cancelled";
        } else if (statusKey === "contractcancelled") {
          statusKey = "contract_cancelled";
        } else if (statusKey === "canceldone") {
          statusKey = "cancel_done";
        } else if (statusKey === "disputed") {
          statusKey = "disputed";
        } else if (statusKey === "settleddispute" || statusKey === "resolved") {
          statusKey = "settled_dispute";
        } else if (!statusKey) {
          statusKey = "reviewing_proposals";
        }

        return {
          ...p,
          status: statusKey,
        };
      });
      setProjects(normalized);
    } catch (err) {
      setError(err.message || "Unable to load project list.");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Open Project Detail Modal
  const handleOpenDetail = async (row) => {
    setSelectedDetailProject(row);
    setLoadingDetail(true);
    try {
      const projId = row.id || row.Id;
      const full = await api.jobPosts.getById(projId).catch(() => row);
      setFullProjectDetail(full || row);
    } catch {
      setFullProjectDetail(row);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Open Proposals Modal
  const handleOpenProposals = async (row) => {
    setSelectedProposalProject(row);
    setLoadingProposals(true);
    setProposalsList([]);
    try {
      const projId = row.id || row.Id;
      const res = await api.proposals.getByJob(projId).catch(() => []);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setProposalsList(list);
    } catch {
      setProposalsList([]);
    } finally {
      setLoadingProposals(false);
    }
  };

  // File download helper preserving clean original filename
  const handleDownloadFile = async (e, rawUrl, fileName) => {
    e.preventDefault();
    if (!rawUrl || rawUrl === "#") return;
    downloadFile(rawUrl, fileName);
  };

  const columns = [
    {
      key: "title",
      label: "PROJECT",
      className: "w-[25%] max-w-[220px]",
      render: (val) => (
        <span className="font-medium text-foreground text-sm truncate block" title={val}>{val || "-"}</span>
      ),
    },
    {
      key: "clientName",
      label: "CLIENT",
      className: "w-[15%] max-w-[140px]",
      render: (val, row) => {
        const name = row.clientName || row.ClientName || row.clientId || "-";
        return (
          <span className="text-sm text-muted-foreground truncate block" title={name}>
            {name}
          </span>
        );
      },
    },
    {
      key: "expert",
      label: "EXPERT",
      className: "w-[15%] max-w-[140px]",
      render: (val, row) => {
        const name = row.expert || row.expertName || row.Expert || row.ExpertName || row.expertId || "None";
        return (
          <span className="text-sm text-muted-foreground truncate block" title={name}>
            {name}
          </span>
        );
      },
    },
    {
      key: "budget",
      label: "BUDGET",
      className: "w-[12%]",
      render: (val, row) => {
        const amount = row.budget ?? row.Budget ?? 0;
        return (
          <span className="text-sm font-medium">
            <MoneyDisplay amount={amount} />
          </span>
        );
      },
    },
    {
      key: "status",
      label: "STATUS",
      className: "w-[13%]",
      filterOptions: PROJECT_STATUS_FILTER_OPTIONS,
      render: (val) => (
        <StatusBadge
          status={val}
          entity="project"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Management"
        subtitle="View and manage all platform projects, requirements, and proposals."
      />

      {error && (
        <div className="p-4 bg-destructive-light border border-destructive/20 rounded-xl text-sm text-destructive">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={projects}
        loading={loading}
        emptyMessage="No projects found."
        actions={(row) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenDetail(row)}
              className="px-2.5 py-1.5 bg-brand-primary text-brand-primary-foreground rounded-lg hover:bg-brand-primary-hover text-xs font-medium inline-flex items-center gap-1 transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              View Detail
            </button>
            <button
              type="button"
              onClick={() => handleOpenProposals(row)}
              className="px-2.5 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary-hover text-xs font-medium inline-flex items-center gap-1 transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              View Proposal
            </button>
          </div>
        )}
      />

      {/* ========================================================================= */}
      {/* MODAL 1: PROJECT DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedDetailProject && (
        <div data-modal-overlay className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-left">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-brand-primary" />
                  {selectedDetailProject.title || selectedDetailProject.Title || "Project Detail"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: {selectedDetailProject.id || selectedDetailProject.Id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedDetailProject(null); setFullProjectDetail(null); }}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {loadingDetail ? (
                <div className="text-center py-12 text-muted-foreground">Loading project details...</div>
              ) : (
                <>
                  {/* Status & Highlights */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-secondary/40 border border-border rounded-xl p-4">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Status</p>
                      <div className="mt-1">
                        <StatusBadge status={selectedDetailProject.status} entity="project" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Budget</p>
                      <p className="text-sm font-semibold text-foreground mt-1">
                        <MoneyDisplay amount={fullProjectDetail?.budget || selectedDetailProject.budget || selectedDetailProject.Budget || 0} />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Duration</p>
                      <p className="text-sm font-semibold text-foreground mt-1">
                        {fullProjectDetail?.durationDays || selectedDetailProject.durationDays || selectedDetailProject.DurationDays || 1} Days
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Client</p>
                      <p className="text-sm font-semibold text-foreground truncate mt-1">
                        {fullProjectDetail?.clientName || selectedDetailProject.clientName || selectedDetailProject.ClientName || "Client"}
                      </p>
                    </div>
                  </div>

                  {/* Category & Skills */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category & Skills</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {(fullProjectDetail?.category || selectedDetailProject.category) && (
                        <span className="px-2.5 py-1 bg-brand-primary/10 text-brand-primary font-semibold rounded-md">
                          Category: {fullProjectDetail?.category || selectedDetailProject.category}
                        </span>
                      )}
                      {(fullProjectDetail?.specializationName || selectedDetailProject.specializationName) && (
                        <span className="px-2.5 py-1 bg-secondary text-foreground font-medium rounded-md border border-border">
                          Specialization: {fullProjectDetail?.specializationName || selectedDetailProject.specializationName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</h4>
                    <div className="bg-secondary/30 border border-border rounded-xl p-4 text-sm text-foreground/90 whitespace-pre-wrap">
                      {fullProjectDetail?.description || selectedDetailProject.description || selectedDetailProject.Description || "No description provided."}
                    </div>
                  </div>

                  {/* Tasks / User Stories (WBS) */}
                  {((fullProjectDetail?.useCases && fullProjectDetail.useCases.length > 0) || (fullProjectDetail?.jobPostTasks && fullProjectDetail.jobPostTasks.length > 0)) && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">User Stories / WBS Breakdown</h4>
                      <div className="space-y-2">
                        {(fullProjectDetail.useCases || fullProjectDetail.jobPostTasks).map((uc, idx) => (
                          <div key={idx} className="bg-secondary/40 border border-border rounded-xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-semibold text-foreground">{uc.title || uc.Title}</h5>
                              <span className="text-xs text-muted-foreground font-medium">{uc.durationDays || uc.duration || 1} days</span>
                            </div>
                            {uc.description && <p className="text-xs text-muted-foreground">{uc.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Attachments</h4>
                    {(() => {
                      const cached = fullProjectDetail?._attachments || selectedDetailProject._attachments;
                      const rawBE = fullProjectDetail?.attachmentUrl || selectedDetailProject.attachmentUrl || selectedDetailProject.AttachmentUrl;
                      let files = [];
                      if (Array.isArray(cached) && cached.length > 0) {
                        files = cached;
                      } else if (typeof rawBE === "string" && rawBE.trim().length > 0) {
                        try {
                          const parsed = JSON.parse(rawBE);
                          files = Array.isArray(parsed) ? parsed : [{ name: rawBE.split("/").pop(), url: rawBE }];
                        } catch {
                          files = [{ name: rawBE.split("/").pop(), url: rawBE }];
                        }
                      }

                      if (files.length === 0) {
                        return <p className="text-xs text-muted-foreground italic">No file attachments included.</p>;
                      }

                      return (
                        <div className="flex flex-wrap gap-2">
                          {files.map((file, idx) => {
                            const rawUrl = typeof file === "string" ? file : (file.url || file.Url || "#");
                            const fileName = (typeof file === "object" ? file.name : null) || rawUrl.split("/").pop() || "Attachment";
                            const cleanName = cleanFileName(fileName);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={(e) => handleDownloadFile(e, rawUrl, fileName)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/80 hover:bg-secondary border border-border rounded-lg text-xs font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer max-w-full overflow-hidden"
                                title={cleanName}
                              >
                                <Paperclip className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate max-w-[260px] sm:max-w-[340px] block">{cleanName}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border px-6 py-4 bg-card flex justify-end">
              <button
                type="button"
                onClick={() => { setSelectedDetailProject(null); setFullProjectDetail(null); }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium hover:bg-secondary-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VIEW PROPOSALS MODAL */}
      {/* ========================================================================= */}
      {selectedProposalProject && (
        <div data-modal-overlay className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-left">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-primary" />
                  Proposals ({proposalsList.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">
                  Project: {selectedProposalProject.title || selectedProposalProject.Title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedProposalProject(null); setProposalsList([]); }}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {loadingProposals ? (
                <div className="text-center py-12 text-muted-foreground">Loading proposals...</div>
              ) : proposalsList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm font-semibold">No proposals submitted yet</p>
                  <p className="text-xs mt-1">Experts have not submitted any proposals for this job post.</p>
                </div>
              ) : (
                proposalsList.map((proposal, idx) => {
                  const pId = proposal.id || proposal.Id;
                  let rawExpertName = proposal.expert?.fullName || proposal.expert?.name || proposal.expertName || proposal.ExpertName || proposal.expertId || "";
                  let expertDisplayName = "Expert Candidate";
                  if (rawExpertName && !/^[a-f0-9-]{36}$/i.test(String(rawExpertName)) && !/^\d+$/.test(String(rawExpertName))) {
                    expertDisplayName = rawExpertName;
                  } else if (proposal.expert?.fullName || proposal.expert?.name) {
                    expertDisplayName = proposal.expert?.fullName || proposal.expert?.name;
                  } else if (rawExpertName) {
                    expertDisplayName = `Expert (${String(rawExpertName).substring(0, 8)})`;
                  }

                  const bid = proposal.bidAmount ?? proposal.BidAmount ?? 0;
                  const estDays = proposal.estimatedDays ?? proposal.EstimatedDays ?? 1;
                  const status = proposal.status || proposal.Status || "Pending";

                  // Extract clean cover letter (excluding raw WBS JSON strings)
                  let coverText = proposal.introduction || proposal.Introduction || proposal.coverLetter || proposal.CoverLetter || "";
                  const rawImpl = proposal.implementation || proposal.Implementation || "";
                  if (!coverText && rawImpl && !rawImpl.trim().startsWith("[") && !rawImpl.trim().startsWith("{")) {
                    coverText = rawImpl;
                  }

                  const parsedWbs = parseProposalWbs(rawImpl, proposal);

                  // Extract attachments
                  const rawAtts = proposal.attachments || proposal.Attachments || [];
                  let atts = Array.isArray(rawAtts) ? rawAtts : [];
                  if (atts.length === 0 && (proposal.attachmentUrl || proposal.AttachmentUrl)) {
                    const u = proposal.attachmentUrl || proposal.AttachmentUrl;
                    atts = [{ name: u.split("/").pop(), url: u }];
                  }

                  return (
                    <div key={pId || idx} className="bg-secondary/40 border border-border rounded-xl p-5 space-y-4 text-left">
                      {/* Proposal Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary font-semibold flex items-center justify-center text-sm">
                            {expertDisplayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">{expertDisplayName}</h4>
                            <p className="text-xs text-muted-foreground">Proposal #{idx + 1}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground font-medium">Bid Amount</p>
                            <p className="text-sm font-semibold text-brand-primary">
                              <MoneyDisplay amount={bid} />
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground font-medium">Timeline</p>
                            <p className="text-sm font-semibold text-foreground">{estDays} Days</p>
                          </div>
                          <StatusBadge status={status} entity="proposal" />
                        </div>
                      </div>

                      {/* Cover Letter / Introduction */}
                      {coverText && (
                        <div className="space-y-1">
                          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cover Letter / Introduction</h5>
                          <div className="bg-card border border-border rounded-lg p-3 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {coverText}
                          </div>
                        </div>
                      )}

                      {/* Parsed WBS Tasks */}
                      {parsedWbs && parsedWbs.tasks && parsedWbs.tasks.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Proposed User Stories ({parsedWbs.tasks.length})</h5>
                          <div className="space-y-2">
                            {parsedWbs.tasks.map((t, tIdx) => {
                              const cleanTitle = (t.title || "").replace(/\s*\[UCID:[^\]]+\]/gi, "").trim();
                              const minis = t.miniTasks || t.MiniTasks || t.requirements || [];
                              return (
                                <div key={tIdx} className="bg-card border border-border rounded-lg p-3 text-xs space-y-1.5">
                                  <div className="flex items-center justify-between font-semibold text-foreground">
                                    <span>{cleanTitle || t.title}</span>
                                    {t.durationDays > 0 && <span className="text-muted-foreground font-normal">{t.durationDays} days</span>}
                                  </div>
                                  {minis.length > 0 && (
                                    <div className="pl-3 border-l-2 border-brand-primary/30 space-y-1 mt-1">
                                      {minis.map((m, mIdx) => (
                                        <div key={mIdx} className="text-muted-foreground flex items-center justify-between text-[11px]">
                                          <span>- {m.title || m.Title}</span>
                                          <span>{m.durationDays || m.duration || 1} d</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Proposal Attachments */}
                      {atts.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attached Assets ({atts.length})</h5>
                          <div className="flex flex-wrap gap-2">
                            {atts.map((att, aIdx) => {
                              const rawUrl = typeof att === "string" ? att : (att.url || att.Url || "#");
                              const rawName = (typeof att === "object" ? att.name : null) || rawUrl.split("/").pop() || "Attachment";
                              const cleanName = cleanFileName(rawName);
                              return (
                                <button
                                  key={aIdx}
                                  type="button"
                                  onClick={(e) => handleDownloadFile(e, rawUrl, rawName)}
                                  className="inline-flex items-center gap-2 px-3 py-1 bg-card hover:bg-secondary border border-border rounded-lg text-xs font-medium text-foreground/80 hover:text-foreground transition-colors cursor-pointer max-w-full overflow-hidden"
                                  title={cleanName}
                                >
                                  <Paperclip className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                  <span className="truncate max-w-[260px] sm:max-w-[340px] block">{cleanName}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border px-6 py-4 bg-card flex justify-end">
              <button
                type="button"
                onClick={() => { setSelectedProposalProject(null); setProposalsList([]); }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium hover:bg-secondary-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProjects;
