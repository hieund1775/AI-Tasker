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
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { api } from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import { notifyEscrowFunded } from "../../../services/notificationHelper.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeLabels = {
  deposit: "nạp tiền",
  manualdeposit: "nạp tiền",
  withdrawal: "rút tiền",
  escrow_deposit: "ký quỹ",
  escrowdeposit: "ký quỹ",
  escrow_release: "giải ngân",
  escrowrelease: "giải ngân",
  releasepayment: "giải ngân",
  escrow_refund: "tố cáo",
  escrowrefund: "tố cáo",
  refund: "tố cáo",
  dispute: "tố cáo",
  platformfee: "phí hệ thống",
  platform_fee: "phí hệ thống",
  cancel: "hủy dự án",
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
  deposit: PlusCircle,
  manualdeposit: PlusCircle,
  withdrawal: Send,
};

const statusColors = {
  completed: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

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

  // Deposit via ZaloPay
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [walletDepositAmount, setWalletDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);

  // Withdrawal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

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
            if (pId && (r.reportType === "cancellation" || r.disputeType === "cancellation")) {
              projectReportMap.set(pId, r);
            }
          });

          // Helper to get cancellation split details dynamically
          const getCancellationPayouts = (p) => {
            const projIdLower = String(p.id || p.Id).toLowerCase();

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
          rawProjects.forEach(p => {
            const projId = p.id || p.Id;
            const projIdLower = String(projId).toLowerCase();
            const localStatus = localStorage.getItem(`project_status_${projIdLower}`) || p.status || p.Status || "";
            const isCancelled = ["cancelled", "cancel_done"].includes(localStatus.toLowerCase());
            if (isCancelled) {
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
                // For cancelled projects: only keep EscrowDeposit row, transform it to "hủy dự án" with status "cancel"
                const isEscrowDeposit = lType === "escrow_deposit" || lType === "escrowdeposit";
                if (isEscrowDeposit && !cancelledEscrowDepositRows.has(projIdLower)) {
                  cancelledEscrowDepositRows.set(projIdLower, {
                    id: `cancelled-escrow-${tId}`,
                    projectId: projId,
                    amount: tAmount, // negative amount (e.g. -1000)
                    type: "cancel",  // maps to "hủy dự án"
                    status: "cancel",
                    createdAt: tDate,
                    projectTitle: tTitle || cancelledProjectSplits.get(projIdLower)?.title,
                  });
                }
                return; // Skip all other raw rows for cancelled project
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
                });
              }
            });
          }

          // Insert 2 rows for each cancelled project that has records in DB:
          // Row 1: transformed EscrowDeposit row (negative, type="hủy dự án", status="cancel")
          // Row 2: client refund row (positive, type="hủy dự án", status="done")
          cancelledProjIdsInDb.forEach(projIdLower => {
            const split = cancelledProjectSplits.get(projIdLower);
            const report = projectReportMap.get(projIdLower);
            const tDate = report ? report.updatedAt || report.UpdatedAt || report.createdAt : new Date().toISOString();

            // Row 1: Original escrow deposit transformed to cancelled status
            const escrowRow = cancelledEscrowDepositRows.get(projIdLower);
            if (escrowRow) {
              myTransactions.push(escrowRow);
            }

            // Row 2: Client refund (what client gets back)
            myTransactions.push({
              id: `cancel-refund-${projIdLower}`,
              projectId: projIdLower,
              amount: split.clientRefund,
              type: "cancel",   // maps to "hủy dự án"
              status: "done",
              createdAt: tDate,
              projectTitle: split.title,
            });
          });

          // Fallback: also show cancel rows for cancelled projects with NO DB transactions at all
          // (e.g. admin just executed verdict, DB sync not yet happened)
          cancelledProjectSplits.forEach((split, projIdLower) => {
            if (cancelledProjIdsInDb.has(projIdLower)) return; // already handled above
            const report = projectReportMap.get(projIdLower);
            const tDate = report ? report.updatedAt || report.UpdatedAt || report.createdAt : new Date().toISOString();
            const escrowTotal = split.escrowTotal || 0;

            // Row 1: Escrow deposit (simulated negative row showing original amount locked)
            if (escrowTotal > 0) {
              myTransactions.push({
                id: `cancel-escrow-${projIdLower}`,
                projectId: projIdLower,
                amount: -escrowTotal,
                type: "cancel",
                status: "cancel",
                createdAt: tDate,
                projectTitle: split.title,
              });
            }
            // Row 2: Client refund
            if (split.clientRefund > 0) {
              myTransactions.push({
                id: `cancel-refund-local-${projIdLower}`,
                projectId: projIdLower,
                amount: split.clientRefund,
                type: "cancel",
                status: "done",
                createdAt: tDate,
                projectTitle: split.title,
              });
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

          // Helper: parse DB date string correctly as UTC
          const parseDbDate = (str) => {
            if (!str) return 0;
            // DB returns dates without timezone (UTC stored as bare ISO) - check if no Z or +/- at END (not the - in date part)
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
              try { localStorage.setItem(ackKey, "1"); } catch(e) {}
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

          let adjustedEscrowBalance = 0;

          const localDepositedIds = JSON.parse(localStorage.getItem("deposited_project_ids") || "[]");
          const activeProjects = rawProjects
            .filter((p) => {
              const projId = p.id || p.Id;
              const localStatus = localStorage.getItem(`project_status_${projId}`) || p.status;
              const isCompleted = 
                ["completed", "complete", "closed", "resolved", "cancelled", "cancel_done", "stopped"].includes(localStatus?.toLowerCase()?.trim());
              const isReleasedLocally = clientReleases.some(r => String(r.projectId).toLowerCase() === String(projId).toLowerCase());

              const isDeposited = projId ? localDepositedIds.some(id => String(id).toLowerCase() === String(projId).toLowerCase()) : false;

              if (isDeposited && !isCompleted && !isReleasedLocally) {
                const pEscrow = p.escrowBalance || p.escrowAmount || p.budget || p.Budget || 0;
                adjustedEscrowBalance += pEscrow;
              }

              return !isCompleted && !isReleasedLocally && isDeposited;
            })
            .map((p) => ({
              id: p.id,
              title: p.jobPost?.title || p.title || p.jobPostTitle || "Active Project",
              escrowAmount: p.escrowBalance || p.escrowAmount || 0,
            }));



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
        setFeedback({ type: "success", message: "Đang chuyển hướng sang cổng thanh toán ZaloPay..." });
        sessionStorage.setItem("payment_return_url", window.location.pathname + window.location.search);
        setTimeout(() => {
          window.location.href = res.orderUrl;
        }, 1000);
      } else {
        throw new Error("Không lấy được link thanh toán từ ZaloPay.");
      }
    } catch (err) {
      console.error("Wallet deposit via ZaloPay failed:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Tạo đơn hàng nạp tiền thất bại. Vui lòng thử lại sau."
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
      
      setFeedback({ type: "success", message: res?.message || "Rút tiền thành công!" });
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      
      try {
        localStorage.setItem("aitasker_wallet_updated", Date.now().toString());
      } catch (e) {}
      
      const [wallet, transactions] = await Promise.all([
        api.payments.getWallet(resolvedUserId).catch(() => null),
        api.payments.getTransactions(resolvedUserId).catch(() => []),
      ]);

      const myTransactions = Array.isArray(transactions)
        ? transactions.map(t => ({
            id: t.id || t.Id,
            projectId: t.projectId || t.ProjectId,
            amount: t.amount ?? t.Amount,
            type: t.type ?? t.Type,
            createdAt: t.createdAt ?? t.CreatedAt,
            projectTitle: t.projectTitle || t.ProjectTitle || null,
          }))
        : [];

      setData(prev => ({
        ...prev,
        wallet: {
          balance: wallet?.balance ?? (prev.wallet.balance - amount),
          escrowBalance: wallet?.escrowBalance ?? prev.wallet.escrowBalance,
        },
        transactions: myTransactions,
      }));

    } catch (err) {
      console.error("Withdraw failed:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Rút tiền thất bại. Vui lòng thử lại sau."
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
        message: "Không đủ số dư khả dụng trong ví. Vui lòng nạp thêm tiền để thực hiện ký quỹ."
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
      } catch (e) {}

      setFeedback({ type: "success", message: "Ký quỹ thành công! Dự án của bạn hiện đã được Kích Hoạt (Active)." });
      setShowDepositForm(false);
      setDepositAmount(0);
      setSelectedProject("");

      try {
        localStorage.setItem("aitasker_wallet_updated", Date.now().toString());
      } catch (e) {}

      // Notify expert that escrow has been funded and project started
      const proposalId = location.state?.proposalId;
      const expertId = location.state?.expertId;
      const jobTitle = location.state?.projectTitle || "Dự án";
      if (expertId) {
        notifyEscrowFunded({
          expertUserId: expertId,
          clientName: user?.fullName || user?.name || "Khách hàng",
          jobTitle,
          proposalId: proposalId || "",
        }).catch(() => {});
      }

      // Update wallet values directly from backend on navigation
      setTimeout(() => {
        navigate("/client/my-projects");
      }, 2000);

    } catch (err) {
      console.error("Escrow deposit failed:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Ký quỹ không thành công. Vui lòng thử lại sau."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async (transactionId) => {
    try {
      await api.payments.releaseEscrow({ transactionId });
    } catch {
      // Demo — no visual change needed
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/client/dashboard" className="mb-4">Back to Dashboard</BackButton>
      <h1 className="text-2xl font-bold text-foreground mb-2">Billing &amp; Payments</h1>
      <p className="text-muted-foreground mb-8">Manage your wallet, escrow payments, and transaction history.</p>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium ${
            feedback.type === "success"
              ? "bg-success-light text-success border border-success/20"
              : "bg-destructive-light text-destructive border border-destructive/20"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Wallet cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold text-foreground">
                  <MoneyDisplay amount={data?.wallet?.balance ?? 0} />
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDepositModal(true)}
                className="px-3.5 py-2 bg-success text-success-foreground rounded-lg hover:opacity-90 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Nạp tiền
              </button>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(true)}
                className="px-3.5 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> Rút tiền
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Escrow</p>
              <p className="text-2xl font-bold text-foreground">
                <MoneyDisplay amount={data?.wallet?.escrowBalance ?? 0} />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active projects with escrow */}
      {data?.activeProjects?.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm mb-8">
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
        <div className="bg-card rounded-xl border border-border shadow-sm mb-8">
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
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={depositAmount || ""}
                    onChange={(e) => setDepositAmount(e.target.value === "" ? 0 : Number(e.target.value))}
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
                    className="h-11 px-5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
                  >
                    {submitting ? "Processing..." : "Xác nhận ký quỹ"}
                  </button>
                  {!isEscrowRedirect && (
                    <button
                      type="button"
                      onClick={() => setShowDepositForm(false)}
                      className="h-11 px-5 border border-border text-foreground rounded-xl hover:bg-secondary text-sm font-semibold transition-colors"
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
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Transaction History</h2>
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
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.transactions.map((tx) => {
                  const projId = tx.projectId;
                  const localStatus = projId ? (localStorage.getItem(`project_status_${projId}`) || "").toLowerCase() : "";

                  let lowerType = tx.type?.toLowerCase();
                  const isEscrowDeposit = lowerType === "escrow_deposit" || lowerType === "escrowdeposit";

                  let displayStatus = tx.status || "completed";
                  let displayAmount = tx.amount ?? tx.Amount ?? 0;

                  if (isEscrowDeposit) {
                    if (localStatus === "completed" || localStatus === "done") {
                      lowerType = "escrow_release";
                      displayStatus = "done";
                      displayAmount = -Math.abs(displayAmount);
                    } else if (localStatus === "resolved" || localStatus === "disputed") {
                      lowerType = "escrow_refund";
                      displayStatus = "REPORT";
                      displayAmount = Math.abs(displayAmount) * 0.95;
                    } else if (localStatus === "cancelled" || localStatus === "stopped" || localStatus === "cancel_done") {
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
                  }

                  const Icon = typeIcons[lowerType] || typeIcons[tx.type?.toLowerCase()] || Clock;
                  const dateObj = new Date(tx.createdAt);
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

                  // Xử lý description hiển thị theo yêu cầu đại ca
                  let displayDesc = tx.description;
                  if (lowerType === "deposit" || lowerType === "manualdeposit") displayDesc = "nạp tiền";
                  else if (lowerType === "withdrawal") displayDesc = "rút tiền";
                  else if (["escrow_deposit", "escrowdeposit", "escrow_release", "escrowrelease", "releasepayment", "escrow_refund", "escrowrefund", "refund", "dispute", "cancel"].includes(lowerType)) {
                    displayDesc = tx.projectTitle ? `Dự án: ${tx.projectTitle}` : (tx.description || "Dự án: AI-Tasker");
                  }

                  // Tố cáo/bồi thường: nếu ko bồi thường được (amount <= 0) thì hiển thị "-"
                  const isNoCompensation = ["escrow_refund", "escrowrefund", "refund", "dispute", "cancel"].includes(lowerType) &&
                                           displayStatus !== "cancel" &&
                                           Number(displayAmount || 0) <= 0;

                  return (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground font-medium">{typeLabels[lowerType] || tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{displayDesc}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-foreground">
                        {isNoCompensation ? "-" : <MoneyDisplay amount={displayAmount} />}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${badgeClass}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-success" /> Nạp tiền vào ví
            </h3>
            <p className="text-sm text-muted-foreground">
              Nhập số tiền bạn muốn nạp vào ví thông qua cổng thanh toán ZaloPay (tối thiểu 1,000 VND).
            </p>
            <form onSubmit={handleWalletDeposit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2">Số tiền (VND)</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={walletDepositAmount}
                  onChange={(e) => setWalletDepositAmount(e.target.value)}
                  placeholder="Ví dụ: 50000"
                  className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring font-medium"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={depositLoading || !walletDepositAmount || Number(walletDepositAmount) < 1000}
                  className="flex-1 h-11 bg-success text-success-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition-all"
                >
                  {depositLoading ? "Đang xử lý..." : "Nạp tiền qua ZaloPay"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDepositModal(false);
                    setWalletDepositAmount("");
                  }}
                  className="px-5 h-11 border border-border text-foreground rounded-xl hover:bg-secondary text-sm font-semibold transition-all"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200 text-left">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Rút tiền khỏi ví
            </h3>
            <p className="text-sm text-muted-foreground">
              Nhập số tiền muốn rút từ ví khả dụng (Số dư khả dụng hiện tại: <span className="font-semibold text-foreground"><MoneyDisplay amount={data?.wallet?.balance ?? 0} /></span>).
            </p>
            <form onSubmit={handleWalletWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2">Số tiền rút (VND)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  max={data?.wallet?.balance || 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Ví dụ: 20000"
                  className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring font-medium"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={withdrawLoading || !withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > (data?.wallet?.balance || 0)}
                  className="flex-1 h-11 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition-all"
                >
                  {withdrawLoading ? "Đang xử lý..." : "Rút tiền"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount("");
                  }}
                  className="px-5 h-11 border border-border text-foreground rounded-xl hover:bg-secondary text-sm font-semibold transition-all"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
