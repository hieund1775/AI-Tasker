import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Wallet,
  Shield,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  CheckCircle,
  PlusCircle,
  Send,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { MoneyInput } from "../../components/shared/MoneyInput.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import { api } from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { notifyEscrowFunded } from "../../../services/notificationHelper.js";
import { setDepositTime, calculateTaskDeadlines } from "../../lib/taskDeadlineUtils.js";
import { formatCurrency } from "../../lib/formatCurrency.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeLabels = {
  deposit: "deposit",
  manualdeposit: "deposit",
  withdrawal: "withdrawal",
  escrow_deposit: "escrow deposit",
  escrowdeposit: "escrow deposit",
  escrow_release: "escrow release",
  escrowrelease: "escrow release",
  releasepayment: "escrow release",
  escrow_refund: "dispute refund",
  escrowrefund: "dispute refund",
  refund: "dispute refund",
  dispute: "dispute refund",
  platformfee: "platform fee",
  platform_fee: "platform fee",
  cancel: "cancellation request",
  report_request: "reported request",
  verdict: "report",
};

const typeIcons = {
  escrow_deposit: Shield,
  escrowdeposit: Shield,
  escrow_release: ArrowUpCircle,
  escrowrelease: ArrowUpCircle,
  releasepayment: ArrowUpCircle,
  escrow_refund: ArrowDownCircle,
  escrowrefund: ArrowDownCircle,
  refund: ArrowDownCircle,
  dispute: ArrowDownCircle,
  platformfee: Shield,
  platform_fee: Shield,
  cancel: ArrowDownCircle,
  verdict: ArrowDownCircle,
  deposit: PlusCircle,
  manualdeposit: PlusCircle,
  withdrawal: Send,
};

