import { DEFAULT_CURRENCY_LOCALE, formatCurrency } from "../../lib/formatCurrency.js";

/**
 * MoneyDisplay - renders a formatted currency value for display only.
 *
 * NEVER use this inside a form input. Form state must store raw numbers.
 * This component is for displaying money in cards, tables, summaries, etc.
 */
export function MoneyDisplay({
  amount,
  currency = "VND",
  locale = DEFAULT_CURRENCY_LOCALE,
  className = "",
  showSymbol = true,
}) {
  if (amount === null || amount === undefined || amount === "") {
    return <span className={`text-muted-foreground/50 italic ${className}`}>-</span>;
  }

  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || !Number.isFinite(numericAmount)) {
    return <span className={`text-muted-foreground/50 italic ${className}`}>-</span>;
  }

  const formatted = showSymbol
    ? formatCurrency(numericAmount, currency, locale)
    : new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numericAmount);

  return <span className={className}>{formatted}</span>;
}
