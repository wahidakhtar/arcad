import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

export default function LoginPage() {
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = async () => {
    try {
      const res = await api.post("/auth/login", { email, password })

      localStorage.setItem("access_token", res.data.access_token)

      refreshAuth()
      navigate("/")
    } catch {
      setError("Invalid credentials")
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Login</h2>

      <div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <div style={{ color: "red", marginTop: 10 }}>
          {error}
        </div>
      )}

      <button
        style={{ marginTop: 15 }}
        onClick={handleLogin}
      >
        Login
      </button>
    </div>
  )
}
