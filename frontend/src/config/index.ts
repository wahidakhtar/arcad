import { dashboardConfig } from "./dashboard"
import { peopleConfig } from "./people"

export const pageConfigs = {
  people: peopleConfig,
  dashboard: dashboardConfig,
}

export function getPageConfig<K extends keyof typeof pageConfigs>(pageKey: K): (typeof pageConfigs)[K] {
  return pageConfigs[pageKey]
}
