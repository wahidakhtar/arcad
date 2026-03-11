import { createMiSite } from "../../features/project/services/miClient"
import { createMaSite } from "../../features/project/services/maClient"
import { createMcSite } from "../../features/project/services/mcClient"
import { createMdSite } from "../../features/project/services/mdClient"
import { createBbSite } from "../../features/project/services/bbClient"

import { createUser } from "./userClient"

export function getClient(entity: string, context: any) {

  if (entity === "site") {

    const project = context?.project_id

    const projectClients: Record<string, any> = {
      mi: createMiSite,
      ma: createMaSite,
      mc: createMcSite,
      md: createMdSite,
      bb: createBbSite
    }

    const create = projectClients[project]

    if (create) {
      return { create }
    }

  }

  if (entity === "user") {
    return { create: createUser }
  }

  return {
    create: async () => ({
      success: false,
      error: "Unknown entity"
    })
  }
}