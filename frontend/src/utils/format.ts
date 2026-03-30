export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-"
  return String(value)
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "-"
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(num)) return "-"
  return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  try {
    const text = String(value)
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const [year, month, day] = text.split("-")
      return `${day}/${month}/${year}`
    }
    return new Date(text).toLocaleDateString("en-GB")
  } catch {
    return value
  }
}
