import { bbConfig } from "./bb"
import { dashboardConfig } from "./dashboard"
import { maConfig } from "./ma"
import { mcConfig } from "./mc"
import { mdConfig } from "./md"
import { miConfig } from "./mi"
import { peopleConfig } from "./people"

export const projectConfigs = {
  mi: miConfig,
  md: mdConfig,
  ma: maConfig,
  mc: mcConfig,
  bb: bbConfig,
}

export const pageConfigs = {
  people: peopleConfig,
  dashboard: dashboardConfig,
}

export function getProjectConfig(projectKey: string) {
  const config = projectConfigs[projectKey as keyof typeof projectConfigs]
  if (!config) {
    return undefined
  }
  return {
    ...config,
    listColumns: config.uiFields.filter((field) => field.listView).map(({ key, label, type }) => ({ key, label, type })),
  }
}

export function getPageConfig<K extends keyof typeof pageConfigs>(pageKey: K): (typeof pageConfigs)[K] {
  return pageConfigs[pageKey]
}
