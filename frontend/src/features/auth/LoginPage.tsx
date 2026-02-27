import { useState } from "react"
import { api } from "../../lib/api"
import { useNavigate } from "react-router-dom"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = async () => {
    try {
      const res = await api.post("/v1/auth/login", {
        email,
        password,
      })

      localStorage.setItem("access_token", res.data.access_token)
      localStorage.setItem("user_name", res.data.name)

      navigate("/dashboard", { replace: true })
    } catch {
      setError("Invalid credentials")
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 300 }}>
        <h2>ARCAD Login</h2>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 10 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 10 }}
        />
        <button onClick={handleLogin} style={{ width: "100%" }}>
          Login
        </button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    </div>
  )
}
