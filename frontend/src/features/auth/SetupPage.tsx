import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../../lib/api"

export default function SetupPage() {

  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    try {
      setLoading(true)

      await api.post("/setup/create-ceo", {
        name,
        username,
        password
      })

      navigate("/login")

    } catch {
      setError("Failed to create CEO user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#8B1A1A"
      }}
    >
      <form
        onSubmit={handleCreate}
        style={{
          background: "white",
          padding: 40,
          borderRadius: 8,
          width: 340,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}
      >

        <h2 style={{ marginBottom: 25, textAlign: "center", color: "#8B1A1A" }}>
          ARCAD Initial Setup
        </h2>

        <input
          type="text"
          placeholder="CEO Name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 12,
            border: "1px solid #ccc",
            borderRadius: 4
          }}
        />

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 12,
            border: "1px solid #ccc",
            borderRadius: 4
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #ccc",
            borderRadius: 4
          }}
        />

        {error && (
          <div style={{ color: "red", marginTop: 10 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 18,
            padding: 10,
            background: "#8B1A1A",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          {loading ? "Creating..." : "Create CEO"}
        </button>

      </form>
    </div>
  )
}