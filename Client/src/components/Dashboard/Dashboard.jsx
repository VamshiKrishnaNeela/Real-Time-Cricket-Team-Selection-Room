"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import "./Dashboard.css"

const Dashboard = ({ socket, socketConnected }) => {
  const [gameHistory, setGameHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [creating, setCreating] = useState(false)

  const { user, token, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchGameHistory()
  }, [])

  const fetchGameHistory = async () => {
    try {
      const response = await fetch("https://cricket-team-server.vercel.app/api/auth/history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setGameHistory(data.gameHistory || [])
      } else {
        setError("Failed to fetch game history")
      }
    } catch (error) {
      setError("Failed to fetch game history")
    } finally {
      setLoading(false)
    }
  }

  const createRoom = async () => {
    try {
      setError("")
      setCreating(true)

      if (!socketConnected) {
        throw new Error("Not connected to server. Please wait and try again.")
      }

      console.log("🎯 Creating room...")

      const response = await fetch("https://cricket-team-server.vercel.app/api/create-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create room")
      }

      if (data.success && data.roomCode) {
        console.log(`✅ Room created: ${data.roomCode}`)
        localStorage.setItem("currentRoom", data.roomCode)

        // Navigate immediately
        navigate(`/room/${data.roomCode}`)
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (error) {
      console.error("❌ Room creation error:", error)
      setError(error.message || "Failed to create room")
    } finally {
      setCreating(false)
    }
  }

  const joinRoom = (inputRoomCode) => {
    const code = inputRoomCode || roomCode
    if (code.trim()) {
      if (!socketConnected) {
        setError("Not connected to server. Please wait and try again.")
        return
      }

      const upperCode = code.toUpperCase().trim()
      localStorage.setItem("currentRoom", upperCode)
      navigate(`/room/${upperCode}`)
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  useEffect(() => {
    checkActiveRoom()
  }, [])

  const checkActiveRoom = async () => {
    try {
      const response = await fetch("https://cricket-team-server.vercel.app/api/auth/active-room", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.hasActiveRoom) {
          const shouldRejoin = window.confirm(`You have an active room (${data.roomCode}). Would you like to rejoin?`)
          if (shouldRejoin) {
            localStorage.setItem("currentRoom", data.roomCode)
            navigate(`/room/${data.roomCode}`)
          }
        }
      }
    } catch (error) {
      console.error("Error checking active room:", error)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="user-info">
            <h1 className="dashboard-title">🏏 Cricket Selection Dashboard</h1>
            <p className="welcome-text">Welcome back, {user?.username}!</p>
            {!socketConnected && <p style={{ color: "#e53e3e", fontSize: "0.9rem" }}>⚠️ Connecting to server...</p>}
            {socketConnected && <p style={{ color: "#48bb78", fontSize: "0.9rem" }}>✅ Connected to server</p>}
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          {/* Quick Actions */}
          <div className="dashboard-card">
            <h2 className="card-title">🎯 Quick Actions</h2>
            <div className="action-buttons">
              <button onClick={createRoom} disabled={creating || !socketConnected} className="action-btn primary">
                {creating ? "Creating Room..." : "Create New Room"}
              </button>
              <div className="join-room-section">
                <input
                  type="text"
                  placeholder="Enter room code"
                  className="room-input"
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      joinRoom()
                    }
                  }}
                />
                <button onClick={() => joinRoom()} disabled={!socketConnected} className="action-btn secondary">
                  Join Room
                </button>
              </div>
            </div>
            {error && (
              <div className="error-message" style={{ marginTop: "15px" }}>
                {error}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="dashboard-card">
            <h2 className="card-title">📊 Your Stats</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">{user?.gamesPlayed || 0}</div>
                <div className="stat-label">Games Played</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{gameHistory.length}</div>
                <div className="stat-label">Recent Games</div>
              </div>
            </div>
          </div>

          {/* Game History */}
          <div className="dashboard-card full-width">
            <h2 className="card-title">🎮 Recent Game History</h2>
            {gameHistory.length === 0 ? (
              <div className="empty-state">
                <p>No games played yet. Create or join a room to start playing!</p>
              </div>
            ) : (
              <div className="history-list">
                {gameHistory.map((game, index) => (
                  <div key={index} className="history-item">
                    <div className="history-header">
                      <div className="room-code">Room: {game.roomCode}</div>
                      <div className="game-date">{new Date(game.completedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="history-details">
                      <div className="players-section">
                        <strong>Players:</strong> {game.players?.join(", ") || "N/A"}
                      </div>
                      <div className="selected-players-section">
                        <strong>Your Team:</strong>
                        <div className="selected-players">
                          {game.selectedPlayers?.map((player, idx) => (
                            <span key={idx} className="player-tag">
                              {player.name}
                            </span>
                          )) || "No players selected"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
