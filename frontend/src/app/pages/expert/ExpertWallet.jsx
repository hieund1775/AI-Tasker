import { useState, useEffect } from "react";
import {
  Wallet,
  Clock,
  ReceiptText,
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
import { VisaWithdrawalFields, emptyVisaWithdrawalCard, isValidVisaWithdrawalCard } from "../../components/wallet/VisaWithdrawalFields.jsx";
import { api } from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { formatCurrency } from "../../lib/formatCurrency.js";
import { toast } from "sonner";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveExpertId(user) {
  // TODO: Replace with API call - api.users.getProfile()
  return user?.id || null;
}

function getExpertWalletData() {
  // TODO: Replace with API call - api.payments.getWallet()
  return {
    wallet: { balance: 0, pendingBalance: 0, totalEarned: 0 },
    transactions: [],
  };
}

const statusColors = {
  completed: "bg-success-light text-success",
  pending: "bg-warning-light text-warning",
  failed: "bg-destructive-light text-destructive",
};

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
  platformfee: "System Platform Fee",
  platform_fee: "System Platform Fee",
  cancel: "cancellation request",
  report_request: "PAYOUT",
  verdict: "PAYOUT",
};

function isReportLikeDeposit(tx) {
  const lowerType = (tx.type ?? tx.Type ?? "").toLowerCase();
  if (lowerType !== "deposit" && lowerType !== "manualdeposit") return false;
  const text = [
    tx.description,
    tx.Description,
    tx.projectStatus,
    tx.ProjectStatus,
    tx.status,
    tx.Status,
    tx.id,
    tx.Id,
  ].filter(Boolean).join(" ").toLowerCase();

  return /\b(report|reported|dispute|refund|verdict|compensation)\b/.test(text);
}

function getTransactionTypeLabel(tx, lowerType) {
  if (isReportLikeDeposit(tx)) return typeLabels.report_request;
  return typeLabels[lowerType] || tx.type;
}

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
  if (key === "status") return tx.status || "";
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

