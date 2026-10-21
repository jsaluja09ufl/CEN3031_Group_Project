const formatTime = (time) =>
  new Date(time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

export default function EventList({ events }) {
  if (events.length === 0) {
    return <p className="no-events">No events yet.</p>
  }

  return (
    <ul className="event-list">
      {events.map((event) => (
        <li key={event.event_id} className={`event priority-${event.priority}`}>
          <div className="event-header">
            <strong>{event.title}</strong>
            <span className="priority-tag">{event.priority}</span>
          </div>
          <div className="event-time">
            {formatTime(event.start_time)} - {formatTime(event.end_time)}
          </div>
          {event.category && <div className="event-category">{event.category}</div>}
          {event.description && <p className="event-description">{event.description}</p>}
        </li>
      ))}
    </ul>
  )
}
