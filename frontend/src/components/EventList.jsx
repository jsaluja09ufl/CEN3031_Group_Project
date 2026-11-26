import { eventKey } from '../utils/eventConflicts'

const formatTime = (time) =>
  new Date(time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

export default function EventList({ events, conflictKeys = new Set() }) {
  if (events.length === 0) {
    return <p className="no-events">No events yet.</p>
  }

  return (
    <ul className="event-list">
      {events.map((event) => (
        <li
          key={eventKey(event)}
          className={`event priority-${event.priority} ${conflictKeys.has(eventKey(event)) ? 'event-conflict' : ''}`}
        >
          <div className="event-header">
            <strong>{event.title}</strong>
            <span className="priority-tag">{event.priority}</span>
          </div>
          <div className="event-time">
            {formatTime(event.start_time)} - {formatTime(event.end_time)}
          </div>
          {event.group_name && <div className="event-category">Group: {event.group_name}</div>}
          {event.category && <div className="event-category">{event.category}</div>}
          {conflictKeys.has(eventKey(event)) && (
            <div className="conflict-tag">⚠ Overlaps with another event</div>
          )}
          {event.description && <p className="event-description">{event.description}</p>}
        </li>
      ))}
    </ul>
  )
}
