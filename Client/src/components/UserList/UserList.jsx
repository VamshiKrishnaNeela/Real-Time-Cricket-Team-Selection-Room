import "./UserList.css"

const UserList = ({ users, selectedPlayers, currentPlayer, host }) => {
  return (
    <div className="user-list">
      <h3 className="user-list-title">👥 Players ({users.length})</h3>
      <div className="users-container">
        {users.map((user) => {
          const userSelectedCount = selectedPlayers[user.id]?.length || 0
          const isCurrentTurn = currentPlayer === user.id
          const isHost = host === user.id

          return (
            <div key={user.id} className={`user-item ${isCurrentTurn ? "current-turn" : ""}`}>
              <div className="user-info">
                <div className="user-header">
                  <span className="username">{user.username}</span>
                  {isHost && <span className="host-badge">Host</span>}
                </div>
                <div className="user-progress">{userSelectedCount}/5 players</div>
              </div>

              {isCurrentTurn && (
                <div className="turn-indicator">
                  <div className="turn-dot"></div>
                  <span className="turn-label">Turn</span>
                </div>
              )}

              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(userSelectedCount / 5) * 100}%` }}></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default UserList
