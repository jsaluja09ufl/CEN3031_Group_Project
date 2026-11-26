import { eventKey } from '../utils/eventConflicts'

const formatTime = (time) =>
  new Date(time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

export default function ConflictWarning({ conflicts, onConfirm, onCancel }) {
  return (
    <div className="message warning">
      <strong>⚠ This event overlaps with {conflicts.length} {conflicts.length === 1 ? 'event' : 'events'} on your schedule:</strong>
      <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
        {conflicts.map((event) => (
          <li key={eventKey(event)}>
            {event.title} ({event.group_name ? event.group_name : 'Personal'}) : {formatTime(event.start_time)} - {formatTime(event.end_time)}
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" className="btn-submit" style={{ width: 'auto', marginTop: 0 }} onClick={onConfirm}>
          Add Anyway
        </button>
        <button type="button" className="btn-submit" style={{ width: 'auto', marginTop: 0, background: '#4b5563' }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
