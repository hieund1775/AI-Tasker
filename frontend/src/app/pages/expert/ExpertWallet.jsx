import { useState, useEffect } from "react";
import {
  Wallet,
  TrendingUp,
  Clock,
  ReceiptText,
} from "lucide-react";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { api } from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveExpertId(user) {
  // TODO: Replace with API call — api.users.getProfile()
  return user?.id || null;
}

function getExpertWalletData() {
  // TODO: Replace with API call — api.payments.getWallet()
  return {
    wallet: { balance: 0, pendingBalance: 0, totalEarned: 0 },
    transactions: [],
  };
}

const statusColors = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExpertWallet() {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeProjects, setActiveProjects] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const currentUserId = user?.id;

        if (!currentUserId) {
          // No user ID available — show empty state
          if (!cancelled) {
            setData({ wallet: { balance: 0, pendingBalance: 0, totalEarned: 0 }, transactions: [] });
            setActiveProjects([]);
          }
          return;
        }

        const [wallet, transactions, projects] = await Promise.all([
          api.users.getWallet(currentUserId).catch(() => null),
          api.payments.getTransactions().catch(() => []),
          api.projects.getByExpert(currentUserId).catch(() => []),
        ]);

        if (!cancelled) {
          const expertProjects = Array.isArray(projects) ? projects : [];
          const activeProj = expertProjects.filter(
            (p) => p.status?.toLowerCase() === "in_progress" || p.status?.toLowerCase() === "active"
          );
          
          const sumEscrow = activeProj.reduce((acc, p) => acc + (p.escrowAmount || p.budget || 0), 0);

          setActiveProjects(
            activeProj.map((p) => ({
              id: p.id,
              title: p.title || "Active Project",
              escrowAmount: p.escrowAmount || p.budget || 0,
            }))
          );

          setData({
            wallet: {
              balance: wallet?.balance ?? 0,
              pendingBalance: sumEscrow,
              totalEarned: wallet?.totalEarned ?? (wallet?.balance ?? 0),
            },
            transactions: Array.isArray(transactions) ? transactions.filter(t => t.toUserId === currentUserId || t.expertId === currentUserId) : [],
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
    return () => {
      cancelled = true;
    };
  }, [user?.id]);


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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BackButton fallback="/expert/dashboard" className="mb-4">
        Back to Dashboard
      </BackButton>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">My Wallet</h1>
          <p className="text-muted-foreground mb-8">
            Manage your earnings and withdrawals.
          </p>
        </div>
      </div>


      {/* Wallet stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-foreground">
                <MoneyDisplay amount={data?.wallet?.balance ?? 0} />
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending / In Escrow</p>
              <p className="text-2xl font-bold text-foreground">
                <MoneyDisplay amount={data?.wallet?.pendingBalance ?? 0} />
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-2xl font-bold text-foreground">
                <MoneyDisplay amount={data?.wallet?.totalEarned ?? 0} />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active projects with escrow */}
      {activeProjects.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm mb-8">
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
        <div className="p-6 border-b border-border/60">
          <h2 className="text-lg font-semibold text-foreground">
            Transaction History
          </h2>
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
                  <th className="text-left px-6 py-3 text-sm font-semibold text-muted-foreground uppercase">
                    Description
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-muted-foreground uppercase">
                    Amount
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-muted-foreground uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.transactions.map((tx) => {
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

                  return (
                    <tr key={tx.id} className="hover:bg-secondary/50">
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground">{tx.description}</p>
                        {tx.projectTitle && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {tx.projectTitle}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-foreground">
                        <MoneyDisplay amount={tx.amount} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[tx.status] || "bg-secondary text-foreground/80"}`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-foreground text-sm">{dateStr}</span>
                          <span className="text-xs text-muted-foreground mt-0.5 font-normal">{timeStr}</span>
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
    </div>
  );
}