const statusColors = {
  completed: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

const transactionSortColumns = [
  { key: "type", label: "Type", align: "left", sortable: false },
  { key: "description", label: "Description", align: "left", sortable: false },
  { key: "amount", label: "Amount", align: "right", sortable: false },
  { key: "status", label: "Status", align: "right", sortable: false },
  { key: "date", label: "Date", align: "right", sortable: true },
];

function getTransactionSortValue(tx, key) {
  const lowerType = tx.type?.toLowerCase();
  if (key === "type") return typeLabels[lowerType] || tx.type || "";
  if (key === "description") return tx.projectTitle || tx.description || "";
  if (key === "amount") return Number(tx.amount ?? tx.Amount ?? 0) || 0;
  if (key === "status") return tx.status || tx.projectStatus || "";
  if (key === "date") {
    const rawStr = tx.createdAt || "";
    const dateValue = new Date(rawStr + (rawStr && typeof rawStr === "string" && !rawStr.endsWith("Z") && !rawStr.match(/[+-]\d{2}:\d{2}$/) ? "Z" : "")).getTime();
    return Number.isFinite(dateValue) ? dateValue : 0;
  }
  return "";
}

function sortTransactions(rows, sortState) {
  if (!sortState.key || !sortState.dir) return rows;

  return [...rows].sort((a, b) => {
    const aVal = getTransactionSortValue(a, sortState.key);
    const bVal = getTransactionSortValue(b, sortState.key);
    const aNum = Number(aVal);
    const bNum = Number(bVal);
    const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum) && aVal !== "" && bVal !== "";

    if (bothNumeric) {
      return sortState.dir === "asc" ? aNum - bNum : bNum - aNum;
    }

    const result = String(aVal ?? "").localeCompare(String(bVal ?? ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
    return sortState.dir === "asc" ? result : -result;
  });
}

function getClientTransactionDisplayStatus(tx) {
  const projId = tx.projectId;
  const projIdLower = projId ? String(projId).toLowerCase() : "";
  const dbStatus = (tx.projectStatus || "").toLowerCase();
  let localStatus = projIdLower ? (localStorage.getItem(`project_status_${projIdLower}`) || "").toLowerCase() : "";
  const localReleases = JSON.parse(localStorage.getItem("escrow_releases") || "[]");
  const isReleasedLocally = localReleases.some(r => String(r.projectId).toLowerCase() === projIdLower);
  if (isReleasedLocally) localStatus = "completed";
  if (!localStatus) localStatus = dbStatus;

  const hasDisputeVerdict = projIdLower && (() => {
    const verdict = localStorage.getItem(`dispute_verdict_${projIdLower}`);
    if (!verdict) return false;
    try { return !!JSON.parse(verdict); } catch (e) { return false; }
  })();
  if (hasDisputeVerdict && ["cancelled", "stopped", "cancel_done"].includes(localStatus)) {
    localStatus = "done";
  }

  const lowerType = tx.type?.toLowerCase();
  const isEscrowDeposit = lowerType === "escrow_deposit" || lowerType === "escrowdeposit";
  if (isEscrowDeposit) {
    if (localStatus === "completed" || localStatus === "done") return "done";
    if (["cancelled", "stopped", "cancel_done", "resolved", "disputed"].includes(localStatus)) return "cancel";
    return "in progress";
  }
  if (lowerType === "cancel") return tx.status || "done";
  return "done";
}

function SignedTransactionAmount({ amount }) {
  const value = Number(amount ?? 0);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const tone = value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <span className={`font-semibold tabular-nums ${tone}`}>
      {sign}{formatCurrency(Math.abs(value))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isEscrowRedirect = location.state?.escrowRedirect === true;

  // Escrow deposit form
  const [showDepositForm, setShowDepositForm] = useState(location.state?.escrowRedirect || false);
  const [depositAmount, setDepositAmount] = useState(location.state?.amount || 0);
  const [selectedProject, setSelectedProject] = useState(location.state?.projectId || "");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [transactionSort, setTransactionSort] = useState({ key: null, dir: null });
  const [transactionStatusFilter, setTransactionStatusFilter] = useState("");

  // Deposit via ZaloPay
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [walletDepositAmount, setWalletDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);

  // Withdrawal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const handleTransactionSort = (key) => {
    if (key !== "date") return;
    setTransactionSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  };

  const transactionStatusOptions = [
    { value: "", label: "All Statuses" },
    { value: "done", label: "Done" },
    { value: "in progress", label: "In Progress" },
    { value: "cancel", label: "Cancel" },
  ];
  const filteredTransactions = (data?.transactions || []).filter((tx) => {
    if (!transactionStatusFilter) return true;
    return getClientTransactionDisplayStatus(tx).toLowerCase() === transactionStatusFilter;
  });
  const sortedTransactions = sortTransactions(filteredTransactions, transactionSort);

  useEffect(() => {
    const currentUserId = user?.id || user?.Id;
    if (!currentUserId) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const [wallet, transactions, clientProjects, reportsRes] = await Promise.all([
          api.payments.getWallet(currentUserId).catch(() => null),
          api.payments.getTransactions(currentUserId).catch(() => []),
          api.projects.getByClient(currentUserId).catch(() => []),
          api.reports.getAll().catch(() => []),
        ]);

        if (!cancelled) {
          const rawProjects = Array.isArray(clientProjects)
            ? clientProjects
            : (clientProjects?.value || clientProjects?.data || []);

          const localReleases = JSON.parse(localStorage.getItem("escrow_releases") || "[]");
          const clientReleases = localReleases.filter(r => String(r.clientId).toLowerCase() === String(currentUserId).toLowerCase());

          // Build report mapping
          const reports = Array.isArray(reportsRes) ? reportsRes : (reportsRes?.data || []);
          const projectReportMap = new Map();
          reports.forEach(r => {
            const pId = String(r.projectId || r.ProjectId || "").toLowerCase();
            if (pId) {
              projectReportMap.set(pId, r);
            }
          });

          // Helper to get cancellation split details dynamically
          const getCancellationPayouts = (p) => {
            const projIdLower = String(p.id || p.Id).toLowerCase();

            // 1. Try to get from Backend Metadata
            const metadataStr = p.metadata || p.Metadata;
            if (metadataStr) {
              try {
                const md = JSON.parse(metadataStr);
                if (typeof md.expertPayout !== "undefined" && typeof md.clientRefund !== "undefined") {
                  return {
                    expertPayout: Number(md.expertPayout),
                    clientRefund: Number(md.clientRefund),
                  };
                }
              } catch (e) { }
            }

            // 2. Fallback to localStorage (legacy)
            const localExpertPayout = localStorage.getItem(`cancellation_expert_payout_${projIdLower}`);
            const localClientRefund = localStorage.getItem(`cancellation_client_refund_${projIdLower}`);
            if (localExpertPayout !== null && localClientRefund !== null) {
              return {
                expertPayout: Number(localExpertPayout),
                clientRefund: Number(localClientRefund),
              };
            }

            const report = projectReportMap.get(projIdLower);
            const escrowTotal = p.budget ?? p.Budget ?? p.escrowBalance ?? p.escrowAmount ?? 0;

            if (report) {
              const isClientReporter = (report.reporterRole || report.ReporterRole || "").toLowerCase() === "client";
              const tasks = p.tasks || p.Tasks || [];
              let progressPercent = 60;
              if (tasks.length > 0) {
                const doneCount = tasks.filter(t => t.isDone || t.IsDone || t.status === "Approved").length;
                progressPercent = Math.round((doneCount / tasks.length) * 100);
              } else if (report.payoutBreakdown?.progressPercent) {
                progressPercent = report.payoutBreakdown.progressPercent;
              }

              const progressRate = progressPercent / 100;
              const platformFee = Math.round(escrowTotal * 0.05);
              const penaltyFee = Math.round(escrowTotal * 0.10);
              const progressAmount = Math.round(escrowTotal * progressRate);

              let expertPayout = 0;
              let clientRefund = 0;

              if (isClientReporter) {
                expertPayout = progressAmount + penaltyFee;
                clientRefund = escrowTotal - platformFee - expertPayout;
              } else {
                expertPayout = Math.max(0, progressAmount - penaltyFee - platformFee);
                clientRefund = escrowTotal - expertPayout - platformFee;
              }

              return { expertPayout, clientRefund };
            }

            const platformFee = Math.round(escrowTotal * 0.05);
            const penaltyFee = Math.round(escrowTotal * 0.10);
            const progressAmount = Math.round(escrowTotal * 0.60);
            return {
              expertPayout: progressAmount + penaltyFee,
              clientRefund: escrowTotal - platformFee - (progressAmount + penaltyFee),
            };
          };

          const dbProjectStatusMap = new Map();
          rawProjects.forEach(p => {
            const pId = String(p.id || p.Id || "").toLowerCase();
            if (pId) {
              dbProjectStatusMap.set(pId, p.status || p.Status || "");
            }
          });

          const cancelledProjectSplits = new Map();
          rawProjects.forEach(p => {
            const projId = p.id || p.Id;
            const projIdLower = String(projId).toLowerCase();
            const localStatus = (localStorage.getItem(`project_status_${projIdLower}`) || p.status || p.Status || "").toLowerCase();
            const hasVerdict = !!localStorage.getItem(`dispute_verdict_${projIdLower}`);
            const report = projectReportMap.get(projIdLower);
            const isCancelledOrResolved =
              hasVerdict ||
              ["cancelled", "cancel_done", "stopped", "contract_cancelled", "resolved"].includes(localStatus) ||
              (report && ["resolved", "accepted"].includes(String(report.status || "").toLowerCase()));

            if (isCancelledOrResolved) {
              const splits = getCancellationPayouts(p);
              cancelledProjectSplits.set(projIdLower, {
                ...splits,
                escrowTotal: p.budget ?? p.Budget ?? p.escrowBalance ?? p.escrowAmount ?? 1000,
                title: p.title || p.jobPostTitle || "Project",
              });
            }
          });

          // Check compensating transactions to skip them
          const isCompensatingTx = (t) => {
            const lType = (t.type ?? t.Type ?? "").toLowerCase();
            if (lType !== "deposit" && lType !== "manualdeposit" && lType !== "withdrawal" && lType !== "withdraw") {
              return false;
            }
            const amt = t.amount ?? t.Amount ?? 0;
            for (const [projIdLower, split] of cancelledProjectSplits.entries()) {
              const report = projectReportMap.get(projIdLower);
              const escrowTotal = split.escrowTotal || 1000;
              const platformFee = Math.round(escrowTotal * 0.05);
              if (report) {
                const stubExpert = report.escrowPayExpert || report.EscrowPayExpert || 285;
                const stubClient = report.escrowRefundClient || report.EscrowRefundClient || 600;

                // Standard cancellation differences
                const diffExpert = split.expertPayout - stubExpert;
                const diffClient = split.clientRefund - stubClient;

                // Escalated verdict differences
                const diffExpertEscrow = split.expertPayout - escrowTotal;
                const diffExpertEscrowWithFee = split.expertPayout - escrowTotal + platformFee;
                const diffClientEscrow = split.clientRefund - escrowTotal;
                const diffClientEscrowWithFee = split.clientRefund - escrowTotal + platformFee;

                // Direct payouts in case of failed release/refund
                const isDirectExpert = Math.abs(amt - split.expertPayout) < 1.0;
                const isDirectClient = Math.abs(amt - split.clientRefund) < 1.0;

                if (
                  Math.abs(amt - diffExpert) < 1.0 ||
                  Math.abs(amt - diffClient) < 1.0 ||
                  Math.abs(amt - diffExpertEscrow) < 1.0 ||
                  Math.abs(amt - diffExpertEscrowWithFee) < 1.0 ||
                  Math.abs(amt - diffClientEscrow) < 1.0 ||
                  Math.abs(amt - diffClientEscrowWithFee) < 1.0 ||
                  isDirectExpert ||
                  isDirectClient
                ) {
                  return true;
                }
              }
            }
            return false;
          };

          const myTransactions = [];
          const cancelledProjIdsInDb = new Set();
          // Track EscrowDeposit rows for cancelled projects to transform them
          const cancelledEscrowDepositRows = new Map(); // projIdLower -> transformed row

          if (Array.isArray(transactions)) {
            transactions.forEach(t => {
              const lType = (t.type ?? t.Type ?? "").toLowerCase();
              const projId = t.projectId || t.ProjectId;
              const projIdLower = projId ? String(projId).toLowerCase() : null;
              const tAmount = t.amount ?? t.Amount ?? 0;
              const tId = t.id || t.Id;
              const tDate = t.createdAt ?? t.CreatedAt;
              const tTitle = t.projectTitle || t.ProjectTitle || null;

              if (projIdLower && cancelledProjectSplits.has(projIdLower)) {
                cancelledProjIdsInDb.add(projIdLower);
                // For cancelled/disputed projects: only keep EscrowDeposit row, transform it to "cancel project" with status "cancel"
                const isEscrowDeposit = lType === "escrow_deposit" || lType === "escrowdeposit";
                if (isEscrowDeposit && !cancelledEscrowDepositRows.has(projIdLower)) {
                  cancelledEscrowDepositRows.set(projIdLower, {
                    id: `cancelled-escrow-${tId}`,
                    projectId: projId,
                    amount: tAmount, // negative amount (e.g. -1000)
                    type: "cancel",  // maps to "cancel project"
                    status: "cancel",
                    createdAt: tDate,
                    projectTitle: tTitle || cancelledProjectSplits.get(projIdLower)?.title,
                  });
                }
                return; // Skip all other raw rows for cancelled project
              }

              // Skip deposit transactions that match dispute/report verdict refund amounts
              if (lType === "deposit" || lType === "manualdeposit") {
                let isVerdictDeposit = false;
                cancelledProjectSplits.forEach((split, pid) => {
                  const grossBudget = split.escrowTotal || split.clientRefund || 10000;
                  const platformFee = Math.round(grossBudget * 0.05);
                  const netRefund = grossBudget - platformFee;
                  if (Math.abs(tAmount - netRefund) < 2.0 || Math.abs(tAmount - split.clientRefund) < 2.0) {
                    isVerdictDeposit = true;
                  }
                  const dvRaw = localStorage.getItem(`dispute_verdict_${pid}`);
                  if (!dvRaw) return;
                  try {
                    const dv = JSON.parse(dvRaw);
                    const netAmount = dv.clientReceives - dv.clientFee;
                    if (Math.abs(tAmount - netAmount) < 2.0) isVerdictDeposit = true;
                  } catch (e) { }
                });
                if (isVerdictDeposit) return;
              }

              if (isCompensatingTx(t)) {
                return; // Skip compensating transactions
              }

              if (
                lType !== "releasepayment" &&
                lType !== "escrow_release" &&
                lType !== "escrowrelease"
              ) {
                myTransactions.push({
                  id: tId,
                  projectId: projId,
                  amount: tAmount,
                  type: lType,
                  createdAt: tDate,
                  projectTitle: tTitle,
                  projectStatus: projIdLower ? dbProjectStatusMap.get(projIdLower) : "",
                });
              }
            });
          }

          // Insert rows for each cancelled/disputed project - dispute verdict vs cancellation negotiation
          function addVerdictRows(projIdLower, split, tDate) {
            const dvRaw = localStorage.getItem(`dispute_verdict_${projIdLower}`);
            const report = projectReportMap.get(projIdLower);
            const isCancellationReport = (report?.reportType || report?.disputeType || "").toLowerCase() === "cancellation";

            if (isCancellationReport) {
              if (split?.clientRefund > 0) {
                myTransactions.push({
                  id: `cancel-refund-${projIdLower}`,
                  projectId: projIdLower,
                  amount: split.clientRefund,
                  type: "cancel",
                  status: "done",
                  createdAt: tDate,
                  projectTitle: split?.title || "Project",
                });
              }
              return;
            }

            const escrowRow = cancelledEscrowDepositRows.get(projIdLower);
            if (escrowRow) {
              myTransactions.push(escrowRow);
            } else if (split?.escrowTotal > 0) {
              myTransactions.push({
                id: `cancel-escrow-${projIdLower}`,
                projectId: projIdLower,
                amount: -split.escrowTotal,
                type: "cancel",
                status: "cancel",
                createdAt: tDate,
                projectTitle: split?.title || "Project",
              });
            }

            const isReportResolvedByAdmin = report && (
              report.adminNote ||
              localStorage.getItem(`report_status_${projIdLower}`) ||
              ["Resolved", "Accepted"].includes(report.status)
            );

            if (isReportResolvedByAdmin) {
              // Report Flow (Admin resolution): Only show rows IF Client actually receives refund!
              if (split?.clientRefund > 0) {
                const grossBudget = split.escrowTotal || split.clientRefund || 10000;
                const pFee = Math.round(grossBudget * 0.05);

                myTransactions.push({
                  id: `report-refund-${projIdLower}`,
                  projectId: projIdLower,
                  amount: grossBudget,
                  type: "report_request",
                  status: "done",
                  createdAt: tDate,
                  projectTitle: split?.title || "Project",
                });

                if (pFee > 0) {
                  myTransactions.push({
                    id: `report-fee-${projIdLower}`,
                    projectId: projIdLower,
                    amount: -pFee,
                    type: "platform_fee",
                    status: "done",
                    createdAt: tDate,
                    projectTitle: split?.title || "Project",
                    description: "systemfee",
                  });
                }
              }
              // If clientRefund <= 0 (Released to Expert), Client Billing stays 100% quiet ("im ru")!
              return;
            }

            if (dvRaw) {
              try {
                const dv = JSON.parse(dvRaw);
                if (dv.clientReceives > 0) {
                  myTransactions.push({
                    id: `verdict-refund-${projIdLower}`,
                    projectId: projIdLower,
                    amount: dv.clientReceives,
                    type: "escrow_refund",
                    status: "done",
                    createdAt: tDate,
                    projectTitle: split?.title || "Project",
                  });
                  if (dv.clientFee > 0) {
                    myTransactions.push({
                      id: `verdict-fee-${projIdLower}`,
                      projectId: projIdLower,
                      amount: -dv.clientFee,
                      type: "platform_fee",
                      status: "done",
                      createdAt: tDate,
                      projectTitle: split?.title || "Project",
                    });
                  }
                }
                return;
              } catch (e) { }
            }

            // Cancellation negotiation fallback (normal cancellation flow)
            if (split?.clientRefund > 0) {
              myTransactions.push({
                id: `cancel-refund-${projIdLower}`,
                projectId: projIdLower,
                amount: split.clientRefund,
                type: "cancel",
                status: "done",
                createdAt: tDate,
                projectTitle: split?.title || "Project",
              });
            }
          }

          cancelledProjIdsInDb.forEach(projIdLower => {
            const split = cancelledProjectSplits.get(projIdLower);
            const report = projectReportMap.get(projIdLower);
            const tDate = report ? report.updatedAt || report.UpdatedAt || report.createdAt : new Date().toISOString();
            addVerdictRows(projIdLower, split, tDate);
          });

          // Fallback: cancelled projects with NO DB transactions yet (e.g. just executed verdict)
          cancelledProjectSplits.forEach((split, projIdLower) => {
            if (cancelledProjIdsInDb.has(projIdLower)) return;
            const report = projectReportMap.get(projIdLower);
            const tDate = report ? report.updatedAt || report.UpdatedAt || report.createdAt : new Date().toISOString();
            addVerdictRows(projIdLower, split, tDate);
          });

          const transactionProjectIds = new Set(
            myTransactions
              .filter(t => {
                const lType = t.type?.toLowerCase();
                return lType === "escrow_release" || lType === "escrowrelease" || lType === "releasepayment";
              })
              .filter(t => t.projectId)
              .map(t => String(t.projectId).toLowerCase())
          );

          const localDeposits = JSON.parse(localStorage.getItem("zalopay_deposits") || "[]");
          const userDeposits = localDeposits.filter(d => String(d.userId).toLowerCase() === String(currentUserId).toLowerCase());

          const dbDeposits = myTransactions.filter(t => {
            const lType = t.type?.toLowerCase();
            return lType === "deposit" || lType === "manualdeposit";
          });

          let adjustedBalance = wallet?.balance ?? 0;

          // Helper: parse DB date string correctly as UTC
          const parseDbDate = (str) => {
            if (!str) return 0;
            const hasTimezone = /[Z]$|[+-]\d{2}:\d{2}$/.test(str);
            return new Date(hasTimezone ? str : str + "Z").getTime();
          };

          userDeposits.forEach(d => {
            const ackKey = `zalopay_ack_${d.id}`;
            const isAcked = localStorage.getItem(ackKey) === "1";

            if (isAcked) {
              return;
            }

            const dTime = new Date(d.createdAt).getTime();
            const match = dbDeposits.find(dbTx => {
              const dbTime = parseDbDate(dbTx.createdAt);
              const isTimeClose = Math.abs(dbTime - dTime) <= 60 * 60 * 1000;
              const isAmountMatch = Math.abs(Number(dbTx.amount) - Number(d.amount)) < 0.01;
              return isAmountMatch && isTimeClose;
            });

            if (match) {
              try { localStorage.setItem(ackKey, "1"); } catch (e) { }
            } else {
              adjustedBalance += d.amount;
              myTransactions.unshift({
                id: d.id || crypto.randomUUID(),
                projectId: null,
                amount: d.amount,
                type: "deposit",
                createdAt: d.createdAt || new Date().toISOString(),
                projectTitle: null,
              });
            }
          });

          const localDepositedIds = JSON.parse(localStorage.getItem("deposited_project_ids") || "[]");
          const activeProjects = rawProjects
            .filter((p) => {
              const projId = p.id || p.Id;
              const projIdLower = projId ? String(projId).toLowerCase() : "";
              const localStatus = (
                localStorage.getItem(`project_status_${projIdLower}`) ||
                localStorage.getItem(`project_status_${projId}`) ||
                p.status ||
                ""
              ).toLowerCase().trim();
              const isCompletedOrResolved =
                ["completed", "complete", "closed", "resolved", "cancelled", "cancel_done", "contract_cancelled", "stopped", "disputed"].includes(localStatus);
              const isReleasedLocally = clientReleases.some(r => String(r.projectId).toLowerCase() === projIdLower);
              const hasDisputeVerdict = !!localStorage.getItem(`dispute_verdict_${projIdLower}`);

              const isDeposited = projIdLower ? localDepositedIds.some(id => String(id).toLowerCase() === projIdLower) : false;

              return !isCompletedOrResolved && !isReleasedLocally && !hasDisputeVerdict && isDeposited;
            })
            .map((p) => {
              const projId = p.id || p.Id;
              const pEscrow = p.escrowBalance ?? p.escrowAmount ?? p.budget ?? p.Budget ?? 0;
              return {
                id: projId,
                title: p.jobPost?.title || p.title || p.jobPostTitle || "Active Project",
                escrowAmount: pEscrow,
              };
            })
            .filter((p) => p.escrowAmount > 0);

          const adjustedEscrowBalance = activeProjects.reduce((sum, p) => sum + p.escrowAmount, 0);

          myTransactions.sort((a, b) => {
            const timeA = parseDbDate(a.createdAt);
            const timeB = parseDbDate(b.createdAt);
            return timeB - timeA;
          });

          setData({
            wallet: {
              balance: adjustedBalance,
              escrowBalance: adjustedEscrowBalance,
            },
            transactions: myTransactions,
            activeProjects,
          });
        }
      } catch (err) {
        console.error("Failed to load billing data:", err);
        if (!cancelled) {
          setData({
            wallet: { balance: 0, escrowBalance: 0 },
            transactions: [],
            activeProjects: [],
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener("aitasker_db_update", handleUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("aitasker_db_update", handleUpdate);
    };
  }, [user?.id, user?.Id]);

  const handleWalletDeposit = async (e) => {
    e.preventDefault();
    const amount = Number(walletDepositAmount);
    if (!amount || amount < 1000) return;

    setDepositLoading(true);
    setFeedback(null);
    try {
      const resolvedUserId = user?.id || user?.Id;
      const res = await api.payments.createPaymentOrder(resolvedUserId, amount);
      if (res && res.orderUrl) {
        setFeedback({ type: "success", message: "Redirecting to ZaloPay payment gateway..." });
        sessionStorage.setItem("payment_return_url", window.location.pathname + window.location.search);
        setTimeout(() => {
          window.location.href = res.orderUrl;
        }, 1000);
      } else {
        throw new Error("Failed to retrieve ZaloPay payment link.");
      }
    } catch (err) {
      console.error("Wallet deposit via ZaloPay failed:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Failed to create deposit order. Please try again later."
      });
      setShowDepositModal(false);
      setWalletDepositAmount("");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWalletWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0 || amount > (data?.wallet?.balance || 0)) return;

    setWithdrawLoading(true);
    setFeedback(null);
    try {
      const resolvedUserId = user?.id || user?.Id;
      const res = await api.payments.withdraw(resolvedUserId, amount);

      setFeedback({ type: "success", message: res?.message || "Withdrawal successful!" });
      setShowWithdrawModal(false);
      setWithdrawAmount("");

      try {
        localStorage.setItem("aitasker_wallet_updated", Date.now().toString());
      } catch (e) { }

      window.dispatchEvent(new Event("aitasker_db_update"));

    } catch (err) {
      console.error("Withdraw failed:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Withdrawal failed. Please try again later."
      });
      setShowWithdrawModal(false);
      setWithdrawAmount("");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || depositAmount <= 0 || !selectedProject) return;

    // Balance check
    if (data?.wallet?.balance < depositAmount) {
      setFeedback({
        type: "error",
        message: "Insufficient available balance in wallet. Please deposit more funds to escrow."
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await api.payments.depositEscrow({
        projectId: selectedProject,
        clientId: user.id,
        amount: Number(depositAmount),
      });

      // Add to deposited_project_ids in localStorage
      try {
        const deposited = JSON.parse(localStorage.getItem("deposited_project_ids") || "[]");
        const projectIdStr = String(selectedProject).toLowerCase();
        if (!deposited.map(id => String(id).toLowerCase()).includes(projectIdStr)) {
          deposited.push(projectIdStr);
          localStorage.setItem("deposited_project_ids", JSON.stringify(deposited));
        }
      } catch (e) { }

      setFeedback({ type: "success", message: "Escrow deposit successful! Your project is now Active." });
      setShowDepositForm(false);
      setDepositAmount(0);
      setSelectedProject("");

      try {
        localStorage.setItem("aitasker_wallet_updated", Date.now().toString());
      } catch (e) { }

      // Notify expert that escrow has been funded and project started
      const proposalId = location.state?.proposalId;
      const expertId = location.state?.expertId;
      const jobTitle = location.state?.projectTitle || "Project";
      if (expertId) {
        notifyEscrowFunded({
          expertUserId: expertId,
          clientName: user?.fullName || user?.name || "Client",
          jobTitle,
          proposalId: proposalId || "",
        }).catch(() => { });
      }

      // Update wallet values directly from backend on navigation
      // Calculate task deadlines based on deposit time
      setDepositTime(selectedProject);
      // Fetch project tasks to calculate sequential deadlines
      api.projects.getTasks(selectedProject).then(tasks => {
        if (Array.isArray(tasks) && tasks.length > 0) {
          calculateTaskDeadlines(selectedProject, tasks);
        }
      }).catch(() => { });
      // Store original project deadline in localStorage for extension tracking
      api.projects.getById(selectedProject).then(proj => {
        if (proj) {
          const deadline = proj.endDate || proj.EndDate || proj.deadline || proj.Deadline;
          if (deadline) localStorage.setItem(`project_deadline_${selectedProject}`, deadline);
        }
      }).catch(() => { });
      setTimeout(() => {
        navigate("/client/my-projects");
      }, 2000);

    } catch (err) {
      console.error("Escrow deposit failed:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Escrow deposit failed. Please try again later."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async (transactionId) => {
    try {
      await api.payments.releaseEscrow({ transactionId });
    } catch {
      // Demo - no visual change needed
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-secondary rounded w-48" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-secondary rounded-xl" />
            <div className="h-24 bg-secondary rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <BackButton fallback="/client/dashboard" className="mb-0">Back to Dashboard</BackButton>
      <PageHeader
        title="Billing & Payments"
        subtitle="Manage your wallet, escrow payments, and transaction history."
      />

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm font-medium ${feedback.type === "success"
            ? "bg-success-light text-success border border-success/20"
            : "bg-destructive-light text-destructive border border-destructive/20"
            }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Wallet cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-semibold text-foreground">
                  <MoneyDisplay amount={data?.wallet?.balance ?? 0} />
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDepositModal(true)}
                className="px-3.5 py-2 bg-success text-success-foreground rounded-lg hover:opacity-90 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Deposit
              </button>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(true)}
                className="px-3.5 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> Withdraw
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm md:justify-self-end md:w-full">
          <div className="flex items-center gap-3 mb-4 md:justify-end md:text-right">
            <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center md:order-2">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div className="md:order-1">
              <p className="text-sm text-muted-foreground">In Escrow</p>
              <p className="text-2xl font-semibold text-foreground">
                <MoneyDisplay amount={data?.wallet?.escrowBalance ?? 0} />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active projects with escrow */}
      {data?.activeProjects?.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Active Projects</h2>
          </div>
          <div className="divide-y">
            {data.activeProjects.map((proj) => (
              <div key={proj.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{proj.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Escrow: <MoneyDisplay amount={proj.escrowAmount} />
                  </p>
                </div>
                <div className="flex gap-2">
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deposit to escrow */}
      {isEscrowRedirect && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Deposit to Escrow</h2>
          </div>

          {showDepositForm && (
            <div className="p-6">
              <form onSubmit={handleDeposit} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-2">Project</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedProject(val);
                      if (val) {
                        const proj = data?.activeProjects?.find(p => p.id === val);
                        if (proj) {
                          setDepositAmount(proj.escrowAmount || proj.budget || 0);
                        }
                      } else {
                        setDepositAmount(0);
                      }
                    }}
                    className={`w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring font-medium ${isEscrowRedirect ? "bg-muted cursor-not-allowed text-muted-foreground" : "bg-card text-foreground"}`}
                    required
                    disabled={isEscrowRedirect}
                  >
                    {isEscrowRedirect ? (
                      <option value={location.state.projectId}>{location.state.projectTitle}</option>
                    ) : (
                      <>
                        <option value="">Select a project</option>
                        {(data?.activeProjects || []).map((p) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-2">Amount</label>
                  <MoneyInput
                    min="1"
                    value={depositAmount || ""}
                    onValueChange={(value) => setDepositAmount(value === "" ? 0 : value)}
                    className={`w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring font-medium ${isEscrowRedirect ? "bg-muted cursor-not-allowed text-muted-foreground" : "bg-card text-foreground"}`}
                    placeholder="500"
                    required
                    disabled={isEscrowRedirect}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !depositAmount || depositAmount <= 0 || !selectedProject}
                    className="h-10 px-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    {submitting ? "Processing..." : "Confirm Escrow"}
                  </button>
                  {!isEscrowRedirect && (
                    <button
                      type="button"
                      onClick={() => setShowDepositForm(false)}
                      className="h-10 px-4 border border-border text-foreground rounded-xl hover:bg-secondary text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Transaction history */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Transaction History</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Status:</span>
            <select
              value={transactionStatusFilter}
              onChange={(event) => setTransactionStatusFilter(event.target.value)}
              className="h-10 rounded-xl border border-input bg-card px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {transactionStatusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!data?.transactions?.length ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Clock className="w-7 h-7 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {transactionSortColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`${col.align === "right" ? "text-right" : "text-left"} px-6 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider`}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleTransactionSort(col.key)}
                          className={`inline-flex items-center gap-1.5 transition-colors hover:text-foreground ${col.align === "right" ? "justify-end ml-auto" : ""}`}
                          title={transactionSort.key === col.key && transactionSort.dir === "asc" ? "Sort Z-A" : transactionSort.key === col.key && transactionSort.dir === "desc" ? "Clear sort" : "Sort A-Z"}
                        >
                          {col.label}
                          {transactionSort.key === col.key ? (
                            transactionSort.dir === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5 text-brand-primary" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-brand-primary" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-45" />
                          )}
                        </button>
                      ) : (
                        <span>{col.label}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={transactionSortColumns.length} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      No transactions match the selected status.
                    </td>
                  </tr>
                ) : sortedTransactions.map((tx) => {
                  const projId = tx.projectId;
                  const projIdLower = projId ? String(projId).toLowerCase() : "";
                  const dbStatus = (tx.projectStatus || "").toLowerCase();

                  // Check if project has local status override (normalize key to lowercase!)
                  let localStatus = projIdLower ? (localStorage.getItem(`project_status_${projIdLower}`) || "").toLowerCase() : "";

                  // Also check if there's a local release in escrow_releases
                  const localReleases = JSON.parse(localStorage.getItem("escrow_releases") || "[]");
                  const isReleasedLocally = localReleases.some(r => String(r.projectId).toLowerCase() === projIdLower);
                  if (isReleasedLocally) {
                    localStatus = "completed";
                  }

                  // Fall back to dbStatus if no local override
                  if (!localStatus) {
                    localStatus = dbStatus;
                  }

                  // For dispute verdicts, show status as "done" not "cancel"
                  const hasDisputeVerdict = projIdLower && (() => {
                    const r = localStorage.getItem(`dispute_verdict_${projIdLower}`);
                    if (!r) return false;
                    try { return !!JSON.parse(r); } catch (e) { return false; }
                  })();
                  if (hasDisputeVerdict && (localStatus === "cancelled" || localStatus === "stopped" || localStatus === "cancel_done")) {
                    localStatus = "done";
                  }

                  let lowerType = tx.type?.toLowerCase();
                  const isEscrowDeposit = lowerType === "escrow_deposit" || lowerType === "escrowdeposit";

                  let displayStatus = localStatus || tx.status || "completed";
                  let displayAmount = tx.amount ?? tx.Amount ?? 0;

                  if (isEscrowDeposit) {
                    if (localStatus === "completed" || localStatus === "done") {
                      displayStatus = "done";
                      displayAmount = -Math.abs(displayAmount);
                    } else if (localStatus === "cancelled" || localStatus === "stopped" || localStatus === "cancel_done" || localStatus === "resolved" || localStatus === "disputed") {
                      lowerType = "cancel";
                      displayStatus = "cancel";
                      displayAmount = -Math.abs(displayAmount);
                    } else {
                      displayStatus = "in progress";
                      displayAmount = -Math.abs(displayAmount);
                    }
                  } else if (lowerType === "cancel") {
                    // Preserve cancel row status (either "cancel" for negative row or "done" for refund row)
                    displayStatus = tx.status || "done";
                    if (displayStatus === "cancel") {
                      displayAmount = -Math.abs(displayAmount);
                    }
                  } else {
                    displayStatus = "done";
                    if (lowerType === "withdrawal" || lowerType === "withdraw") {
                      displayAmount = -Math.abs(displayAmount);
                    }
                  }

                  const Icon = typeIcons[lowerType] || typeIcons[tx.type?.toLowerCase()] || Clock;
                  const rawStr = tx.createdAt || "";
                  const dateObj = new Date(rawStr + (rawStr && typeof rawStr === "string" && !rawStr.endsWith("Z") && !rawStr.match(/[+-]\d{2}:\d{2}$/) ? "Z" : ""));
                  const dateStr = dateObj.toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                  });
                  const hours = dateObj.getHours();
                  const mins = String(dateObj.getMinutes()).padStart(2, "0");
                  const secs = String(dateObj.getSeconds()).padStart(2, "0");
                  const ampm = hours >= 12 ? "PM" : "AM";
                  const displayHours = hours % 12 || 12;
                  const timeStr = `${String(displayHours).padStart(2, "0")}:${mins}:${secs} ${ampm}`;

                  let badgeClass = "bg-success/10 text-success border border-success/20";
                  if (displayStatus === "in progress") {
                    badgeClass = "bg-warning/10 text-warning border border-warning/20";
                  } else if (displayStatus === "REPORT") {
                    badgeClass = "bg-destructive/10 text-destructive border border-destructive/20";
                  } else if (displayStatus === "CANCEL" || displayStatus === "cancel") {
                    badgeClass = "bg-secondary text-muted-foreground border border-border";
                  }

                  // Process description display as requested
                  let displayDesc = tx.description;
                  if (lowerType === "deposit" || lowerType === "manualdeposit") displayDesc = "Deposit From ZaloPay";
                  else if (lowerType === "withdrawal" || lowerType === "withdraw") displayDesc = "withdrawal";
                  else if (lowerType === "verdict") displayDesc = "report successful";
                  else if (lowerType === "platform_fee" || lowerType === "platformfee") displayDesc = "systemfee";
                  else if (["escrow_deposit", "escrowdeposit", "escrow_release", "escrowrelease", "releasepayment", "escrow_refund", "escrowrefund", "refund", "dispute", "cancel", "report_request"].includes(lowerType)) {
                    displayDesc = tx.projectTitle ? `Project: ${tx.projectTitle}` : (tx.description || "Project: AI-Tasker");
                  }

                  // Report/Compensation: if cannot compensate (amount <= 0), show "-"
                  const isNoCompensation = ["escrow_refund", "escrowrefund", "refund", "dispute", "cancel", "verdict"].includes(lowerType) &&
                    displayStatus !== "cancel" &&
                    Number(displayAmount || 0) <= 0;

                  return (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm text-foreground font-medium">{typeLabels[lowerType] || tx.type}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{displayDesc}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {isNoCompensation ? "-" : <SignedTransactionAmount amount={displayAmount} />}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${badgeClass}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-semibold leading-none text-foreground">{dateStr}</span>
                          <span className="-mt-px text-[11px] font-medium leading-none tracking-wide text-muted-foreground">{timeStr}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div data-modal-overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-success" /> Deposit funds
            </h3>
            <p className="text-sm text-muted-foreground">
              Enter the amount you wish to deposit into your wallet via ZaloPay (minimum 1,000 VND).
            </p>
            <form onSubmit={handleWalletDeposit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2">Amount (VND)</label>
                <MoneyInput
                  min="1000"
                  value={walletDepositAmount}
                  onValueChange={setWalletDepositAmount}
                  placeholder="e.g. 50000"
                  className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring font-medium"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={depositLoading || !walletDepositAmount || Number(walletDepositAmount) < 1000}
                  className="flex-1 h-10 bg-success text-success-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-all"
                >
                  {depositLoading ? "Processing..." : "Deposit via ZaloPay"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDepositModal(false);
                    setWalletDepositAmount("");
                  }}
                  className="px-5 h-10 border border-border text-foreground rounded-xl hover:bg-secondary text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div data-modal-overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Withdraw funds
            </h3>
            <p className="text-sm text-muted-foreground">
              Enter the amount you wish to withdraw from your available balance (Current available balance: <span className="font-semibold text-foreground"><MoneyDisplay amount={data?.wallet?.balance ?? 0} /></span>).
            </p>
            <form onSubmit={handleWalletWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2">Withdrawal Amount (VND)</label>
                <MoneyInput
                  min="1"
                  max={data?.wallet?.balance || 0}
                  value={withdrawAmount}
                  onValueChange={setWithdrawAmount}
                  placeholder="e.g. 20000"
                  className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring font-medium"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={withdrawLoading || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > (data?.wallet?.balance || 0)}
                  className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-all"
                >
                  {withdrawLoading ? "Processing..." : "Withdraw"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount("");
                  }}
                  className="px-5 h-10 border border-border text-foreground rounded-xl hover:bg-secondary text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
