import { useState, useEffect } from "react"
import "./HomePage.css"

const HomePage = ({ socket, onJoinRoom, onRoomJoined }) => {
  const [roomCode, setRoomCode] = useState("")
  const [username, setUsername] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!socket) return

    socket.on("room-joined", ({ room }) => {
      onRoomJoined(room)
    })

    socket.on("error", ({ message }) => {
      setError(message)
      setIsCreating(false)
    })

    return () => {
      socket.off("room-joined")
      socket.off("error")
    }
  }, [socket, onRoomJoined])

  const createRoom = async () => {
    if (!username.trim()) {
      setError("Please enter your name")
      return
    }

    setIsCreating(true)
    setError("")

    try {
      const response = await fetch("https://cricket-team-server.vercel.app/api/create-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      onJoinRoom(data.roomCode, username)
    } catch (err) {
      setError("Failed to create room")
      setIsCreating(false)
    }
  }

  const joinRoom = () => {
    if (!username.trim() || !roomCode.trim()) {
      setError("Please enter both name and room code")
      return
    }

    setError("")
    onJoinRoom(roomCode.toUpperCase(), username)
  }

  return (
    <div className="homepage">
      <div className="homepage-container">
        <div className="homepage-header">
          <h1 className="homepage-title">🏏 Cricket Team Selection</h1>
          <p className="homepage-subtitle">Create or join a room to start selecting your dream team!</p>
        </div>

        <div className="homepage-form">
          <div className="input-group">
            <label className="input-label">Your Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button onClick={createRoom} disabled={isCreating} className="btn btn-primary">
              {isCreating ? "Creating Room..." : "🎯 Create New Room"}
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            <div className="input-group">
              <label className="input-label">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="input-field"
                placeholder="Enter room code"
                maxLength={6}
              />
            </div>

            <button onClick={joinRoom} className="btn btn-secondary">
              🚪 Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
