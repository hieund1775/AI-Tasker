import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { DataTable } from "../../components/shared/DataTable.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import api from "../../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";

const DEFAULT_DATA = {
  summary: {
    totalRevenue: 0,
    projectedRevenue: 0,
    escrowHeld: 0,
  },
  transactions: [],
};

const parseDateAndTime = (str) => {
  if (!str) return null;
  const hasTimezone = /[Z]$|[+-]\d{2}:\d{2}$/.test(str);
  const date = new Date(hasTimezone ? str : str + "Z");
  if (isNaN(date.getTime())) return null;

  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");

  return {
    dateStr: `${d}/${m}/${y}`,
    timeStr: `${hh}:${mm}:${ss}`
  };
};

export function AdminRevenue() {
  const { user } = useAuth();
  const role = (user?.role || user?.Role || "").toLowerCase();
  const isOwnerOrAdmin = role === "owner" || role === "admin";

  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRevenue() {
      try {
        const [dashboardRes, transactionsRes, usersRes] = await Promise.all([
          isOwnerOrAdmin ? api.users.systemDashboard().catch(() => null) : Promise.resolve(null),
          api.payments.getTransactions().catch(() => []),
          api.users.list().catch(() => []),
        ]);

        const transactions = Array.isArray(transactionsRes) ? transactionsRes : [];
        const users = Array.isArray(usersRes) ? usersRes : (usersRes?.data || usersRes?.value || []);

        // Build User Map
        const userMap = new Map();
        users.forEach(u => {
          const uId = String(u.id || u.Id).toLowerCase();
          const name = u.fullName || u.FullName || u.userName || u.Username || "User";
          userMap.set(uId, name);
        });

        // Fetch projects to build Project Map
        const projectPromises = [];
        users.forEach(u => {
          const uId = u.id || u.Id;
          if (uId) {
            projectPromises.push(api.users.getClientProjects(uId).catch(() => []));
            projectPromises.push(api.users.getExpertProjects(uId).catch(() => []));
          }
        });

        const projectsResults = await Promise.all(projectPromises);
        const projects = [];
        const seenIds = new Set();
        projectsResults.forEach(list => {
          if (Array.isArray(list)) {
            list.forEach(p => {
              const pId = String(p.id || p.Id).toLowerCase();
              if (!seenIds.has(pId)) {
                seenIds.add(pId);
                projects.push(p);
              }
            });
          }
        });

        const projectMap = new Map();
        projects.forEach(p => {
          const projId = String(p.id || p.Id).toLowerCase();
          const clientName = p.client?.fullName || p.client?.FullName || p.clientName || p.client || "";
          const expertName = p.expert?.fullName || p.expert?.FullName || p.expertName || p.expert || "";
          const title = p.title || p.jobPost?.title || p.jobPostTitle || "Project";
          const budget = p.budget ?? p.Budget ?? p.escrowBalance ?? p.escrowAmount ?? 0;
          projectMap.set(projId, { clientName, expertName, title, budget });
        });

        // 1. Escrow Held calculation (Quỹ ký quỹ của các dự án đang chạy)
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
            const dbStatus = (p.status || p.Status || "").toLowerCase().trim();
            const isTerminal = ["completed", "complete", "closed", "resolved", "cancelled", "cancel_done", "stopped"].includes(dbStatus);

            if (isTerminal) {
              try { localStorage.removeItem(`project_status_${projId}`); } catch (e) { }
            }

            const localStatus = localStorage.getItem(`project_status_${projId}`);
            const status = (localStatus || p.status || p.Status || "").toLowerCase().replace(/_/g, "").trim();
            const isReleasedLocally = localReleases.some(r => String(r.projectId).toLowerCase() === String(projId).toLowerCase());

            if (status === "inprogress" && !isReleasedLocally) {
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

        // 2. Read System Wallet Total Revenue directly from SystemWallets / SystemDashboard
        const systemWalletRevenue = Math.abs(
          Number(dashboardRes?.totalPlatformRevenue ?? dashboardRes?.TotalPlatformRevenue ?? 0)
        );

        // 3. Projected 5% Fee Revenue from Active Projects (Dự kiến thu nhập 5% từ các dự án đang chạy)
        const projectedRevenue = escrowHeld * 0.05;

        // 4. Build System Transaction Log List from SystemTransactionLogs (SystemWallets)
        const systemHistories = dashboardRes?.transactionHistories || dashboardRes?.TransactionHistories || [];
        const myTransactions = [];
        const seenTxIds = new Set();

        systemHistories.forEach(item => {
          const txId = item.id || item.Id;
          if (txId) seenTxIds.add(String(txId).toLowerCase());

          const projIdStr = item.projectId || item.ProjectId;
          const projDetails = projIdStr ? projectMap.get(String(projIdStr).toLowerCase()) : null;

          const feeAmount = Math.abs(Number(item.fee ?? item.Fee ?? item.amount ?? item.Amount ?? 0));
          const rawType = item.type || item.Type || "System Platform Fee";
          const displayType = rawType === "PlatformFee" ? "System Platform Fee" : rawType;

          myTransactions.push({
            id: txId || crypto.randomUUID(),
            type: displayType,
            client: projDetails?.clientName || "System",
            expert: projDetails?.expertName || "System",
            project: projDetails?.title || item.description || "Project",
            amount: feeAmount,
            rawDate: item.createdAt || item.CreatedAt,
          });
        });

        // Supplement with PlatformFee entries from TransactionLogs if not in SystemTransactionLogs
        transactions.forEach(t => {
          const lType = (t.type || t.Type || "").toLowerCase();
          const tPlatformFee = Math.abs(Number(t.platformFee || t.PlatformFee || 0));

          if (lType === "platformfee" || lType === "platform_fee" || (tPlatformFee > 0 && lType !== "releasepayment" && lType !== "escrow_release")) {
            const txId = String(t.id || t.Id).toLowerCase();
            if (!seenTxIds.has(txId)) {
              seenTxIds.add(txId);

              const projIdStr = t.projectId || t.ProjectId;
              const projDetails = projIdStr ? projectMap.get(String(projIdStr).toLowerCase()) : null;
              const dbSourceVal = t.sourceWalletId || t.SourceWalletId;
              const dbDestVal = t.destinationWalletId || t.DestinationWalletId;

              const clientName = projDetails?.clientName || (dbSourceVal ? userMap.get(String(dbSourceVal).toLowerCase()) : "") || "-";
              const expertName = projDetails?.expertName || (dbDestVal ? userMap.get(String(dbDestVal).toLowerCase()) : "") || "-";
              const projectTitle = projDetails?.title || t.projectTitle || t.ProjectTitle || "Project";
              const feeAmount = tPlatformFee > 0 ? tPlatformFee : Math.abs(Number(t.amount || t.Amount || 0));

              myTransactions.push({
                id: t.id || t.Id,
                type: "System Platform Fee",
                client: clientName,
                expert: expertName,
                project: projectTitle,
                amount: feeAmount,
                rawDate: t.createdAt || t.CreatedAt,
              });
            }
          }
        });

        let totalRevenue = systemWalletRevenue;
        if (totalRevenue === 0 && myTransactions.length > 0) {
          totalRevenue = myTransactions.reduce((acc, curr) => acc + Math.abs(Number(curr.amount || 0)), 0);
        }

        setData({
          summary: {
            totalRevenue,
            projectedRevenue,
            escrowHeld,
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
        { value: "System Platform Fee", label: "System Platform Fee" },
        { value: "Penalty & Fee", label: "Penalty & Fee" },
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
      label: "System Revenue Amount",
      className: "text-right font-semibold text-success",
      sortable: true,
      render: (val) => (
        <span className="text-success font-semibold">
          +<MoneyDisplay amount={Math.abs(val)} />
        </span>
      ),
    },
    {
      key: "date",
      label: "Date & Time",
      className: "text-right whitespace-nowrap",
      render: (_, row) => {
        const parsed = parseDateAndTime(row.rawDate);
        if (!parsed) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-col items-end">
            <span className="font-medium text-foreground">{parsed.dateStr}</span>
            <span className="text-xs text-muted-foreground">{parsed.timeStr}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Revenue &amp; Transactions</h1>
      <p className="text-muted-foreground mb-8">Platform system wallet revenue summary and transaction audit log.</p>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Total Realized Revenue (SystemWallet)",
            value: <MoneyDisplay amount={Math.abs(s.totalRevenue)} />,
            icon: TrendingUp,
            color: "text-success bg-success-light",
            desc: "Realized revenue credited to system wallet",
          },
          {
            label: "Projected Revenue (5% Fee)",
            value: <MoneyDisplay amount={Math.abs(s.projectedRevenue)} />,
            icon: BarChart3,
            color: "text-brand-primary bg-brand-primary-light",
            desc: "Projected 5% platform fee from active projects",
          },
          {
            label: "In Escrow (Active Projects)",
            value: <MoneyDisplay amount={Math.abs(s.escrowHeld)} />,
            icon: DollarSign,
            color: "text-warning bg-warning-light",
            desc: "Total escrow funds locked in active projects",
          },
        ].map((card, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className="text-xl font-semibold text-foreground mt-0.5">{card.value}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Transaction log */}
      <div className="bg-card rounded-2xl border border-border shadow-sm">
        <div className="p-6 border-b border-border/60">
          <h2 className="text-lg font-semibold text-foreground">System Wallet Revenue Transaction Log</h2>
        </div>
        <DataTable
          columns={columns}
          data={data.transactions}
          loading={loading}
          emptyMessage="No system revenue transactions found."
          pageSize={10}
        />
      </div>
    </div>
  );
}
