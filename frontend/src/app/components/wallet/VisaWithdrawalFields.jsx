import { CreditCard } from "lucide-react";

export const emptyVisaWithdrawalCard = {
  bankCode: "VISA (ZaloPay)",
  cardHolderName: "",
  cardNumber: "",
};

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCardNumber(value) {
  return onlyDigits(value).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

export function isValidVisaWithdrawalCard(card) {
  const cardNumber = onlyDigits(card?.cardNumber);

  return (
    card?.cardHolderName?.trim().length >= 2 &&
    cardNumber.startsWith("4") &&
    cardNumber.length >= 13 &&
    cardNumber.length <= 19
  );
}

export function VisaWithdrawalFields({ amount, balance, card, onChange }) {
  const numericAmount = Number(amount);
  const shouldShow = numericAmount > 0 && numericAmount <= Number(balance || 0);

  if (!shouldShow) return null;

  const update = (key, value) => {
    const nextValue =
      key === "cardNumber" ? formatCardNumber(value) :
        key === "cardHolderName" ? value.toUpperCase() :
          value;

    onChange({ ...card, [key]: nextValue });
  };

  return (
    <div className="rounded-xl border border-brand-primary/25 bg-brand-primary-light/45 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CreditCard className="h-4 w-4 text-brand-primary" />
          Withdrawal destination
        </div>
        <span className="rounded-md border border-brand-primary/25 bg-card px-2.5 py-1 text-xs font-semibold text-brand-primary">
          VISA (ZaloPay)
        </span>
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Cardholder Name</label>
        <input
          type="text"
          value={card.cardHolderName}
          onChange={(e) => update("cardHolderName", e.target.value)}
          placeholder="NGUYEN VAN A"
          autoComplete="cc-name"
          className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Visa Card Number</label>
        <input
          type="text"
          inputMode="numeric"
          value={card.cardNumber}
          onChange={(e) => update("cardNumber", e.target.value)}
          placeholder="4xxx xxxx xxxx xxxx"
          autoComplete="cc-number"
          className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
          required
        />
      </div>
      <p className="text-xs text-muted-foreground">
        The withdrawal will be sent to this Visa card through ZaloPay.
      </p>
    </div>
  );
}
