import { formatCurrency } from "../../lib/formatCurrency.js";

function formatMoneyInputValue(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return formatCurrency(value).replace(/\s*VND$/i, "");
}

/**
 * MoneyInput displays VND-formatted text while keeping parent state numeric.
 */
export function MoneyInput({
  value,
  onValueChange,
  className = "",
  placeholder = "0",
  disabled = false,
  ...props
}) {
  const handleChange = (event) => {
    const rawValue = event.target.value;

    if (rawValue.trim() === "") {
      onValueChange?.("");
      return;
    }

    const digitsOnly = rawValue.replace(/\D/g, "");
    onValueChange?.(digitsOnly ? Number(digitsOnly) : "");
  };

  return (
    <div className="relative">
      <input
        {...props}
        type="text"
        inputMode="numeric"
        value={formatMoneyInputValue(value)}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`${className} pr-14`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold text-muted-foreground">
        VND
      </span>
    </div>
  );
}
