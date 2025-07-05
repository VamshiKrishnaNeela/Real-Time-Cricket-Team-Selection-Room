import { useState, useEffect } from "react"
import "./Timer.css"

const Timer = ({ timeLeft: propTimeLeft }) => {
  const [timeLeft, setTimeLeft] = useState(propTimeLeft)

  useEffect(() => {
    setTimeLeft(propTimeLeft)
  }, [propTimeLeft])

  const getTimerClass = () => {
    if (timeLeft <= 3) return "timer-critical"
    if (timeLeft <= 5) return "timer-warning"
    return "timer-normal"
  }

  return (
    <div className="timer-container">
      <div className={`timer-display ${getTimerClass()}`}>{timeLeft}s</div>
      <div className="timer-bar">
        <div className={`timer-fill ${getTimerClass()}`} style={{ width: `${(timeLeft / 10) * 100}%` }}></div>
      </div>
    </div>
  )
}

export default Timer
