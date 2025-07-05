import "./PlayerCard.css"

const PlayerCard = ({ player, onSelect, canSelect, isSelected }) => {
  const getRoleClass = (role) => {
    switch (role) {
      case "Batsman":
        return "role-batsman"
      case "Bowler":
        return "role-bowler"
      case "All Rounder":
        return "role-allrounder"
      case "Wicket Keeper":
        return "role-keeper"
      default:
        return "role-default"
    }
  }

  const getCountryFlag = (country) => {
    const flags = {
      India: "🇮🇳",
      Pakistan: "🇵🇰",
      "New Zealand": "🇳🇿",
      Australia: "🇦🇺",
      England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    }
    return flags[country] || "🏏"
  }

  return (
    <div
      className={`player-card ${canSelect ? "selectable" : ""} ${isSelected ? "selected" : ""}`}
      onClick={canSelect ? onSelect : undefined}
    >
      <div className="card-header">
        <span className="country-flag">{getCountryFlag(player.country)}</span>
        <span className={`role-badge ${getRoleClass(player.role)}`}>{player.role}</span>
      </div>

      <div className="player-info">
        <h3 className="player-name">{player.name}</h3>
        <p className="player-country">{player.country}</p>
      </div>

      {canSelect && (
        <div className="select-prompt">
          <span className="select-text">Click to select</span>
        </div>
      )}

      {isSelected && (
        <div className="selected-indicator">
          <span className="selected-text">✓ Selected</span>
        </div>
      )}
    </div>
  )
}

export default PlayerCard
