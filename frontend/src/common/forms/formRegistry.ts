import miForm from "./miForm"
import maForm from "./maForm"
import mcForm from "./mcForm"
import mdForm from "./mdForm"
import bbForm from "./bbForm"
import userForm from "./userForm"

export function getForm(entity: string, context: any) {

  if (entity === "site") {

    const project = context?.project_id

    const projectForms: Record<string, any> = {
      mi: miForm,
      ma: maForm,
      mc: mcForm,
      md: mdForm,
      bb: bbForm
    }

    return projectForms[project] || []
  }

  if (entity === "user") {
    return userForm
  }

  return []
}