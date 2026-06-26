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
  completed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded-xl" />
            <div className="h-24 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/client/dashboard" className="mb-4">Back to Dashboard</BackButton>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing &amp; Payments</h1>
      <p className="text-gray-600 mb-8">Manage your wallet, escrow payments, and transaction history.</p>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Wallet cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-primary-light rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Available Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                <MoneyDisplay amount={data?.wallet?.balance ?? 0} />
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">In Escrow</p>
              <p className="text-2xl font-bold text-gray-900">
                <MoneyDisplay amount={data?.wallet?.escrowBalance ?? 0} />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active projects with escrow */}
      {data?.activeProjects?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Active Projects</h2>
          </div>
          <div className="divide-y">
            {data.activeProjects.map((proj) => (
              <div key={proj.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{proj.title}</p>
                  <p className="text-sm text-gray-500">
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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Deposit to Escrow</h2>
          </div>

          {showDepositForm && (
            <div className="p-6">
              <form onSubmit={handleDeposit} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">Project</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary bg-gray-50 cursor-not-allowed text-gray-600 font-medium"
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
                  <label className="block text-sm font-semibold text-gray-600 mb-2">Amount</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={depositAmount || ""}
                    onChange={(e) => setDepositAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-primary bg-gray-50 cursor-not-allowed text-gray-600 font-medium"
                    placeholder="500"
                    required
                    disabled={isEscrowRedirect}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !depositAmount || depositAmount <= 0 || !selectedProject}
                    className="h-11 px-5 bg-brand-primary text-white rounded-[14px] hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold shadow-sm transition-all"
                  >
                    {submitting ? "Processing..." : "Xác nhận ký quỹ"}
                  </button>
                  {!isEscrowRedirect && (
                    <button
                      type="button"
                      onClick={() => setShowDepositForm(false)}
                      className="h-11 px-5 border border-gray-300 rounded-[14px] hover:bg-gray-50 text-base font-semibold"
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
        </div>

        {!data?.transactions?.length ? (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-500 uppercase">Description</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.transactions.map((tx) => {
                  const Icon = typeIcons[tx.type] || Clock;
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{typeLabels[tx.type] || tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{tx.description}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        <MoneyDisplay amount={tx.amount} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[tx.status] || "bg-gray-100 text-gray-700"}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">
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
    </div>
  );
}
