import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

export default function SetupPage() {
  const navigate = useNavigate()
  const { refreshAuth, setupRequired } = useAuth()
  const [label, setLabel] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="page-shell flex items-center justify-center p-6">
      <div className="glass-panel w-full max-w-2xl p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/45">Initial Setup</p>
        <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">Create the CEO account</h1>
        <p className="mt-3 text-sm text-jscolors-text/60">This route is intended for first deploy only and should succeed only when no users exist.</p>
        {!setupRequired ? (
          <div className="mt-6 rounded-[22px] border border-jscolors-gold/30 bg-jscolors-gold/10 px-4 py-4 text-sm text-jscolors-text/70">
            Setup is no longer required for this installation. You can return to the login screen.
          </div>
        ) : null}

        <form
          className="mt-8 space-y-5"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!setupRequired) {
              navigate("/login")
              return
            }
            if (!label.trim()) {
              setError("Full Name is required.")
              return
            }
            if (!username.trim()) {
              setError("Username is required.")
              return
            }
            if (password.length < 8) {
              setError("Password must be at least 8 characters.")
              return
            }
            if (password !== confirmPassword) {
              setError("Passwords do not match.")
              return
            }
            try {
              setSubmitting(true)
              setError("")
              await api.post("/setup", { label, username, password })
              await refreshAuth()
              navigate("/login")
            } catch {
              setError("Setup failed. The system may already be initialized.")
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <Input label="Full Name" value={label} onChange={setLabel} />
          <Input label="Username" value={username} onChange={setUsername} autoComplete="username" />
          <Input label="Password" value={password} onChange={setPassword} type="password" />
          <Input label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} type="password" />
          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
          <div className="flex gap-3">
            <button className="premium-button" type="submit" disabled={submitting || !setupRequired}>
              {submitting ? "Initializing..." : "Initialize ARCAD"}
            </button>
            <button className="premium-button-secondary" type="button" onClick={() => navigate("/login")}>
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-jscolors-text/45">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete ?? (type === "password" ? "new-password" : "name")}
        className="w-full rounded-[22px] border border-jscolors-crimson/15 bg-white px-5 py-4 text-base outline-none transition focus:border-jscolors-crimson/40"
      />
    </label>
  )
}
