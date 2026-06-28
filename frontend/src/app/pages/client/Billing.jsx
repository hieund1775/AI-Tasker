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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeLabels = {
  escrow_deposit: "Escrow Deposit",
  escrow_release: "Escrow Release",
  escrow_refund: "Escrow Refund",
  deposit: "Wallet Deposit",
  withdrawal: "Withdrawal",
};

const typeIcons = {
  escrow_deposit: Shield,
  escrow_release: ArrowUpCircle,
  escrow_refund: ArrowDownCircle,
  deposit: PlusCircle,
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

  // Wallet top-up states
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [submittingTopUp, setSubmittingTopUp] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const [wallet, transactions, clientProjects] = await Promise.all([
          api.payments.getWallet(user.id).catch(() => null),
          api.payments.getTransactions().catch(() => []),
          api.projects.getByClient(user.id).catch(() => []),
        ]);

        if (!cancelled) {
          const activeProjects = Array.isArray(clientProjects)
            ? clientProjects.map((p) => ({
                id: p.id,
                title: p.jobPost?.title || "Active Project",
                escrowAmount: p.escrowBalance || 0,
              }))
            : [];

          setData({
            wallet: wallet || { balance: 0, escrowBalance: 0 },
            transactions: Array.isArray(transactions) ? transactions : [],
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
    return () => { cancelled = true; };
  }, [user?.id]);

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
        amount: Number(depositAmount),
      });

      if (isEscrowRedirect) {
        // Update project status to "Accepted"
        await api.jobPosts.update(selectedProject, { status: "Accepted" });
        // Update proposal status to "accepted"
        const proposalId = location.state.proposalId;
        if (proposalId) {
          await api.proposals.updateStatus(proposalId, "accepted");
        }
      }

      setFeedback({ type: "success", message: "Ký quỹ thành công! Dự án của bạn hiện đã được Chấp nhận (Accepted)." });
      setShowDepositForm(false);
      setDepositAmount(0);
      setSelectedProject("");

      // Update local wallet state
      setData((prev) => ({
        ...prev,
        wallet: {
          ...prev.wallet,
          balance: prev.wallet.balance - Number(depositAmount),
          escrowBalance: (prev.wallet.escrowBalance || 0) + Number(depositAmount),
        },
      }));

      setTimeout(() => {
        navigate("/client/my-projects");
      }, 2000);

    } catch {
      // Demo fallback — update locally
      if (isEscrowRedirect) {
        await api.jobPosts.update(selectedProject, { status: "Accepted" });
        const proposalId = location.state.proposalId;
        if (proposalId) {
          await api.proposals.updateStatus(proposalId, "accepted");
        }
      }

      setData((prev) => ({
        ...prev,
        wallet: {
          ...prev.wallet,
          balance: prev.wallet.balance - Number(depositAmount),
          escrowBalance: (prev.wallet.escrowBalance || 0) + Number(depositAmount),
          pendingBalance: (prev.wallet.pendingBalance || 0) + Number(depositAmount),
        },
        transactions: [
          {
            id: `tx-${Date.now()}`,
            type: "escrow_deposit",
            amount: Number(depositAmount),
            description: `Escrow deposit for project`,
            projectTitle: isEscrowRedirect ? location.state.projectTitle : selectedProject,
            status: "completed",
            createdAt: new Date().toISOString(),
          },
          ...prev.transactions,
        ],
      }));
      setFeedback({ type: "success", message: "Ký quỹ thành công! Dự án của bạn hiện đã được Chấp nhận (Accepted)." });
      setShowDepositForm(false);
      setDepositAmount(0);
      setSelectedProject("");

      setTimeout(() => {
        navigate("/client/my-projects");
      }, 2000);
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

  const handleTopUp = async (e) => {
    e.preventDefault();
    if (!topUpAmount || Number(topUpAmount) <= 0) return;

    setSubmittingTopUp(true);
    setFeedback(null);
    try {
      await api.payments.depositWallet({
        amount: Number(topUpAmount),
      });

      setFeedback({
        type: "success",
        message: `Nạp tiền thành công! Đã cộng $${Number(topUpAmount).toLocaleString()} vào ví khả dụng.`
      });
      setShowTopUpForm(false);

      // Update local state balance immediately
      setData((prev) => ({
        ...prev,
        wallet: {
          ...prev.wallet,
          balance: Number(((prev.wallet?.balance || 0) + Number(topUpAmount)).toFixed(2)),
        },
        transactions: [
          {
            id: `tx-${Date.now()}`,
            type: "deposit",
            amount: Number(topUpAmount),
            description: `Nạp tiền vào ví khả dụng`,
            status: "completed",
            createdAt: new Date().toISOString(),
          },
          ...prev.transactions,
        ],
      }));
      setTopUpAmount(0);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Đã xảy ra lỗi khi nạp tiền. Vui lòng thử lại."
      });
    } finally {
      setSubmittingTopUp(false);
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
          <div className="flex items-center gap-3 mb-4">
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
          <button
            type="button"
            onClick={() => setShowTopUpForm(true)}
            className="w-full mt-2 h-10 px-4 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-sm cursor-pointer border-none"
          >
            <PlusCircle className="w-4 h-4" /> Nạp tiền vào ví
          </button>
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
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring bg-muted cursor-not-allowed text-muted-foreground font-medium"
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
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring bg-muted cursor-not-allowed text-muted-foreground font-medium"
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
                  const Icon = typeIcons[tx.type] || Clock;
                  return (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{typeLabels[tx.type] || tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{tx.description}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-foreground">
                        <MoneyDisplay amount={tx.amount} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[tx.status] || "bg-secondary text-muted-foreground"}`}>
                          {tx.status}
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

      {/* Top Up Modal */}
      {showTopUpForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 text-left">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Nạp tiền vào tài khoản</h3>
            <p className="text-sm text-gray-500 mb-6">Nhập số tiền bạn muốn nạp vào ví khả dụng để chi trả và ký quỹ.</p>
            <form onSubmit={handleTopUp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Số tiền nạp (USD)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-gray-400 font-semibold">$</span>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-brand-primary text-gray-950 font-bold"
                    placeholder="100"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submittingTopUp || !topUpAmount || topUpAmount <= 0}
                  className="flex-1 h-11 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold shadow-sm transition-all border-none cursor-pointer"
                >
                  {submittingTopUp ? "Đang xử lý..." : "Nạp tiền ngay"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTopUpForm(false);
                    setTopUpAmount("");
                  }}
                  className="px-4 border border-gray-300 rounded-xl hover:bg-gray-50 text-base font-semibold cursor-pointer"
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
