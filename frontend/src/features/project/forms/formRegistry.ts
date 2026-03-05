import miForm from "./miForm"
import mdForm from "./mdForm"
import maForm from "./maForm"
import mcForm from "./mcForm"
import bbForm from "./bbForm"

export function getProjectForm(project: string) {
  switch (project) {
    case "mi": return miForm
    case "md": return mdForm
    case "ma": return maForm
    case "mc": return mcForm
    case "bb": return bbForm
    default: return []
  }
}
