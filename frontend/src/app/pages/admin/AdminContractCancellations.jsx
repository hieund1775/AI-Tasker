import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  RefreshCw,
  Ban,
  User,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton.jsx";
import { EmptyState } from "../../components/shared/EmptyState.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { StatusBadge } from "../../components/shared/StatusBadge.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../../services/api.js";
import { listProjects, listUsers, updateProjectStatus } from "../../../data/mockDatabase.js";

/**
 * AdminContractCancellations — Admin management page for client contract
 * cancellation requests. Shows all contracts with cancellation data and
 * allows admins to review, approve, or reject cancellations.
 * Route: /admin/contract-cancellations
 */
export function AdminContractCancellations() {
  const { user } = useAuth();
  const [cancelledProjects, setCancelledProjects] = useState([]);
  const [enrichedProjects, setEnrichedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // all | pending_review | approved | rejected
  const [adminNote, setAdminNote] = useState("");

  const loadData = () => {
    setLoading(true);
    try {
      const allProjects = listProjects();
      const allUsers = listUsers();

      // Build user lookup
      const userMap = {};
      allUsers.forEach((u) => { userMap[u.id] = u; });

      // Find projects with cancellations — both pending and processed
      const cancelled = allProjects.filter(
        (p) =>
          p.status === "contract_cancelled" ||
          p.status === "cancelled" ||
          p.contractCancellation != null ||
          p.cancellationRequest != null
      );

      // Also include projects with pending cancellation requests (not yet processed)
      const allWithCancellation = allProjects.filter(
        (p) =>
          p.status === "contract_cancelled" ||
          p.status === "cancelled" ||
          p.cancellationRequest != null
      );

      const enriched = allWithCancellation.map((p) => {
        const client = userMap[p.clientId];
        const expert = userMap[p.assignedExpertId];
        const cancelMeta = p.contractCancellation || p.cancellationRequest || {};

        // Determine review status
        let reviewStatus = "approved"; // processed cancellations
        if (cancelMeta.status === "pending_review") reviewStatus = "pending_review";
        else if (cancelMeta.status === "rejected") reviewStatus = "rejected";
        else if (!p.contractCancellation && p.cancellationRequest) reviewStatus = "pending_review";

        return {
          ...p,
          clientName: client?.fullName || "Unknown Client",
          clientEmail: client?.email || "",
          expertName: expert?.fullName || "Unknown Expert",
          expertEmail: expert?.email || "",
          cancelMeta,
          reviewStatus,
        };
      });

      setCancelledProjects(allWithCancellation);
      setEnrichedProjects(enriched);
    } catch (err) {
      console.error("[AdminContractCancellations] Error loading:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const handleUpdate = () => loadData();
    window.addEventListener("aitasker_db_update", handleUpdate);
    return () => window.removeEventListener("aitasker_db_update", handleUpdate);
  }, []);

  const filtered = enrichedProjects.filter((p) => {
    if (filter === "all") return true;
    return p.reviewStatus === filter;
  });

  const handleApprove = async (project) => {
    setActionLoading(true);
    try {
      await updateProjectStatus(project.id, "contract_cancelled");
      // The cancellation data already exists on the project from the client's request
      toast.success(`Cancellation for "${project.title}" has been approved.`);
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      setSelectedProject(null);
      setAdminNote("");
    } catch (err) {
      toast.error(err.message || "Failed to approve cancellation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (project) => {
    if (!adminNote.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }
    setActionLoading(true);
    try {
      await updateProjectStatus(project.id, "active");
      toast.success(`Cancellation for "${project.title}" has been rejected. Project restored.`);
      window.dispatchEvent(new CustomEvent("aitasker_db_update"));
      setSelectedProject(null);
      setAdminNote("");
    } catch (err) {
      toast.error(err.message || "Failed to reject cancellation.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSkeleton variant="dashboard" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Contract Cancellations"
        subtitle="Review and manage client contract cancellation requests."
        icon={Ban}
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { key: "all", label: "All", icon: FileText },
          { key: "pending_review", label: "Pending Review", icon: Clock },
          { key: "approved", label: "Approved", icon: CheckCircle2 },
          { key: "rejected", label: "Rejected", icon: XCircle },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 transition-colors ${
              filter === key
                ? "bg-brand-primary text-brand-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Ban}
          title="No cancellation requests"
          description={filter === "all" ? "No contract cancellations found." : `No ${filter.replace("_", " ")} cancellations found.`}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((project) => {
            const meta = project.cancelMeta || {};
            const isPending = project.reviewStatus === "pending_review";

            return (
              <div
                key={project.id}
                className={`bg-card rounded-xl border p-5 transition-all ${
                  isPending ? "border-amber-200 ring-1 ring-amber-100" : "border-border"
                }`}
              >
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  {/* Left: Project info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={project.reviewStatus === "pending_review" ? "pending" : project.status} entity="project" />
                      {isPending && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
                          Needs Review
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{project.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3 h-3" /> Client: <span className="font-semibold text-foreground">{project.clientName}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Expert: <span className="font-semibold text-foreground">{project.expertName}</span>
                      </span>
                      {meta.cancelledAt && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(meta.cancelledAt).toLocaleDateString()}
                        </span>
                      )}
                      {meta.progressPercent != null && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Progress: {meta.progressPercent}%
                        </span>
                      )}
                    </div>
                    {meta.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-semibold">Reason:</span> {meta.reason}
                      </p>
                    )}
                  </div>

                  {/* Right: Financial summary + actions */}
                  <div className="flex flex-col items-end gap-3">
                    {meta.contractAmount != null && (
                      <div className="bg-secondary/60 rounded-lg px-4 py-2 text-xs space-y-1 min-w-[200px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Contract:</span>
                          <span className="font-bold text-foreground"><MoneyDisplay amount={meta.contractAmount} /></span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expert Pay:</span>
                          <span className="font-semibold text-amber-600"><MoneyDisplay amount={meta.expertPayout || 0} /></span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Client Refund:</span>
                          <span className="font-semibold text-green-600"><MoneyDisplay amount={meta.clientRefund || 0} /></span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-1">
                          <span className="text-muted-foreground">Platform Fee:</span>
                          <span className="font-semibold text-muted-foreground"><MoneyDisplay amount={meta.platformServiceFee || 0} /></span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/projects/${project.id}`}
                        className="h-9 px-3 border border-border text-foreground/80 rounded-lg hover:bg-secondary font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Project
                      </Link>
                      {isPending && (
                        <>
                          <button
                            onClick={() => setSelectedProject(project)}
                            className="h-9 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Review
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review/Decision Modal */}
      <Dialog open={!!selectedProject} onOpenChange={() => { setSelectedProject(null); setAdminNote(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Review Cancellation Request</DialogTitle>
          </DialogHeader>

          {selectedProject && (() => {
            const meta = selectedProject.cancelMeta || {};
            const contractAmount = meta.contractAmount || selectedProject.escrowAmount || selectedProject.budget || 0;
            const progressPayout = meta.progressPayout || Math.round(contractAmount * (meta.progressPercent || 0) / 100 * 100) / 100;
            const compensationFee = meta.compensationFee || Math.round(contractAmount * 0.10 * 100) / 100;
            const platformServiceFee = meta.platformServiceFee || Math.round(contractAmount * 0.05 * 100) / 100;
            const rawExpertPayout = progressPayout + compensationFee;
            const expertPayout = Math.min(contractAmount - platformServiceFee, rawExpertPayout);
            const clientRefund = Math.max(0, contractAmount - expertPayout - platformServiceFee);

            return (
              <div className="space-y-4 text-sm">
                {/* Project overview */}
                <div className="p-4 bg-secondary/40 rounded-xl space-y-2">
                  <h4 className="font-bold text-foreground">{selectedProject.title}</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Client:</strong> {selectedProject.clientName} ({selectedProject.clientEmail})</p>
                    <p><strong>Expert:</strong> {selectedProject.expertName} ({selectedProject.expertEmail})</p>
                    <p><strong>Progress:</strong> {meta.progressPercent ?? "N/A"}%</p>
                    <p><strong>Reason:</strong> {meta.reason || "None provided"}</p>
                  </div>
                </div>

                {/* Financial breakdown */}
                <div className="p-4 border border-border rounded-xl space-y-2">
                  <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">Financial Breakdown</h5>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between"><span>Contract Value:</span><span className="font-bold"><MoneyDisplay amount={contractAmount} /></span></div>
                    <div className="flex justify-between"><span>Progress Pay ({meta.progressPercent || 0}%):</span><span><MoneyDisplay amount={progressPayout} /></span></div>
                    <div className="flex justify-between"><span>Compensation (10%):</span><span><MoneyDisplay amount={compensationFee} /></span></div>
                    <div className="flex justify-between"><span>Platform Fee (5%):</span><span><MoneyDisplay amount={platformServiceFee} /></span></div>
                    <div className="border-t border-border pt-1 flex justify-between"><span className="font-bold">Expert Payout:</span><span className="font-bold text-amber-600"><MoneyDisplay amount={expertPayout} /></span></div>
                    <div className="flex justify-between"><span className="font-bold">Client Refund:</span><span className="font-bold text-green-600"><MoneyDisplay amount={clientRefund} /></span></div>
                  </div>
                </div>

                {/* Admin note for rejection */}
                <div>
                  <label className="block text-foreground/80 font-semibold mb-1 text-sm">
                    Admin Note <span className="text-red-500">*</span> (required for rejection)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide reason for rejection..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full p-3 border border-input rounded-[10px] focus:outline-none focus:border-brand-primary text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                  <button
                    onClick={() => { setSelectedProject(null); setAdminNote(""); }}
                    className="px-4 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReject(selectedProject)}
                    disabled={actionLoading || !adminNote.trim()}
                    className="px-4 py-2 bg-red-600 disabled:bg-red-300 text-white rounded-lg text-sm font-bold disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Reject Cancellation
                  </button>
                  <button
                    onClick={() => handleApprove(selectedProject)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Approve Cancellation
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminContractCancellations;
