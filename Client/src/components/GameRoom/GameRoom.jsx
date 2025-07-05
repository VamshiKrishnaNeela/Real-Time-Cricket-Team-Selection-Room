import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import PlayerCard from "../PlayerCard/PlayerCard"
import UserList from "../UserList/UserList"
import Timer from "../Timer/Timer"
import { useAuth } from "../../context/AuthContext"
import "./GameRoom.css"

const GameRoom = ({ socket, socketConnected }) => {
  const { roomCode } = useParams()
  const navigate = useNavigate()
  const { user, token } = useAuth()

  const [gameState, setGameState] = useState({
    users: [],
    host: null,
    isStarted: false,
    availablePlayers: [],
    selectedPlayers: {},
    turnOrder: [],
    currentPlayer: null,
    turnStartTime: null,
  })

  const [notifications, setNotifications] = useState([])
  const [timeLeft, setTimeLeft] = useState(10)
  const [roomJoined, setRoomJoined] = useState(false)
  const [joinAttempted, setJoinAttempted] = useState(false)

  useEffect(() => {
    if (!socket || !socketConnected || !user || !token || joinAttempted) return

    console.log(`\n=== ATTEMPTING TO JOIN ROOM ===`)
    console.log(`Room: ${roomCode}`)
    console.log(`User: ${user.username} (${user.id})`)
    console.log(`Socket: ${socket.id}`)
    console.log(`Socket Connected: ${socketConnected}`)

    setJoinAttempted(true)

    setTimeout(() => {
      console.log("🚀 Emitting join-room event")
      socket.emit("join-room", { roomCode, username: user.username, userId: user.id })
    }, 100)
  }, [socket, socketConnected, user, token, roomCode, joinAttempted])

  useEffect(() => {
    if (!socket) return

    const handleRoomJoined = ({ room }) => {
      console.log("✅ Successfully joined room:", room.code)
      console.log("📊 Room data received:")
      console.log(`  - Users: ${room.users.length}`)
      console.log(`  - Host: ${room.host}`)
      console.log(`  - My socket: ${socket.id}`)
      console.log(`  - Am I host: ${room.host === socket.id}`)

      setGameState({
        users: room.users || [],
        host: room.host,
        isStarted: room.isStarted || false,
        availablePlayers: room.availablePlayers || [],
        selectedPlayers: room.selectedPlayers || {},
        turnOrder: room.turnOrder || [],
        currentPlayer: room.currentPlayer,
        turnStartTime: room.turnStartTime,
      })
      setRoomJoined(true)
      localStorage.setItem("currentRoom", roomCode)
      addNotification("Successfully joined the room!")
    }

    const handleUserJoined = ({ users, host }) => {
      console.log("👥 User joined event received")
      console.log(`  - Users: ${users.length}`)
      console.log(`  - Host: ${host}`)
      console.log(`  - My socket: ${socket.id}`)
      console.log(`  - Am I host: ${host === socket.id}`)

      setGameState((prev) => ({ ...prev, users, host }))
      addNotification("A new player joined the room")
    }

    const handleUserLeft = ({ users, host }) => {
      setGameState((prev) => ({ ...prev, users, host }))
      addNotification("A player left the room")
    }

    const handleUserRejoined = ({ users, host }) => {
      setGameState((prev) => ({ ...prev, users, host }))
      addNotification("A player rejoined the room")
    }

    const handleSelectionStarted = ({ turnOrder, currentPlayer, turnStartTime }) => {
      setGameState((prev) => ({
        ...prev,
        isStarted: true,
        turnOrder,
        currentPlayer,
        turnStartTime,
      }))
      addNotification("Team selection has started!")
    }

    const handlePlayerSelected = ({ player, selectedBy, selectedPlayers, availablePlayers }) => {
      const username = gameState.users.find((u) => u.id === selectedBy)?.username || "Someone"
      setGameState((prev) => ({
        ...prev,
        selectedPlayers,
        availablePlayers,
      }))
      addNotification(`${username} selected ${player.name}`)
    }

    const handleAutoSelected = ({ player, selectedBy, selectedPlayers, availablePlayers }) => {
      const username = gameState.users.find((u) => u.id === selectedBy)?.username || "Someone"
      setGameState((prev) => ({
        ...prev,
        selectedPlayers,
        availablePlayers,
      }))
      addNotification(`${player.name} was auto-selected for ${username}`)
    }

    const handleTurnChanged = ({ currentPlayer, username, turnStartTime }) => {
      setGameState((prev) => ({
        ...prev,
        currentPlayer,
        turnStartTime,
      }))
      addNotification(`It's ${username}'s turn to pick`)
    }

    const handleSelectionEnded = ({ finalTeams }) => {
      setGameState((prev) => ({
        ...prev,
        currentPlayer: null,
      }))
      addNotification("Team selection completed!")
    }

    const handleError = ({ message }) => {
      console.error("❌ Socket error:", message)
      addNotification(`Error: ${message}`)

      if (message.includes("Room not found")) {
        localStorage.removeItem("currentRoom")
        setTimeout(() => {
          navigate("/dashboard")
        }, 2000)
      } else if (message.includes("not in this room")) {
        localStorage.removeItem("currentRoom")
        setJoinAttempted(false)
        setRoomJoined(false)
      }
    }

    socket.on("room-joined", handleRoomJoined)
    socket.on("user-joined", handleUserJoined)
    socket.on("user-left", handleUserLeft)
    socket.on("user-rejoined", handleUserRejoined)
    socket.on("selection-started", handleSelectionStarted)
    socket.on("player-selected", handlePlayerSelected)
    socket.on("auto-selected", handleAutoSelected)
    socket.on("turn-changed", handleTurnChanged)
    socket.on("selection-ended", handleSelectionEnded)
    socket.on("error", handleError)

    return () => {
      socket.off("room-joined", handleRoomJoined)
      socket.off("user-joined", handleUserJoined)
      socket.off("user-left", handleUserLeft)
      socket.off("user-rejoined", handleUserRejoined)
      socket.off("selection-started", handleSelectionStarted)
      socket.off("player-selected", handlePlayerSelected)
      socket.off("auto-selected", handleAutoSelected)
      socket.off("turn-changed", handleTurnChanged)
      socket.off("selection-ended", handleSelectionEnded)
      socket.off("error", handleError)
    }
  }, [socket, gameState.users, roomCode, navigate])

  useEffect(() => {
    if (!gameState.isStarted || !gameState.turnStartTime || gameState.currentPlayer !== socket?.id) {
      setTimeLeft(10)
      return
    }

    const startTime = new Date(gameState.turnStartTime).getTime()
    const updateTimer = () => {
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      const remaining = Math.max(0, 10 - elapsed)
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 100)

    return () => clearInterval(interval)
  }, [gameState.turnStartTime, gameState.currentPlayer, gameState.isStarted, socket?.id])

  const addNotification = (message) => {
    const id = Date.now()
    setNotifications((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 3000)
  }

  const startSelection = () => {
    console.log("🎯 Start selection button clicked")
    socket.emit("start-selection")
  }

  const selectPlayer = (playerId) => {
    socket.emit("select-player", { playerId })
  }

  const leaveRoom = () => {
    localStorage.removeItem("currentRoom")
    navigate("/dashboard")
  }

  const isMyTurn = gameState.currentPlayer === socket?.id
  const isHost = gameState.host === socket?.id
  const mySelectedPlayers = gameState.selectedPlayers[socket?.id] || []

  if (!socketConnected) {
    return (
      <div className="game-room">
        <div className="connection-status">
          <div className="connecting">
            <h2>🔌 Connecting to server...</h2>
            <p>Please wait while we establish connection</p>
          </div>
        </div>
      </div>
    )
  }

  if (!roomJoined) {
    return (
      <div className="game-room">
        <div className="connection-status">
          <div className="connecting">
            <h2>🚪 Joining room {roomCode}...</h2>
            <p>Please wait while we connect you to the room</p>
            <button
              onClick={() => {
                setJoinAttempted(false)
                setRoomJoined(false)
              }}
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                background: "#667eea",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-room">
      {/* Header */}
      <div className="game-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="room-title">🏏 Room: {roomCode}</h1>
            <p className="welcome-text">Welcome, {user?.username}!</p>
          </div>
          <button onClick={leaveRoom} className="leave-btn">
            🚪 Leave Room
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="notifications">
        {notifications.map((notification) => (
          <div key={notification.id} className="notification">
            {notification.message}
          </div>
        ))}
      </div>

      <div className="game-content">
        {!gameState.isStarted ? (
          <div className="waiting-room">
            <div className="waiting-content">
              <h2 className="waiting-title">⏳ Waiting to Start</h2>
              <p className="waiting-description">
                {gameState.users.length < 2
                  ? "Waiting for more players to join..."
                  : isHost
                    ? 'Click "Start Team Selection" when ready!'
                    : "Waiting for host to start the game..."}
              </p>
              <div className="players-needed">
                Players in room: {gameState.users.length} | Players needed: {Math.max(0, 2 - gameState.users.length)}{" "}
                more
              </div>

              {/* Users List */}
              <div className="waiting-users">
                <UserList
                  users={gameState.users}
                  selectedPlayers={gameState.selectedPlayers}
                  currentPlayer={gameState.currentPlayer}
                  host={gameState.host}
                />
              </div>

              {/* Start Button - Enhanced conditions */}
              {!gameState.isStarted && isHost && gameState.users.length >= 2 && (
                <button onClick={startSelection} className="start-btn">
                  🎯 Start Team Selection
                </button>
              )}

              {/* Show why button is not visible */}
              {!gameState.isStarted && !isHost && gameState.users.length >= 2 && (
                <div style={{ color: "#666", fontSize: "14px", marginTop: "10px" }}>
                  Waiting for host ({gameState.users.find((u) => u.id === gameState.host)?.username || "Unknown"}) to
                  start the game...
                </div>
              )}

              {gameState.users.length < 2 && (
                <div style={{ color: "#666", fontSize: "14px", marginTop: "10px" }}>
                  Need at least 2 players to start the game
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="game-layout">
            {/* Top Section - Users */}
            <div className="users-section">
              <UserList
                users={gameState.users}
                selectedPlayers={gameState.selectedPlayers}
                currentPlayer={gameState.currentPlayer}
                host={gameState.host}
              />

              {gameState.isStarted && (
                <div className="turn-info">
                  <h3 className="turn-title">Current Turn</h3>
                  {isMyTurn ? (
                    <div className="my-turn">
                      <p className="turn-text">Your Turn!</p>
                      <Timer timeLeft={timeLeft} />
                    </div>
                  ) : (
                    <p className="waiting-text">
                      {gameState.users.find((u) => u.id === gameState.currentPlayer)?.username || "Waiting..."}'s turn
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Section - Players Side by Side */}
            <div className="players-section">
              {/* My Team */}
              <div className="my-team-section">
                <h2 className="section-title">👥 My Team ({mySelectedPlayers.length}/5)</h2>
                <div className="players-grid">
                  {mySelectedPlayers.map((player) => (
                    <PlayerCard key={player.id} player={player} isSelected={true} />
                  ))}
                  {Array.from({ length: 5 - mySelectedPlayers.length }).map((_, index) => (
                    <div key={index} className="empty-slot">
                      <div className="empty-slot-content">
                        <span className="empty-slot-icon">➕</span>
                        <span className="empty-slot-text">Empty Slot</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Players */}
              <div className="available-players-section">
                <h2 className="section-title">🏏 Available Players ({gameState.availablePlayers.length})</h2>
                <div className="players-grid available-grid">
                  {gameState.availablePlayers.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onSelect={() => selectPlayer(player.id)}
                      canSelect={isMyTurn}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GameRoom
