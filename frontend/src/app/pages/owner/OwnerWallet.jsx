import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Clock,
  ReceiptText,
  Send,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../services/api.js";
import { BackButton } from "../../components/shared/BackButton.jsx";
import { MoneyDisplay } from "../../components/shared/MoneyDisplay.jsx";
import { MoneyInput } from "../../components/shared/MoneyInput.jsx";
import { PageHeader } from "../../components/shared/PageHeader.jsx";
import {
  VisaWithdrawalFields,
  emptyVisaWithdrawalCard,
  isValidVisaWithdrawalCard,
} from "../../components/wallet/VisaWithdrawalFields.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { formatCurrency } from "../../lib/formatCurrency.js";

const transactionSortColumns = [
  { key: "type", label: "Type", align: "left", sortable: false },
  { key: "description", label: "Description", align: "left", sortable: false },
  { key: "amount", label: "Amount", align: "right", sortable: false },
  { key: "status", label: "Status", align: "right", sortable: false },
  { key: "date", label: "Date", align: "right", sortable: true },
];

const typeLabels = {
  deposit: "deposit",
  manualdeposit: "deposit",
  withdrawal: "withdrawal",
  withdraw: "withdrawal",
  escrow_deposit: "escrow deposit",
  escrowdeposit: "escrow deposit",
  escrow_release: "escrow release",
  escrowrelease: "escrow release",
  releasepayment: "escrow release",
  escrow_refund: "refund",
  escrowrefund: "refund",
  refund: "refund",
  dispute: "dispute refund",
  platformfee: "platform fee",
  platform_fee: "platform fee",
  cancel: "cancellation request",
  report_request: "reported request",
  verdict: "reported request",
};

function normalizeStatus(tx) {
  const rawType = String(tx?.type ?? tx?.Type ?? "").toLowerCase();
  const rawStatus = String(tx?.status ?? tx?.Status ?? "").toLowerCase();

  if ((rawType === "escrow_deposit" || rawType === "escrowdeposit") && rawStatus !== "completed") {
    return "in progress";
  }
  if (rawType === "cancel" || rawStatus === "cancel" || rawStatus === "cancelled") {
    return "cancel";
  }
  if (rawStatus === "failed" || rawStatus === "rejected") {
    return "failed";
  }
  if (rawStatus === "pending") {
    return "pending";
  }
  return "done";
}

function getSortValue(tx, key) {
  if (key === "date") {
    const raw = tx?.createdAt || tx?.CreatedAt || "";
    const dateValue = new Date(
      raw + (raw && typeof raw === "string" && !raw.endsWith("Z") && !raw.match(/[+-]\d{2}:\d{2}$/) ? "Z" : ""),
    ).getTime();
    return Number.isFinite(dateValue) ? dateValue : 0;
  }
  return "";
}

function sortTransactions(rows, sortState) {
  if (!sortState.key || !sortState.dir) return rows;

  return [...rows].sort((a, b) => {
    const aValue = getSortValue(a, sortState.key);
    const bValue = getSortValue(b, sortState.key);
    return sortState.dir === "asc" ? aValue - bValue : bValue - aValue;
  });
}

function SignedAmount({ amount }) {
  const value = Number(amount ?? 0);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const tone = value > 0 ? "text-success" : value < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <span className={`font-semibold tabular-nums ${tone}`}>
      {sign}
      {formatCurrency(Math.abs(value))}
    </span>
  );
}

function formatDateTime(tx) {
  const raw = tx?.createdAt || tx?.CreatedAt || "";
  const date = new Date(
    raw + (raw && typeof raw === "string" && !raw.endsWith("Z") && !raw.match(/[+-]\d{2}:\d{2}$/) ? "Z" : ""),
  );

  if (Number.isNaN(date.getTime())) {
    return { dateText: "-", timeText: "" };
  }

  const dateText = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = String(hours % 12 || 12).padStart(2, "0");

  return { dateText, timeText: `${displayHours}:${minutes}:${seconds} ${ampm}` };
}

function getTransactionLabel(tx) {
  const lowerType = String(tx?.type ?? tx?.Type ?? "").toLowerCase();
  return typeLabels[lowerType] || lowerType || "transaction";
}

function getTransactionDescription(tx) {
  const lowerType = String(tx?.type ?? tx?.Type ?? "").toLowerCase();
  const projectTitle = tx?.projectTitle || tx?.ProjectTitle;

  if (projectTitle) return `Project: ${projectTitle}`;
  if (lowerType === "withdrawal" || lowerType === "withdraw") return "withdrawal";
  if (lowerType === "deposit" || lowerType === "manualdeposit") return "Deposit From ZaloPay";
  if (lowerType === "platform_fee" || lowerType === "platformfee") return "system fee";
  return tx?.description || tx?.Description || "Wallet transaction";
}

