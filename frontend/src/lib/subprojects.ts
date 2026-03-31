export function formatSubprojectLabel(subproject: { batch_date: string | null; bucket?: boolean; id?: number }) {
  if (subproject.bucket) return "Individual Site"
  if (subproject.batch_date) {
    return new Date(subproject.batch_date).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }
  return subproject.id ? `Batch ${subproject.id}` : "Unscheduled"
}
