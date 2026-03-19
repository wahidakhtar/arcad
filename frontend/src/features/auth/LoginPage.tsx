import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { useAuth } from "../../context/AuthContext"

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, setupRequired } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="page-shell flex items-center justify-center p-6">
      <div className="glass-panel relative w-full max-w-5xl overflow-hidden">
        <div className="grid min-h-[640px] md:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden bg-jscolors-crimson px-8 py-10 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_28%)]" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <img src="/logo.png" alt="ARCAD" className="h-16 w-16 rounded-[24px] border border-white/20 bg-white/10 p-3" />
                <p className="mt-10 text-xs uppercase tracking-[0.36em] text-white/65">ARCAD Internal Office System</p>
                <h1 className="mt-4 max-w-md font-syne text-5xl font-bold leading-[1.05]">Built for disciplined field operations.</h1>
                <p className="mt-5 max-w-lg text-sm leading-7 text-white/76">
                  Unified projects, site workflows, finance visibility, and permission-controlled execution in one premium internal console.
                </p>
              </div>
              <div className="grid gap-4 text-sm text-white/78 md:grid-cols-3">
                <Metric label="Auth Window" value="8 Hours" />
                <Metric label="Refresh Window" value="30 Days" />
                <Metric label="Runtime" value="Internal LAN" />
              </div>
            </div>
          </div>

          <div className="flex items-center bg-white/70 px-8 py-10">
            <form
              className="w-full"
              onSubmit={async (event) => {
                event.preventDefault()
                try {
                  setSubmitting(true)
                  setError("")
                  await login(username, password)
                  navigate("/dashboard")
                } catch {
                  setError("Login failed. Check credentials or active status.")
                } finally {
                  setSubmitting(false)
                }
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/45">Secure Access</p>
              <h2 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">Sign in</h2>
              <p className="mt-3 text-sm text-jscolors-text/60">Use your assigned ARCAD username and password.</p>

              <div className="mt-8 space-y-5">
                <Input label="Username" value={username} onChange={setUsername} />
                <Input label="Password" value={password} onChange={setPassword} type="password" />
              </div>

              {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}

              <div className="mt-8 flex items-center gap-3">
                <button type="submit" className="premium-button" disabled={submitting}>
                  {submitting ? "Entering..." : "Enter Workspace"}
                </button>
                {setupRequired ? (
                  <button type="button" className="premium-button-secondary" onClick={() => navigate("/setup")}>
                    First Run Setup
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
      <div className="text-[10px] uppercase tracking-[0.24em] text-white/55">{label}</div>
      <div className="mt-2 font-syne text-xl font-semibold">{value}</div>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-jscolors-text/45">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={type === "password" ? "current-password" : "username"}
        className="w-full rounded-[22px] border border-jscolors-crimson/15 bg-white px-5 py-4 text-base outline-none transition focus:border-jscolors-crimson/40"
      />
    </label>
  )
}
