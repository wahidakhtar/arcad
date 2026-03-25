export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-"
  return String(value)
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "-"
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(num)) return "-"
  return `₹ ${num.toLocaleString("en-IN")}`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return value
  }
}
