"use client"

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useState, useEffect } from "react"
import io from "socket.io-client"
import { AuthProvider, useAuth } from "./context/AuthContext"
import Login from "./components/Auth/Login"
import Register from "./components/Auth/Register"
import Dashboard from "./components/Dashboard/Dashboard"
import GameRoom from "./components/GameRoom/GameRoom"
import "./App.css"

function AppContent() {
  const [socket, setSocket] = useState(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const { user, token, loading } = useAuth()

  useEffect(() => {
    if (user && token) {
      console.log("🔌 Creating socket connection...")

      const newSocket = io("https://cricket-team-server.vercel.app", {
        auth: {
          token: token,
        },
        // Force polling transport for Vercel compatibility
        transports: ["polling"],
        upgrade: false,
        timeout: 30000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        maxHttpBufferSize: 1e8,
      })

      newSocket.on("connect", () => {
        console.log("✅ Socket connected:", newSocket.id)
        console.log("🔗 Transport:", newSocket.io.engine.transport.name)
        setSocketConnected(true)
      })

      newSocket.on("disconnect", (reason) => {
        console.log("❌ Socket disconnected:", reason)
        setSocketConnected(false)
      })

      newSocket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error)
        setSocketConnected(false)
      })

      newSocket.on("reconnect", (attemptNumber) => {
        console.log("🔄 Socket reconnected after", attemptNumber, "attempts")
        setSocketConnected(true)
      })

      newSocket.on("reconnect_error", (error) => {
        console.error("❌ Socket reconnection error:", error)
      })

      setSocket(newSocket)

      return () => {
        console.log("🔌 Cleaning up socket connection")
        newSocket.close()
        setSocket(null)
        setSocketConnected(false)
      }
    } else {
      if (socket) {
        socket.close()
        setSocket(null)
        setSocketConnected(false)
      }
    }
  }, [user, token])

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
        <Route
          path="/dashboard"
          element={user ? <Dashboard socket={socket} socketConnected={socketConnected} /> : <Navigate to="/login" />}
        />
        <Route
          path="/room/:roomCode"
          element={user ? <GameRoom socket={socket} socketConnected={socketConnected} /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App
