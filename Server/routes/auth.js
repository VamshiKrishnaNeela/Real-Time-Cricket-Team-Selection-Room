const express = require("express")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const auth = require("../middleware/auth")

const router = express.Router()

// Add this function at the top after the imports
const setCorsHeaders = (res) => {
  res.header("Access-Control-Allow-Origin", "https://cricket-team-two.vercel.app")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
  res.header("Access-Control-Allow-Credentials", "true")
}

// Register
router.post("/register", async (req, res) => {
  setCorsHeaders(res)
  try {
    const { username, email, password } = req.body

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        error: "All fields are required",
      })
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        error: "Username must be between 3 and 20 characters",
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      })
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    })

    if (existingUser) {
      return res.status(400).json({
        error: existingUser.email === email.toLowerCase() ? "Email already registered" : "Username already taken",
      })
    }

    // Create user
    const user = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
    })

    await user.save()

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "fallback_secret", {
      expiresIn: "7d",
    })

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        gamesPlayed: user.gamesPlayed,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({
        error: `${field === "email" ? "Email" : "Username"} already exists`,
      })
    }

    res.status(500).json({ error: "Registration failed. Please try again." })
  }
})

// Login
router.post("/login", async (req, res) => {
  setCorsHeaders(res)
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" })
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "fallback_secret", {
      expiresIn: "7d",
    })

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        gamesPlayed: user.gamesPlayed,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Login failed. Please try again." })
  }
})

// Get user profile
router.get("/profile", auth, async (req, res) => {
  setCorsHeaders(res)
  try {
    const user = await User.findById(req.userId).select("-password")
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }
    res.json(user)
  } catch (error) {
    console.error("Profile fetch error:", error)
    res.status(500).json({ error: "Failed to fetch profile" })
  }
})

// Get user game history
router.get("/history", auth, async (req, res) => {
  setCorsHeaders(res)
  try {
    const user = await User.findById(req.userId).select("gameHistory gamesPlayed")
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({
      gamesPlayed: user.gamesPlayed,
      gameHistory: user.gameHistory.slice(-10), // Last 10 games
    })
  } catch (error) {
    console.error("History fetch error:", error)
    res.status(500).json({ error: "Failed to fetch game history" })
  }
})

// Check active room session
router.get("/active-room", auth, async (req, res) => {
  setCorsHeaders(res)
  try {
    const UserSession = require("../models/UserSession")
    const Room = require("../models/Room")

    const session = await UserSession.findOne({ userId: req.userId }).sort({ createdAt: -1 })

    if (session) {
      const room = await Room.findOne({ code: session.roomCode })
      if (room) {
        return res.json({
          hasActiveRoom: true,
          roomCode: session.roomCode,
          room: {
            code: room.code,
            users: room.users.filter((u) => !u.disconnected),
            isStarted: room.isStarted,
          },
        })
      }
    }

    res.json({ hasActiveRoom: false })
  } catch (error) {
    console.error("Active room check error:", error)
    res.status(500).json({ error: "Failed to check active room" })
  }
})

module.exports = router
