import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import GroupGoals from './GroupGoals'
import GroupTasks from './GroupTasks'
import GroupViewMembership from './GroupViewMembership'
import { api } from '../api/client'
import { validateEvent } from '../utils/validateEvent'
import { findConflicts, getConflictKeys, eventKey } from '../utils/eventConflicts'
import ConflictWarning from './ConflictWarning'

const formatTime = (time) =>
  new Date(time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

const emptyEventForm = {
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  startTime: '',
  endTime: ''
}

export default function GroupSpaceView({
  space,
  onBack,
  currentUser,
  events: initialEvents = []
}) {
  const effectiveUser = currentUser || localStorage.getItem('username')
  const isOwner = Boolean(space && effectiveUser && space.owner_user === effectiveUser)
  const initialAdmin = Boolean(isOwner || space?.is_admin)

  const [isAdmin, setIsAdmin] = useState(initialAdmin)
  const [events, setEvents] = useState(initialEvents)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Event creation form state (Admin only)
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventForm, setEventForm] = useState(emptyEventForm)
  const [eventMessage, setEventMessage] = useState(null)
  const [submittingEvent, setSubmittingEvent] = useState(false)
  const [schedule, setSchedule] = useState([])
  const [conflicts, setConflicts] = useState([])

  const token = localStorage.getItem('session_token')
  const effectiveGroupId = space?.id || Number(localStorage.getItem('current_space_id'))

  const loadGroupEvents = async () => {
    if (!effectiveGroupId || !token) return
    setLoadingEvents(true)
    try {
      const res = await api.getGroupEvents(token, effectiveGroupId)
      if (res.success) {
        setEvents(res.events || [])
      }
    } catch {
      // Keep existing events
    } finally {
      setLoadingEvents(false)
    }
  }

  useEffect(() => {
    setIsAdmin(Boolean(isOwner || space?.is_admin))
  }, [space, effectiveUser, isOwner])

  const loadSchedule = async () => {
    if (!token) return
    try {
      const res = await api.getSchedule(token)
      if (res.success) {
        setSchedule(res.events || [])
      }
    } catch {
      setSchedule([])
    }
  }

  const updateEventForm = (changes) => {
    setEventForm({ ...eventForm, ...changes })
    setConflicts([])
  }

  useEffect(() => {
    loadGroupEvents()
    loadSchedule()
  }, [effectiveGroupId])

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setEventMessage(null)

    const error = validateEvent(eventForm)
    if (error) {
      setEventMessage({ type: 'error', text: error })
      return
    }

    const found = findConflicts({ start_time: eventForm.startTime, end_time: eventForm.endTime }, schedule)
    if (found.length > 0) {
      setConflicts(found)
      return
    }

    saveGroupEvent()
  }

  const saveGroupEvent = async () => {
    setConflicts([])
    setSubmittingEvent(true)
    try {
      const res = await api.createGroupEvent(token, effectiveGroupId, {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || null,
        category: eventForm.category || null,
        priority: eventForm.priority,
        start_time: eventForm.startTime,
        end_time: eventForm.endTime
      })

      if (res.success) {
        setEventMessage({ type: 'success', text: 'Group event created!' })
        setEventForm(emptyEventForm)
        setShowEventForm(false)
        loadGroupEvents()
        loadSchedule()
      } else {
        setEventMessage({ type: 'error', text: res.error || 'Failed to create group event' })
      }
    } catch {
      setEventMessage({ type: 'error', text: 'Could not create event. Only admins can create events.' })
    } finally {
      setSubmittingEvent(false)
    }
  }

  const currentSpaceName = space?.name || localStorage.getItem('current_space_name')
  const currentSpaceType = space
    ? (space.group_type === 1 ? 'Public' : 'Private')
    : (localStorage.getItem('current_space_type') || 'Private')

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

  const conflictKeys = getConflictKeys(schedule)

  const selectedDateStr = selectedDate.toDateString()
  const eventsOnSelectedDate = events.filter((ev) => {
    const evDate = new Date(ev.start_time).toDateString()
    return evDate === selectedDateStr
  })

  return (
    <div className="group-space-view">
      {onBack && (
        <button type="button" onClick={onBack}>
          Back to Group Spaces
        </button>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>{currentSpaceName}</h2>
        <span>{currentSpaceType}</span>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        Role: <strong>{isAdmin ? 'Admin' : 'Member'}</strong>
      </div>

      {/* CALENDAR & EVENTS SECTION */}
      <div className="group-space-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Calendar & Events</h3>
          {isAdmin && (
            <button
              type="button"
              className="btn-submit"
              style={{ width: 'auto', margin: 0, padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
              onClick={() => setShowEventForm(!showEventForm)}
            >
              {showEventForm ? 'Cancel' : '+ New Event'}
            </button>
          )}
        </div>

        {!isAdmin && (
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.25rem 0 0.75rem' }}>
            ℹ️ Only group admins can create events in this group space.
          </p>
        )}

        {eventMessage && <div className={`message ${eventMessage.type}`}>{eventMessage.text}</div>}

        {showEventForm && isAdmin && (
          <form onSubmit={handleCreateEvent} style={{ marginBottom: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ marginTop: 0 }}>Create Group Event (Admin)</h4>
            <div className="form-group">
              <label>Title</label>
              <input
                name="title"
                value={eventForm.title}
                onChange={(e) => updateEventForm({ title: e.target.value })}
                maxLength={100}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start</label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={eventForm.startTime}
                  onChange={(e) => updateEventForm({ startTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>End</label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={eventForm.endTime}
                  onChange={(e) => updateEventForm({ endTime: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Priority</label>
                <select
                  name="priority"
                  value={eventForm.priority}
                  onChange={(e) => updateEventForm({ priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={eventForm.category}
                  onChange={(e) => updateEventForm({ category: e.target.value })}
                >
                  <option value="">None</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Deadline">Deadline</option>
                  <option value="Project">Project</option>
                  <option value="Social">Social</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={eventForm.description}
                onChange={(e) => updateEventForm({ description: e.target.value })}
                maxLength={500}
                rows={2}
              />
            </div>
            {conflicts.length > 0 ? (
              <ConflictWarning conflicts={conflicts} onConfirm={saveGroupEvent} onCancel={() => setConflicts([])} />
            ) : (
              <button className="btn-submit" type="submit" disabled={submittingEvent}>
                {submittingEvent ? 'Adding Event...' : 'Add Group Event'}
              </button>
            )}
          </form>
        )}

        {/* Group Calendar */}
        <div style={{ margin: '1rem 0' }}>
          <div className="calendar-wrapper" style={{ padding: '10px 0', maxWidth: '450px' }}>
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={({ date, view }) => {
                if (view === 'month') {
                  const dateStr = date.toDateString()
                  const dayEvents = events.filter((ev) => new Date(ev.start_time).toDateString() === dateStr)
                  const hasConflict = dayEvents.some((ev) => conflictKeys.has(eventKey(ev)))
                  return dayEvents.length > 0
                    ? <div style={{ fontSize: '8px', textAlign: 'center', color: hasConflict ? '#dc2626' : '#2563eb' }}>●</div>
                    : null
                }
                return null
              }}
            />
          </div>
          {eventsOnSelectedDate.length > 0 && (
            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#eff6ff', borderRadius: '4px' }}>
              <strong>Events on {selectedDate.toLocaleDateString()}:</strong>
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                {eventsOnSelectedDate.map((ev) => (
                  <li key={ev.event_id || ev.id}>
                    {ev.title} ({formatTime(ev.start_time)} - {formatTime(ev.end_time)})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <h4>All Events</h4>
        {loadingEvents ? (
          <p className="no-events">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="no-events">No events scheduled for this group space yet.</p>
        ) : (
          <ul className="event-list">
            {events.map((event) => (
              <li
                key={event.event_id || event.id}
                className={`event priority-${event.priority || 'medium'} ${conflictKeys.has(eventKey(event)) ? 'event-conflict' : ''}`}
              >
                <div className="event-header">
                  <strong>{event.title}</strong>
                  {event.priority && <span className="priority-tag">{event.priority}</span>}
                </div>
                {event.start_time && event.end_time && (
                  <div className="event-time">
                    {formatTime(event.start_time)} - {formatTime(event.end_time)}
                  </div>
                )}
                {event.category && <div className="event-category">{event.category}</div>}
                {conflictKeys.has(eventKey(event)) && (
                  <div className="conflict-tag">⚠ Overlaps with another event on your schedule</div>
                )}
                {event.description && <p className="event-description">{event.description}</p>}
                {event.created_by && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Created by {event.created_by}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* GROUP TASKS SECTION */}
      <GroupTasks
        groupId={effectiveGroupId}
        isAdmin={isAdmin}
      />

      {/* GROUP GOALS SECTION */}
      <GroupGoals
        groupId={effectiveGroupId}
        isAdmin={isAdmin}
      />

      {/* MEMBERSHIP SECTION */}
      <GroupViewMembership
        groupId={effectiveGroupId}
        groupType={space ? space.group_type : (currentSpaceType === 'Public' ? 1 : 0)}
        isAdmin={isAdmin}
        currentUser={currentUser}
        onRoleDetermined={(adminStatus) => setIsAdmin(adminStatus)}
      />
    </div>
  )
}
