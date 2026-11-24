import GroupGoals from './GroupGoals'

export default function GroupSpaceView({
  space,
  onBack,
  currentUser,
  events = []
}) {
  const currentSpaceName = space?.name || localStorage.getItem('current_space_name')
  const currentSpaceType = space
    ? (space.group_type === 1 ? 'Public' : 'Private')
    : (localStorage.getItem('current_space_type') || 'Private')
  
  // Check if owner or admin in localStorage
  const isAdmin = (space && currentUser && space.owner_user === currentUser) || 
                  localStorage.getItem('is_admin') === 'true'

  if (!currentSpaceName) {
    return (
      <div className="group-space-view">
        {onBack && (
          <button type="button" onClick={onBack}>
            Back to Group Spaces
          </button>
        )}
        <p className="no-events">No active group space selected.</p>
      </div>
    )
  }

  return (
    <div className="group-space-view">
      {onBack && (
        <button type="button" onClick={onBack}>
          Back to Group Spaces
        </button>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>{currentSpaceName}</h2>
        <span> {currentSpaceType} </span>
      </div>

      <div> Role: <strong>{isAdmin ? 'Admin' : 'Member'}</strong> </div>

      <div className="group-space-section">
        <h3>Calendar & Events</h3>
        {events.length === 0 ? (
          <p className="no-events">No events scheduled for this group space yet.</p>
        ) : (
          <ul className="event-list">
            {events.map((event) => (
              <li key={event.event_id || event.id} className="event">
                <strong>{event.title}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      <GroupGoals
        groupId={space?.id || Number(localStorage.getItem('current_space_id'))}
        isAdmin={isAdmin}
      />
    </div>
  )
}