function getExpertTransactionDisplayStatus(tx) {
  const lowerType = tx.type?.toLowerCase();

  if (lowerType === "escrow_deposit" || lowerType === "escrowdeposit") {
    return tx.status === "completed" ? "done" : "in progress";
  }

  if (lowerType === "cancel" && tx.status === "cancel") {
    return "cancel";
  }

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

export function ExpertWallet() {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeProjects, setActiveProjects] = useState([]);
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
  const [withdrawCard, setWithdrawCard] = useState(emptyVisaWithdrawalCard);
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
    { value: "", label: "All" },
    { value: "done", label: "Done" },
    { value: "in progress", label: "In Progress" },
    { value: "cancel", label: "Cancel" },
  ];

  const filteredTransactions = (data?.transactions || []).filter((tx) => {
    if (!transactionStatusFilter) return true;
    return getExpertTransactionDisplayStatus(tx).toLowerCase() === transactionStatusFilter;
  });
  const sortedTransactions = sortTransactions(filteredTransactions, transactionSort);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const currentUserId = user?.id || user?.Id;

        if (!currentUserId) {
          if (!cancelled) {
            setData({ wallet: { balance: 0, pendingBalance: 0, totalEarned: 0 }, transactions: [] });
            setActiveProjects([]);
          }
          return;
        }

        const [wallet, transactions, projects, reportsRes] = await Promise.all([
          api.users.getWallet(currentUserId).catch(() => null),
          api.payments.getTransactions(currentUserId).catch(() => []),
          api.projects.getByExpert(currentUserId).catch(() => []),
          api.reports.getAll().catch(() => []),
        ]);

        if (!cancelled) {
          const expertProjects = Array.isArray(projects)
            ? projects
            : (projects?.value || projects?.data || []);

          const localReleases = JSON.parse(localStorage.getItem("escrow_releases") || "[]");
          const expertReleases = localReleases.filter(r => String(r.expertId).toLowerCase() === String(currentUserId).toLowerCase());

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
                    verdictType: md.verdictType,
                  };
                }
              } catch(e) {}
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

          const cancelledProjectSplits = new Map();
          expertProjects.forEach(p => {
            const projId = p.id || p.Id;
            const projIdLower = String(projId).toLowerCase();
            const localStatus = localStorage.getItem(`project_status_${projIdLower}`) || p.status || p.Status || "";
            const report = projectReportMap.get(projIdLower);
            const isTerminallyCancelled =
              ["cancelled", "cancel_done", "stopped", "contract_cancelled"].includes(localStatus.toLowerCase()) ||
              (report && ["resolved", "accepted"].includes(String(report.status || "").toLowerCase())) ||
              !!localStorage.getItem(`dispute_verdict_${projIdLower}`);

            if (isTerminallyCancelled) {
              const splits = getCancellationPayouts(p);
              cancelledProjectSplits.set(projIdLower, {
                ...splits,
                escrowTotal: p.budget ?? p.Budget ?? p.escrowBalance ?? p.escrowAmount ?? 10000,
                title: p.title || p.jobPostTitle || "Project",
              });
            }
          });

          // Check compensating transactions to skip them
          const isCompensatingTx = (t) => {
            const lType = (t.type ?? t.Type ?? "").toLowerCase();
            // Check compensating transactions to skip them.
            // Compensation entries (escrow adjustments) are matched by amount, so
            // deposits AND withdrawals that equal a compensation diff are skipped.
            if (lType !== "deposit" && lType !== "manualdeposit" && lType !== "withdrawal" && lType !== "withdraw") {
              return false;
            }
            const amt = t.amount ?? t.Amount ?? 0;
            for (const [projIdLower, split] of cancelledProjectSplits.entries()) {
              const report = projectReportMap.get(projIdLower);
              const escrowTotal = split.escrowTotal || 10000;
              const platformFee = Math.round(escrowTotal * 0.05);

              if (
                Math.abs(amt - split.expertPayout) < 2.0 ||
                Math.abs(amt - (escrowTotal - platformFee)) < 2.0 ||
                Math.abs(amt - escrowTotal) < 2.0
              ) {
                return true;
              }

              if (report) {
                const stubExpert = report.escrowPayExpert || report.EscrowPayExpert || 285;
                const stubClient = report.escrowRefundClient || report.EscrowRefundClient || 600;

                // Amounts are stored positive; compensation diffs can be negative
                const diffExpert = Math.abs(split.expertPayout - stubExpert);
                const diffClient = Math.abs(split.clientRefund - stubClient);
                const diffExpertEscrow = Math.abs(split.expertPayout - escrowTotal);
                const diffExpertEscrowWithFee = Math.abs(split.expertPayout - escrowTotal + platformFee);

                if (
                  Math.abs(amt - diffExpert) < 2.0 ||
                  Math.abs(amt - diffClient) < 2.0 ||
                  Math.abs(amt - diffExpertEscrow) < 2.0 ||
                  Math.abs(amt - diffExpertEscrowWithFee) < 2.0
                ) {
                  return true;
                }
              }
            }
            return false;
          };

          const myTransactions = [];
          const cancelledProjIdsInDb = new Set();

          if (Array.isArray(transactions)) {
            transactions.forEach(t => {
              const lType = (t.type ?? t.Type ?? "").toLowerCase();
              const projId = t.projectId || t.ProjectId;
              const projIdLower = projId ? String(projId).toLowerCase() : null;
              const tAmount = t.amount ?? t.Amount ?? 0;
              const tId = t.id || t.Id;
              const tDate = t.createdAt ?? t.CreatedAt;
              const tTitle = t.projectTitle || t.ProjectTitle || null;
              const txReport = projIdLower ? projectReportMap.get(projIdLower) : null;
              const isReportResolvedTx = txReport && (
                txReport.adminNote ||
                localStorage.getItem(`report_status_${projIdLower}`) ||
                ["resolved", "accepted"].includes(String(txReport.status || "").toLowerCase())
              );

              // Skip ALL transactions for cancelled/reported projects - we'll insert clean rows instead
              if (projIdLower && cancelledProjectSplits.has(projIdLower)) {
                cancelledProjIdsInDb.add(projIdLower);
                return; // Skip all raw DB rows for cancelled projects
              }

              // Skip deposit transactions matching dispute verdict payout amounts
              if (lType === "deposit" || lType === "manualdeposit") {
                let isVerdictDeposit = false;
                cancelledProjectSplits.forEach((split, pid) => {
                  const escrowTotal = split.escrowTotal || 10000;
                  const netPay = escrowTotal * 0.95;
                  if (Math.abs(tAmount - netPay) < 2.0 || Math.abs(tAmount - split.expertPayout) < 2.0) {
                    isVerdictDeposit = true;
                  }
                  const dvRaw = localStorage.getItem(`dispute_verdict_${pid}`);
                  if (!dvRaw) return;
                  try {
                    const dv = JSON.parse(dvRaw);
                    const netAmount = dv.expertReceives - dv.expertFee;
                    if (Math.abs(tAmount - netAmount) < 2.0) isVerdictDeposit = true;
                  } catch (e) {}
                });
                if (isVerdictDeposit) return;
              }

              if (isCompensatingTx(t)) {
                return; // Skip compensating transactions
              }

              if (lType === "releasepayment" || lType === "escrow_release" || lType === "escrowrelease") {
                const originalAmount = tAmount * 100 / 95;
                myTransactions.push({
                  id: tId,
                  projectId: projId,
                  amount: originalAmount,
                  type: lType,
                  createdAt: tDate,
                  projectTitle: tTitle,
                  description: t.description || t.Description,
                });
                myTransactions.push({
                  id: `fee-${tId}`,
                  projectId: projId,
                  amount: -originalAmount * 0.05,
                  type: "platform_fee",
                  createdAt: tDate,
                  projectTitle: tTitle,
                  description: "System Platform Fee",
                });
              } else {
                myTransactions.push({
                  id: tId,
                  projectId: projId,
                  amount: tAmount,
                  type: (lType === "deposit" || lType === "manualdeposit") && isReportResolvedTx ? "report_request" : lType,
                  createdAt: tDate,
                  projectTitle: tTitle,
                  description: t.description || t.Description,
                });
              }
            });
          }

          // Insert clean report/cancelled project rows: 
          // If cancellation negotiation: show 1 consolidated payout row (expertPayout, e.g. 250)
          // If dispute report (Admin resolution): show 2 rows (Gross 10,000 + Fee -500)
          cancelledProjectSplits.forEach((split, projIdLower) => {
            const report = projectReportMap.get(projIdLower);
            const tDate = report ? report.updatedAt || report.UpdatedAt || report.createdAt : new Date().toISOString();
            const isCancellationReport = (report?.reportType || report?.disputeType || "").toLowerCase() === "cancellation";

            if (isCancellationReport || !report) {
              if (split.expertPayout > 0) {
                myTransactions.push({
                  id: `cancel-payout-${projIdLower}`,
                  projectId: projIdLower,
                  amount: split.expertPayout,
                  type: "cancel",
                  status: "done",
                  createdAt: tDate,
                  projectTitle: split.title,
                });
              }
              return;
            }

            const isReportResolvedByAdmin = (split?.verdictType === "client_refund" || split?.verdictType === "expert_paid") || (
              report && (
                report.adminNote ||
                localStorage.getItem(`report_status_${projIdLower}`) ||
                ["Resolved", "Accepted"].includes(report.status)
              )
            );

            if (isReportResolvedByAdmin) {
              // Dispute Report Flow (Admin resolution): payout row (gross) + system fee row
              if (split.expertPayout > 0) {
                const grossBudget = split.escrowTotal || 10000;
                const pFee = Math.round(grossBudget * 0.05);

                myTransactions.push({
                  id: `cancel-payout-${projIdLower}`,
                  projectId: projIdLower,
                  amount: grossBudget,
                  type: "report_request",
                  status: "done",
                  createdAt: tDate,
                  projectTitle: split.title,
                });

                if (pFee > 0) {
                  myTransactions.push({
                    id: `cancel-fee-${projIdLower}`,
                    projectId: projIdLower,
                    amount: -pFee,
                    type: "platform_fee",
                    status: "done",
                    createdAt: tDate,
                    projectTitle: split.title,
                    description: "System Platform Fee",
                  });
                }
              }
              // If expertPayout <= 0 (Refunded to Client), Expert Wallet stays 100% EMPTY ("im ru")!
            } else {
              // Normal Cancellation Flow (Negotiation): 1 consolidated row (expertPayout)
              if (split.expertPayout > 0) {
                myTransactions.push({
                  id: `cancel-payout-${projIdLower}`,
                  projectId: projIdLower,
                  amount: split.expertPayout,
                  type: "cancel",
                  status: "done",
                  createdAt: tDate,
                  projectTitle: split.title,
                });
              }
            }
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
          let adjustedTotalEarned = wallet?.totalEarned ?? 0;

          // Adjust total earned for cancelled projects based on actual verdict data
          cancelledProjectSplits.forEach((split, projIdLower) => {
            const dvRaw = localStorage.getItem(`dispute_verdict_${projIdLower}`);
            if (dvRaw) {
              try {
                const dv = JSON.parse(dvRaw);
                if (dv.expertReceives > 0) {
                  adjustedTotalEarned += (dv.expertReceives - dv.expertFee);
                }
                // expertReceives = 0 -> expert lost -> no adjustment
              } catch (e) {}
              return;
            }
            // Check if report flow or cancel flow
            const hasReport = projectReportMap.has(projIdLower);
            if (hasReport) {
              // Report flow: subtract 5% platform fee
              const platformFee = Math.round((split.escrowTotal || 1000) * 0.05);
              adjustedTotalEarned += Math.max(0, split.expertPayout - platformFee);
            } else {
              // Cancel flow: payout is already net from backend
              adjustedTotalEarned += split.expertPayout;
            }
          });

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
              // DB already processed this deposit - wallet.balance already includes it - don't add again
              return;
            }

            // Try to find matching DB transaction to confirm this deposit was processed
            const dTime = new Date(d.createdAt).getTime();
            const match = dbDeposits.find(dbTx => {
              const dbTime = parseDbDate(dbTx.createdAt);
              const isTimeClose = Math.abs(dbTime - dTime) <= 60 * 60 * 1000; // within 1 hour
              const isAmountMatch = Math.abs(Number(dbTx.amount) - Number(d.amount)) < 0.01;
              return isAmountMatch && isTimeClose;
            });

            if (match) {
              // DB confirmed this deposit - mark as acked so we won't double-count next time
              try { localStorage.setItem(ackKey, "1"); } catch (e) { }
              // wallet.balance already has this amount - don't add
            } else {
              // Webhook not yet processed by DB - add manually for immediate feedback
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
          const activeProj = expertProjects.filter((p) => {
            const projId = p.id || p.Id;
            const projIdLower = String(projId || "").toLowerCase();
            const localStatus = (localStorage.getItem(`project_status_${projIdLower}`) || p.status || p.Status || "").toLowerCase().trim();
            const isCompleted =
              ["completed", "complete", "closed", "resolved", "cancelled", "cancel_done", "stopped", "terminated", "disputed"].includes(localStatus);
            const isReleasedLocally = expertReleases.some(r => String(r.projectId).toLowerCase() === projIdLower);
            const isCancelledOrReported = cancelledProjectSplits.has(projIdLower);

            const hasDbReleaseTx = transactionProjectIds.has(projIdLower);
            if (isReleasedLocally && !hasDbReleaseTx && !isCompleted && !isCancelledOrReported) {
              const budget = p.budget ?? p.Budget ?? p.escrowBalance ?? p.escrowAmount ?? 0;
              const netAmount = budget * 0.95;
              adjustedBalance += netAmount;
              adjustedTotalEarned += netAmount;
            }

            const isDeposited = projId ? localDepositedIds.some(id => String(id).toLowerCase() === projIdLower) : false;

            return !isCompleted && !isReleasedLocally && !isCancelledOrReported && isDeposited;
          });

          // Check for any expert releases where project is not in DB list
          expertReleases.forEach(r => {
            const releaseProjIdLower = String(r.projectId).toLowerCase();
            const hasProj = expertProjects.some(p => String(p.id || p.Id).toLowerCase() === releaseProjIdLower);
            const hasDbReleaseTx = transactionProjectIds.has(releaseProjIdLower);
            if (!hasProj && !hasDbReleaseTx) {
              const netAmount = r.amount * 0.95;
              adjustedBalance += netAmount;
              adjustedTotalEarned += netAmount;
            }
          });

          const sumEscrow = activeProj.reduce((acc, p) => acc + (p.escrowBalance || 0), 0);

          setActiveProjects(
            activeProj.map((p) => ({
              id: p.id || p.Id,
              title: p.title || p.jobPostTitle || "Active Project",
              escrowAmount: p.escrowBalance || 0,
            }))
          );

          expertReleases.forEach(r => {
            const releaseProjIdLower = String(r.projectId).toLowerCase();
            if (!transactionProjectIds.has(releaseProjIdLower)) {
              myTransactions.unshift({
                id: r.id || crypto.randomUUID(),
                projectId: r.projectId,
                amount: r.amount,
                type: "escrow_release",
                createdAt: r.createdAt || new Date().toISOString(),
                projectTitle: r.projectTitle || "Project",
              });
              myTransactions.unshift({
                id: `fee-${r.id || crypto.randomUUID()}`,
                projectId: r.projectId,
                amount: -r.amount * 0.05,
                type: "platform_fee",
                createdAt: r.createdAt || new Date().toISOString(),
                projectTitle: r.projectTitle || "Project",
              });
            }
          });

          myTransactions.sort((a, b) => {
            const timeA = parseDbDate(a.createdAt);
            const timeB = parseDbDate(b.createdAt);
            return timeB - timeA;
          });

          setData({
            wallet: {
              balance: adjustedBalance,
              pendingBalance: sumEscrow,
              totalEarned: adjustedTotalEarned,
            },
            transactions: myTransactions,
          });
        }
      } catch (err) {
        console.error("Failed to fetch expert wallet data:", err);
        if (!cancelled) {
          setData({ wallet: { balance: 0, pendingBalance: 0, totalEarned: 0 }, transactions: [] });
          setActiveProjects([]);
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
      const res = await api.payments.createPaymentOrder(resolvedUserId, amount, window.location.href);
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
    if (!isValidVisaWithdrawalCard(withdrawCard)) {
      setFeedback({ type: "error", message: "Please enter valid Visa card details before withdrawing." });
      return;
    }

    setWithdrawLoading(true);
    setFeedback(null);
    try {
      const resolvedUserId = user?.id || user?.Id;
      const res = await api.payments.withdraw(resolvedUserId, amount, {
        bankCode: withdrawCard.bankCode,
        cardNumber: withdrawCard.cardNumber.replace(/\D/g, ""),
        cardHolderName: withdrawCard.cardHolderName.trim(),
      });

      const successMessage = res?.message || "Withdrawal successful!";
      setFeedback({ type: "success", message: successMessage });
      toast.success(successMessage);
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawCard(emptyVisaWithdrawalCard);

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
      toast.error(err?.message || "Withdrawal failed. Please try again later.");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawCard(emptyVisaWithdrawalCard);
    } finally {
      setWithdrawLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <BackButton fallback="/expert/dashboard" className="mb-0">
        Back to Dashboard
      </BackButton>
      <PageHeader
        title="My Wallet"
        subtitle="Manage your earnings and withdrawals."
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


      {/* Wallet stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-light rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Available Balance</p>
                <p className="text-2xl font-semibold text-foreground">
                  <MoneyDisplay amount={data?.wallet?.balance ?? 0} />
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDepositModal(true)}
                className="px-3 py-1.5 bg-success text-success-foreground rounded-lg hover:opacity-90 text-[11px] font-semibold transition-all flex items-center gap-1 shadow-sm"
              >
                <PlusCircle className="w-3 h-3" /> Deposit
              </button>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(true)}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-[11px] font-semibold transition-all flex items-center gap-1 shadow-sm"
              >
                <Send className="w-3 h-3" /> Withdraw
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm md:justify-self-end md:w-full">
          <div className="flex items-center gap-3 md:justify-end md:text-right">
            <div className="w-10 h-10 bg-warning-light rounded-xl flex items-center justify-center md:order-2">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div className="md:order-1">
              <p className="text-sm text-muted-foreground">Pending / In Escrow</p>
              <p className="text-2xl font-semibold text-foreground">
                <MoneyDisplay amount={data?.wallet?.pendingBalance ?? 0} />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active projects with escrow */}
      {activeProjects.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="p-6 border-b border-border/60">
            <h2 className="text-lg font-semibold text-foreground">Active Projects</h2>
          </div>
          <div className="divide-y">
            {activeProjects.map((proj) => (
              <div key={proj.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{proj.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Escrow: <MoneyDisplay amount={proj.escrowAmount} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Transaction History
          </h2>
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
            <ReceiptText className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
            <p className="text-muted-foreground">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/50">
                  {transactionSortColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`${col.align === "right" ? "text-right" : "text-left"} px-6 py-2.5 text-sm font-semibold text-muted-foreground uppercase`}
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

                  const lowerType = tx.type?.toLowerCase();

                  // displayStatus: "in progress" for active escrow, "cancel" for cancelled escrow rows, "done" for everything else
                  let displayStatus = "done";
                  if (lowerType === "escrow_deposit" || lowerType === "escrowdeposit") {
                    displayStatus = (tx.status === "completed") ? "done" : "in progress";
                  } else if (lowerType === "cancel" && tx.status === "cancel") {
                    displayStatus = "cancel";
                  }

                  const badgeClass = displayStatus === "in progress"
                    ? "bg-warning/10 text-warning border border-warning/20"
                    : displayStatus === "cancel"
                      ? "bg-secondary text-muted-foreground border border-border"
                      : "bg-success/10 text-success border border-success/20";

                  // Process description display as requested
                  let displayDesc = tx.description;
                  if (isReportLikeDeposit(tx)) displayDesc = "Reported SuccessFull";
                  else if (lowerType === "deposit" || lowerType === "manualdeposit") displayDesc = "Deposit From ZaloPay";
                  else if (lowerType === "withdrawal" || lowerType === "withdraw") displayDesc = "withdrawal";
                  else if (lowerType === "verdict") displayDesc = "Reported SuccessFull";
                  else if (lowerType === "report_request") displayDesc = "Reported SuccessFull";
                  else if (lowerType === "platform_fee" || lowerType === "platformfee") displayDesc = "System Platform Fee";
                  else if (["escrow_deposit", "escrowdeposit", "escrow_release", "escrowrelease", "releasepayment", "escrow_refund", "escrowrefund", "refund", "dispute", "cancel"].includes(lowerType)) {
                    displayDesc = tx.projectTitle ? `Project: ${tx.projectTitle}` : (tx.description || "Project: AI-Tasker");
                  }

                  let displayAmount = tx.amount ?? tx.Amount ?? 0;
                  if (lowerType === "withdrawal" || lowerType === "withdraw") {
                    displayAmount = -Math.abs(displayAmount);
                  }

                  // Report/Compensation: if cannot compensate (amount <= 0), show "-"
                  const isNoCompensation = ["escrow_refund", "escrowrefund", "refund", "dispute", "cancel", "verdict"].includes(lowerType) && Number(displayAmount || 0) <= 0;

                  return (
                    <tr key={tx.id} className="hover:bg-secondary/50">
                      <td className="px-6 py-4 text-sm text-foreground font-medium uppercase">
                        {getTransactionTypeLabel(tx, lowerType)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-sm text-muted-foreground">
                          <span>{displayDesc}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {isNoCompensation ? "-" : <SignedTransactionAmount amount={displayAmount} />}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${badgeClass}`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
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
              <VisaWithdrawalFields
                amount={withdrawAmount}
                balance={data?.wallet?.balance || 0}
                card={withdrawCard}
                onChange={setWithdrawCard}
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={withdrawLoading || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > (data?.wallet?.balance || 0) || !isValidVisaWithdrawalCard(withdrawCard)}
                  className="flex-1 h-10 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-all"
                >
                  {withdrawLoading ? "Processing..." : "Withdraw"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount("");
                    setWithdrawCard(emptyVisaWithdrawalCard);
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