function getSystemWalletRevenue(systemDashboard, globalTransactions) {
  const directRevenue = Math.abs(
    Number(
      systemDashboard?.totalPlatformRevenue ??
        systemDashboard?.TotalPlatformRevenue ??
        systemDashboard?.statistics?.totalPlatformRevenue ??
        systemDashboard?.Statistics?.TotalPlatformRevenue ??
        systemDashboard?.systemWallet?.balance ??
        systemDashboard?.SystemWallet?.Balance ??
        0,
    ),
  );

  if (directRevenue > 0) return directRevenue;

  const systemHistories = systemDashboard?.transactionHistories || systemDashboard?.TransactionHistories || [];
  const historyRevenue = systemHistories.reduce(
    (sum, item) => sum + Math.abs(Number(item?.fee ?? item?.Fee ?? item?.amount ?? item?.Amount ?? 0)),
    0,
  );

  if (historyRevenue > 0) return historyRevenue;

  return (Array.isArray(globalTransactions) ? globalTransactions : []).reduce((sum, tx) => {
    const lowerType = String(tx?.type || tx?.Type || "").toLowerCase();
    const platformFee = Math.abs(Number(tx?.platformFee || tx?.PlatformFee || 0));
    const isPlatformFee =
      lowerType === "platformfee" ||
      lowerType === "platform_fee" ||
      (platformFee > 0 && lowerType !== "releasepayment" && lowerType !== "escrow_release");

    if (!isPlatformFee) return sum;
    return sum + (platformFee > 0 ? platformFee : Math.abs(Number(tx?.amount || tx?.Amount || 0)));
  }, 0);
}

