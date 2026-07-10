import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, BarChart3, ArrowUpRight } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import api from "../../../services/api.js";

const typeLabels = {
  escrow_deposit: "Escrow Deposit",
  escrow_release: "Escrow Release",
  withdrawal: "Withdrawal",
};

// ---------------------------------------------------------------------------
// Default data — renders immediately; API data replaces it when available.
// ---------------------------------------------------------------------------

const DEFAULT_DATA = {
  summary: {
    totalRevenue: 0,
    thisMonth: 0,
    lastMonth: 0,
    escrowHeld: 0,
    paidToExperts: 0,
  },
  transactions: [],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AdminRevenue() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRevenue() {
      try {
        const [dashboardRes, projectsRes, transactionsRes, usersRes] = await Promise.all([
          api.users.systemDashboard().catch(() => null),
          api.projects.list().catch(() => []),
          api.payments.getTransactions().catch(() => []),
          api.users.list().catch(() => []),
        ]);

        const projects = Array.isArray(projectsRes) ? projectsRes : [];
        const transactions = Array.isArray(transactionsRes) ? transactionsRes : [];
        const users = Array.isArray(usersRes) ? usersRes : (usersRes?.data || usersRes?.value || []);

        // Build User Map (to resolve IDs to user names)
        const userMap = new Map();
        users.forEach(u => {
          const uId = String(u.id || u.Id).toLowerCase();
          const name = u.fullName || u.FullName || u.userName || u.Username || "User";
          userMap.set(uId, name);
        });

        // Build Project Map
        const projectMap = new Map();
        projects.forEach(p => {
          const projId = String(p.id || p.Id).toLowerCase();
          const clientName = p.client?.fullName || p.client?.FullName || p.clientName || p.client || "";
          const expertName = p.expert?.fullName || p.expert?.FullName || p.expertName || p.expert || "";
          const title = p.title || p.jobPost?.title || p.jobPostTitle || "Project";
          projectMap.set(projId, { clientName, expertName, title });
        });

        // 1. Calculate Escrow dynamically from active projects
        const localReleases = JSON.parse(localStorage.getItem("escrow_releases") || "[]");
        const transactionProjectIds = new Set(
          transactions
            .filter(t => t.projectId || t.ProjectId)
            .map(t => String(t.projectId || t.ProjectId).toLowerCase())
        );

        const dbEscrowFunds = Number(dashboardRes?.statistics?.totalFundsLockedInEscrow || dashboardRes?.Statistics?.TotalFundsLockedInEscrow || 0);
        let escrowHeld = 0;
        if (projects.length > 0) {
          projects.forEach(p => {
            const projId = p.id || p.Id;
            const localStatus = localStorage.getItem(`project_status_${projId}`);
            const status = (localStatus || p.status || p.Status || "").toLowerCase();
            const isCompleted = ["completed", "complete", "closed", "resolved", "cancelled", "cancel_done"].includes(status);
            const isReleasedLocally = localReleases.some(r => String(r.projectId).toLowerCase() === String(projId).toLowerCase());

            if (!isCompleted && !isReleasedLocally) {
              const budget = p.escrowBalance ?? p.escrowAmount ?? p.budget ?? p.Budget ?? 0;
              escrowHeld += Number(budget);
            }
          });
        } else {
          escrowHeld = dbEscrowFunds;
          localReleases.forEach(r => {
            const releaseProjIdLower = String(r.projectId).toLowerCase();
            const hasDbTx = transactionProjectIds.has(releaseProjIdLower);
            if (!hasDbTx) {
              escrowHeld = Math.max(0, escrowHeld - Number(r.amount));
            }
          });
        }

        // 2. Calculate platform revenue (Total Revenue)
        let totalRevenue = 0;
        transactions.forEach(t => {
          const lType = t.type?.toLowerCase() || t.Type?.toLowerCase();
          let fee = 0;
          if (lType === "releasepayment" || lType === "escrow_release" || lType === "escrowrelease") {
            fee = Number(t.amount || t.Amount || 0) * 5 / 95;
          } else if (lType === "platformfee") {
            fee = Math.abs(Number(t.amount || t.Amount || 0));
          }
          totalRevenue += fee;
        });

        localReleases.forEach(r => {
          const releaseProjIdLower = String(r.projectId).toLowerCase();
          const hasDbTx = transactionProjectIds.has(releaseProjIdLower);
          if (!hasDbTx) {
            totalRevenue += Number(r.amount) * 0.05;
          }
        });

        // 3. Calculate monthly platform revenue and trend
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const parseDbDate = (str) => {
          if (!str) return 0;
          const hasTimezone = /[Z]$|[+-]\d{2}:\d{2}$/.test(str);
          return new Date(hasTimezone ? str : str + "Z");
        };

        let thisMonthRevenue = 0;
        let lastMonthRevenue = 0;

        transactions.forEach(t => {
          const lType = t.type?.toLowerCase() || t.Type?.toLowerCase();
          let fee = 0;
          if (lType === "releasepayment" || lType === "escrow_release" || lType === "escrowrelease") {
            fee = Number(t.amount || t.Amount || 0) * 5 / 95;
          } else if (lType === "platformfee") {
            fee = Math.abs(Number(t.amount || t.Amount || 0));
          }

          if (fee > 0) {
            const date = parseDbDate(t.createdAt || t.CreatedAt);
            if (date >= startOfThisMonth) {
              thisMonthRevenue += fee;
            } else if (date >= startOfLastMonth && date < startOfThisMonth) {
              lastMonthRevenue += fee;
            }
          }
        });

        localReleases.forEach(r => {
          const releaseProjIdLower = String(r.projectId).toLowerCase();
          const hasDbTx = transactionProjectIds.has(releaseProjIdLower);
          if (!hasDbTx) {
            const date = r.createdAt ? new Date(r.createdAt) : new Date();
            const fee = Number(r.amount) * 0.05;
            if (date >= startOfThisMonth) {
              thisMonthRevenue += fee;
            } else if (date >= startOfLastMonth && date < startOfThisMonth) {
              lastMonthRevenue += fee;
            }
          }
        });

        let trend = "+0%";
        if (lastMonthRevenue > 0) {
          const diff = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
          trend = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
        } else if (thisMonthRevenue > 0) {
          trend = "+100%";
        }

        // 4. Map transactions
        const myTransactions = transactions
          .filter(t => {
            const lType = (t.type || t.Type || "").toLowerCase();
            return (
              lType === "releasepayment" ||
              lType === "escrow_release" ||
              lType === "escrowrelease" ||
              lType === "platformfee" ||
              lType === "platform_fee"
            );
          })
          .map(t => {
            const lType = (t.type || t.Type || "").toLowerCase();
            const projIdStr = t.projectId || t.ProjectId;
            const projDetails = projIdStr ? projectMap.get(String(projIdStr).toLowerCase()) : null;

            const dbSourceVal = t.sourceWalletId || t.SourceWalletId;
            const dbDestVal = t.destinationWalletId || t.DestinationWalletId;

            const clientName = projDetails?.clientName || (dbSourceVal ? userMap.get(String(dbSourceVal).toLowerCase()) : "") || "";
            const expertName = projDetails?.expertName || (dbDestVal ? userMap.get(String(dbDestVal).toLowerCase()) : "") || "";
            const projectTitle = projDetails?.title || t.projectTitle || t.ProjectTitle || "Project";

            let typeLabel = t.type || t.Type || "";
            let displayAmount = t.amount ?? t.Amount ?? 0;

            if (lType === "releasepayment" || lType === "escrow_release" || lType === "escrowrelease") {
              typeLabel = "Escrow Release Fee";
              displayAmount = displayAmount * 5 / 95;
            } else if (lType === "platformfee") {
              typeLabel = "System Platform Fee";
              displayAmount = Math.abs(displayAmount);
            }

            return {
              id: t.id || t.Id,
              type: typeLabel,
              client: clientName,
              expert: expertName,
              project: projectTitle,
              amount: displayAmount,
              date: t.createdAt || t.CreatedAt ? parseDbDate(t.createdAt || t.CreatedAt).toLocaleDateString("vi-VN") : "",
            };
          });

        // Add local releases as mock transactions
        localReleases.forEach(r => {
          const releaseProjIdLower = String(r.projectId).toLowerCase();
          const hasDbTx = transactionProjectIds.has(releaseProjIdLower);
          if (!hasDbTx) {
            const projDetails = projectMap.get(releaseProjIdLower);
            const clientName = projDetails?.clientName || userMap.get(String(r.clientId).toLowerCase()) || "Client";
            const expertName = projDetails?.expertName || userMap.get(String(r.expertId).toLowerCase()) || "Expert";
            const projectTitle = projDetails?.title || r.projectTitle || "AI-Tasker Project";

            myTransactions.unshift({
              id: r.id || crypto.randomUUID(),
              type: "Escrow Release Fee",
              client: clientName,
              expert: expertName,
              project: projectTitle,
              amount: r.amount * 0.05,
              date: r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN"),
            });
          }
        });

        setData({
          summary: {
            totalRevenue,
            thisMonth: thisMonthRevenue,
            escrowHeld,
            trend,
          },
          transactions: myTransactions,
        });
        setLoading(false);
      } catch (err) {
        console.error("Failed to load admin revenue dashboard:", err);
        setData(DEFAULT_DATA);
        setLoading(false);
      }
    }
    fetchRevenue();
  }, []);

  const s = data.summary;

  const columns = [
    {
      key: "type",
      label: "Type",
      filterOptions: [
        { value: "Escrow Release Fee", label: "Escrow Release Fee" },
        { value: "System Platform Fee", label: "System Platform Fee" },
      ],
      render: (val) => val,
    },
    {
      key: "client",
      label: "Client",
    },
    {
      key: "expert",
      label: "Expert",
    },
    {
      key: "project",
      label: "Project",
    },
    {
      key: "amount",
      label: "Amount",
      className: "text-right",
      render: (val) => <MoneyDisplay amount={val} />,
    },
    {
      key: "date",
      label: "Date",
      className: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      
      <h1 className="text-2xl font-bold text-foreground mb-2">Revenue &amp; Transactions</h1>
      <p className="text-muted-foreground mb-8">Platform revenue summary and transaction audit log.</p>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Revenue", value: <MoneyDisplay amount={s.totalRevenue} />, icon: TrendingUp, color: "text-green-600 bg-green-100" },
          { label: "This Month", value: <MoneyDisplay amount={s.thisMonth} />, icon: BarChart3, color: "text-brand-primary bg-brand-primary-light", trend: s.trend },
          { label: "In Escrow", value: <MoneyDisplay amount={s.escrowHeld} />, icon: DollarSign, color: "text-purple-600 bg-purple-100" },
        ].map((card, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                <card.icon className="w-5 h-5" />
              </div>
              {card.trend && (
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  {card.trend}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Transaction log */}
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="p-6 border-b border-border/60">
          <h2 className="text-lg font-semibold text-foreground">Transaction Log</h2>
        </div>
        <DataTable
          columns={columns}
          data={data.transactions}
          loading={loading}
          emptyMessage="No transactions found."
          pageSize={10}
        />
      </div>
    </div>
  );
}
