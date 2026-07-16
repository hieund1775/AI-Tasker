import { formatCurrency } from "../../lib/formatCurrency.js";

/**
 * MoneyDisplay — renders a formatted currency value for display only.
 *
 * NEVER use this inside a form input. Form state must store raw numbers.
 * This component is for displaying money in cards, tables, summaries, etc.
 */
export function MoneyDisplay({ amount, currency = "USD", locale, className = "" }) {
  const formatted = formatCurrency(amount, currency, locale);

  if (!formatted) {
    if (amount === 0 || amount === "0") {
      return (
        <span className={className}>
          {formatCurrency(0, currency, locale)}
        </span>
      );
    }
    return <span className={`text-muted-foreground/50 italic ${className}`}>—</span>;
  }

  return <span className={className}>{formatted}</span>;
}