export function OwnerWallet() {
  const { user } = useAuth();
  const [data, setData] = useState({ wallet: { balance: 0, escrowBalance: 0 }, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawCard, setWithdrawCard] = useState(emptyVisaWithdrawalCard);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [transactionSort, setTransactionSort] = useState({ key: null, dir: null });
  const [transactionStatusFilter, setTransactionStatusFilter] = useState("");

  const ownerId = user?.id || user?.Id;

  const transactionStatusOptions = [
    { value: "", label: "All" },
    { value: "done", label: "Done" },
    { value: "pending", label: "Pending" },
    { value: "in progress", label: "In Progress" },
    { value: "failed", label: "Failed" },
    { value: "cancel", label: "Cancel" },
  ];

  const fetchWalletData = async () => {
    if (!ownerId) {
      setData({ wallet: { balance: 0, escrowBalance: 0 }, transactions: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [systemDashboard, wallet, transactions, globalTransactions] = await Promise.all([
        api.users.systemDashboard().catch(() => null),
        api.users.getWallet(ownerId).catch(() => null),
        api.payments.getTransactions(ownerId).catch(() => []),
        api.payments.getTransactions().catch(() => []),
      ]);
      const systemWalletRevenue = getSystemWalletRevenue(systemDashboard, globalTransactions);
      const systemEscrowHeld = Math.abs(
        Number(
          systemDashboard?.statistics?.totalFundsLockedInEscrow ??
            systemDashboard?.Statistics?.TotalFundsLockedInEscrow ??
            0,
        ),
      );

      setData({
        wallet: {
          balance: systemWalletRevenue || wallet?.balance || 0,
          escrowBalance: systemEscrowHeld || wallet?.escrowBalance || wallet?.pendingBalance || 0,
        },
        transactions: Array.isArray(transactions) ? transactions : [],
      });
    } catch (err) {
      console.error("Failed to fetch owner wallet data:", err);
      setFeedback({ type: "error", message: "Failed to load wallet data. Please try again later." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();

    const handleUpdate = () => fetchWalletData();
    window.addEventListener("aitasker_db_update", handleUpdate);
    return () => window.removeEventListener("aitasker_db_update", handleUpdate);
  }, [ownerId]);

  const sortedTransactions = useMemo(() => {
    const filtered = data.transactions.filter((tx) => {
      if (!transactionStatusFilter) return true;
      return normalizeStatus(tx) === transactionStatusFilter;
    });
    return sortTransactions(filtered, transactionSort);
  }, [data.transactions, transactionSort, transactionStatusFilter]);

  const handleTransactionSort = (key) => {
    if (key !== "date") return;

    setTransactionSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  };

  const handleWithdraw = async (event) => {
    event.preventDefault();
    const amount = Number(withdrawAmount);
    const balance = Number(data?.wallet?.balance || 0);

    if (!amount || amount <= 0 || amount > balance) return;
    if (!isValidVisaWithdrawalCard(withdrawCard)) {
      setFeedback({ type: "error", message: "Please enter valid Visa or Mastercard details before withdrawing." });
      return;
    }

    setWithdrawLoading(true);
    setFeedback(null);
    try {
      const response = await api.payments.withdraw(ownerId, amount, {
        bankCode: withdrawCard.bankCode,
        cardNumber: withdrawCard.cardNumber.replace(/\D/g, ""),
        cardHolderName: withdrawCard.cardHolderName.trim(),
      });
      const message = response?.message || "Withdrawal successful!";
      setFeedback({ type: "success", message });
      toast.success(message);
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawCard(emptyVisaWithdrawalCard);
      localStorage.setItem("aitasker_wallet_updated", Date.now().toString());
      window.dispatchEvent(new Event("aitasker_db_update"));
      fetchWalletData();
    } catch (err) {
      console.error("Owner withdraw failed:", err);
      const message = err?.message || "Withdrawal failed. Please try again later.";
      setFeedback({ type: "error", message });
      toast.error(message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="h-9 w-44 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <BackButton fallback="/owner/dashboard" className="mb-0">
        Back to Dashboard
      </BackButton>

      <PageHeader title="Owner Wallet" subtitle="Review platform wallet balance and withdraw available funds." />

      {feedback && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            feedback.type === "success"
              ? "border-success/20 bg-success-light text-success"
              : "border-destructive/20 bg-destructive-light text-destructive"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-light text-success">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Wallet Balance</p>
                <p className="text-2xl font-semibold text-foreground">
                  <MoneyDisplay amount={data.wallet.balance} />
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowWithdrawModal(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover"
            >
              <Send className="h-4 w-4" />
              Withdraw
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 md:justify-end md:text-right">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning-light text-warning md:order-2">
              <Clock className="h-5 w-5" />
            </div>
            <div className="md:order-1">
              <p className="text-sm font-medium text-muted-foreground">Pending / In Escrow</p>
              <p className="text-2xl font-semibold text-foreground">
                <MoneyDisplay amount={data.wallet.escrowBalance} />
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/60 p-6 sm:flex-row sm:items-center sm:justify-between">
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

        {!data.transactions.length ? (
          <div className="p-12 text-center">
            <ReceiptText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
            <p className="text-muted-foreground">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/50">
                  {transactionSortColumns.map((column) => (
                    <th
                      key={column.key}
                      className={`${column.align === "right" ? "text-right" : "text-left"} px-6 py-2.5 text-sm font-semibold uppercase text-muted-foreground`}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleTransactionSort(column.key)}
                          className={`inline-flex items-center gap-1.5 transition-colors hover:text-foreground ${column.align === "right" ? "ml-auto justify-end" : ""}`}
                          title={transactionSort.key === column.key && transactionSort.dir === "asc" ? "Sort Z-A" : transactionSort.key === column.key && transactionSort.dir === "desc" ? "Clear sort" : "Sort A-Z"}
                        >
                          {column.label}
                          {transactionSort.key === column.key ? (
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
                        <span>{column.label}</span>
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
                ) : (
                  sortedTransactions.map((tx) => {
                    const lowerType = String(tx?.type ?? tx?.Type ?? "").toLowerCase();
                    const displayAmount =
                      lowerType === "withdrawal" || lowerType === "withdraw"
                        ? -Math.abs(Number(tx?.amount ?? tx?.Amount ?? 0))
                        : Number(tx?.amount ?? tx?.Amount ?? 0);
                    const displayStatus = normalizeStatus(tx);
                    const { dateText, timeText } = formatDateTime(tx);
                    const badgeClass =
                      displayStatus === "in progress" || displayStatus === "pending"
                        ? "border-warning/20 bg-warning/10 text-warning"
                        : displayStatus === "failed"
                          ? "border-destructive/20 bg-destructive/10 text-destructive"
                          : displayStatus === "cancel"
                            ? "border-border bg-secondary text-muted-foreground"
                            : "border-success/20 bg-success/10 text-success";

                    return (
                      <tr key={tx?.id || tx?.Id || `${dateText}-${displayAmount}`} className="hover:bg-secondary/50">
                        <td className="px-6 py-4 text-sm font-medium uppercase text-foreground">
                          {getTransactionLabel(tx)}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {getTransactionDescription(tx)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <SignedAmount amount={displayAmount} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase ${badgeClass}`}>
                            {displayStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold leading-none text-foreground">{dateText}</span>
                            <span className="-mt-px text-[11px] font-medium leading-none tracking-wide text-muted-foreground">{timeText}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showWithdrawModal && (
        <div data-modal-overlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 text-left shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Send className="h-5 w-5 text-primary" />
              Withdraw funds
            </h3>
            <p className="text-sm text-muted-foreground">
              Enter the amount you wish to withdraw from your available balance. Current balance:{" "}
              <span className="font-semibold text-foreground">
                <MoneyDisplay amount={data.wallet.balance} />
              </span>
              .
            </p>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-muted-foreground">Withdrawal Amount (VND)</label>
                <MoneyInput
                  min="1"
                  max={data.wallet.balance || 0}
                  value={withdrawAmount}
                  onValueChange={setWithdrawAmount}
                  placeholder="e.g. 20000"
                  className="w-full rounded-lg border border-input bg-card px-4 py-2 font-medium text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
                  required
                />
              </div>
              <VisaWithdrawalFields
                amount={withdrawAmount}
                balance={data.wallet.balance || 0}
                card={withdrawCard}
                onChange={setWithdrawCard}
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={
                    withdrawLoading ||
                    !withdrawAmount ||
                    Number(withdrawAmount) <= 0 ||
                    Number(withdrawAmount) > Number(data.wallet.balance || 0) ||
                    !isValidVisaWithdrawalCard(withdrawCard)
                  }
                  className="h-10 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="h-10 rounded-xl border border-border px-5 text-sm font-semibold text-foreground transition-all hover:bg-secondary"
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

export default OwnerWallet;
