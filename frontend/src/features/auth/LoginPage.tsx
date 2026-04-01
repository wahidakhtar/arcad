import { useState } from "react"
import { useNavigate } from "react-router-dom"

import Button from "../../components/ui/Button"
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
      <div className="glass-panel relative w-full max-w-[980px] overflow-hidden">
        <div className="grid min-h-[520px] md:grid-cols-[0.84fr_1fr]">
          <div className="relative overflow-hidden bg-jscolors-crimson px-8 py-8 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_28%)]" />
            <div className="relative z-10 flex h-full items-center justify-center">
              <div className="w-full max-w-[250px] rounded-[26px] border border-white/18 bg-white/95 px-6 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
                <img src="/logo.png" alt="ARCAD" className="mx-auto h-auto w-full" />
              </div>
            </div>
          </div>

          <div className="flex items-center bg-white/70 px-8 py-8">
            <form
              className="mx-auto w-full max-w-md"
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
              <p className="mt-3 text-sm text-jscolors-text/60">Use your assigned username and password.</p>

              <div className="mt-8 space-y-5">
                <Input label="Username" value={username} onChange={setUsername} />
                <Input label="Password" value={password} onChange={setPassword} type="password" />
              </div>

              {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}

              <div className="mt-8 flex items-center gap-3">
                <Button type="submit" size="lg" disabled={submitting}>
                  {submitting ? "Entering..." : "Enter Workspace"}
                </Button>
                {setupRequired ? (
                  <Button type="button" variant="secondary" size="lg" onClick={() => navigate("/setup")}>
                    First Run Setup
                  </Button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </div>
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
