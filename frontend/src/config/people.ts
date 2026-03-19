import type { FieldDefinition } from "../components/ui/FieldRenderer"

export const peopleConfig = {
  listColumns: [
    { key: "label", label: "Name" },
    { key: "department", label: "Department" },
    { key: "project", label: "Project" },
    { key: "access", label: "Access" },
  ],
  addUserFields: [
    { key: "label", label: "Full Name", type: "text", required: true },
    { key: "username", label: "Username", type: "text", required: true },
    { key: "password", label: "Password", type: "password", required: true },
    { key: "confirm_password", label: "Confirm Password", type: "password", required: true },
  ] satisfies FieldDefinition[],
}
