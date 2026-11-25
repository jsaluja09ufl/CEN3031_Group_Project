import { useEffect, useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { api } from '../../api/client'
import { validateEvent } from '../../utils/validateEvent'

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

export default function GroupSpace({ currentUser }) {
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupDetails, setGroupDetails] = useState(null)
  const [tasks, setTasks] = useState([])
  const [events, setEvents] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())

  // New Group Space Form state
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [groupError, setGroupError] = useState('')

  // New Group Task Form state (Admin only)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskMessage, setTaskMessage] = useState(null)

  // New Group Event Form state (Admin only)
  const [eventForm, setEventForm] = useState(emptyEventForm)
  const [eventMessage, setEventMessage] = useState(null)

  // Add Member state (Admin only)
  const [memberUsername, setMemberUsername] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [memberMessage, setMemberMessage] = useState(null)

  // Active sub-tab in group: 'all', 'tasks', 'events'
  const [activeTab, setActiveTab] = useState('all')

  const sessionToken = localStorage.getItem('session_token')

  const loadGroups = () => {
    if (!sessionToken) return
    api.getGroups(sessionToken)
      .then((res) => {
        if (res.success) {
          setGroups(res.groups || [])
        }
      })
      .catch(() => setGroups([]))
  }

  const loadGroupData = (groupId) => {
    if (!sessionToken) return

    api.getGroup(sessionToken, groupId)
      .then((res) => {
        if (res.success) {
          setGroupDetails(res)
        }
      })
      .catch(() => {})

    api.getGroupTasks(sessionToken, groupId)
      .then((res) => {
        if (res.success) {
          setTasks(res.tasks || [])
        }
      })
      .catch(() => setTasks([]))

    api.getGroupEvents(sessionToken, groupId)
      .then((res) => {
        if (res.success) {
          setEvents(res.events || [])
        }
      })
      .catch(() => setEvents([]))
  }

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    if (selectedGroup) {
      loadGroupData(selectedGroup.group_id)
    }
  }, [selectedGroup])

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    setGroupError('')

    const name = newGroupName.trim()
    if (!name) {
      setGroupError('Group name is required')
      return
    }

    try {
      const res = await api.createGroup(sessionToken, {
        name,
        description: newGroupDescription.trim()
      })
      if (res.success) {
        setNewGroupName('')
        setNewGroupDescription('')
        loadGroups()
        setSelectedGroup(res.group)
      } else {
        setGroupError(res.error || 'Failed to create group')
      }
    } catch {
      setGroupError('Unable to create group space')
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    setTaskMessage(null)

    const title = taskTitle.trim()
    if (!title) {
      setTaskMessage({ type: 'error', text: 'Task title is required' })
      return
    }

    try {
      const res = await api.createGroupTask(sessionToken, selectedGroup.group_id, {
        title,
        description: taskDescription.trim()
      })
      if (res.success) {
        setTaskMessage({ type: 'success', text: 'Task created successfully!' })
        setTaskTitle('')
        setTaskDescription('')
        loadGroupData(selectedGroup.group_id)
      } else {
        setTaskMessage({ type: 'error', text: res.error || 'Failed to create task' })
      }
    } catch (err) {
      const errorDetail = err.response?.data?.detail || 'Could not create task. Only admins can create tasks.'
      setTaskMessage({ type: 'error', text: errorDetail })
    }
  }

  const handleToggleTask = async (taskId) => {
    try {
      const res = await api.toggleGroupTask(sessionToken, selectedGroup.group_id, taskId)
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.task_id === taskId ? { ...t, completed: res.task.completed } : t))
        )
      }
    } catch {}
  }

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setEventMessage(null)

    const validationError = validateEvent(eventForm)
    if (validationError) {
      setEventMessage({ type: 'error', text: validationError })
      return
    }

    try {
      const res = await api.createGroupEvent(sessionToken, selectedGroup.group_id, {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || '',
        category: eventForm.category || '',
        priority: eventForm.priority,
        start_time: eventForm.startTime,
        end_time: eventForm.endTime
      })
      if (res.success) {
        setEventMessage({ type: 'success', text: 'Group event created!' })
        setEventForm(emptyEventForm)
        loadGroupData(selectedGroup.group_id)
      } else {
        setEventMessage({ type: 'error', text: res.error || 'Failed to create group event' })
      }
    } catch (err) {
      const errorDetail = err.response?.data?.detail || 'Could not create event. Only admins can create events.'
      setEventMessage({ type: 'error', text: errorDetail })
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    setMemberMessage(null)

    const user = memberUsername.trim()
    if (!user) {
      setMemberMessage({ type: 'error', text: 'Username is required' })
      return
    }

    try {
      const res = await api.addGroupMember(sessionToken, selectedGroup.group_id, {
        username: user,
        role: memberRole
      })
      if (res.success) {
        setMemberMessage({ type: 'success', text: `Added ${user} as ${memberRole}!` })
        setMemberUsername('')
        loadGroupData(selectedGroup.group_id)
      } else {
        setMemberMessage({ type: 'error', text: res.error || 'Failed to add member' })
      }
    } catch (err) {
      const errorDetail = err.response?.data?.detail || 'Failed to add member. Only admins can add members.'
      setMemberMessage({ type: 'error', text: errorDetail })
    }
  }

  const isAdmin = groupDetails?.is_admin || selectedGroup?.is_admin || selectedGroup?.admin_username === currentUser

  // Filter events for selected date on calendar
  const selectedDateStr = selectedDate.toDateString()
  const eventsOnSelectedDate = events.filter((ev) => {
    const evDate = new Date(ev.start_time).toDateString()
    return evDate === selectedDateStr
  })

  return (
    <div className="group-space-container">
      {!selectedGroup ? (
        <div>
          <h2>Group Spaces</h2>
          <p>Collaborate with your team. Admins can create and manage tasks and events for the group.</p>

          <form onSubmit={handleCreateGroup} style={{ marginBottom: '2rem' }}>
            <h3>Create a Group Space</h3>
            <div className="form-group">
              <label htmlFor="group-name">Group Name</label>
              <input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. CEN3031 Project Team"
                maxLength={100}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="group-desc">Description (optional)</label>
              <textarea
                id="group-desc"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Describe the purpose of this group..."
                maxLength={500}
                rows={2}
              />
            </div>
            {groupError && <div className="message error">{groupError}</div>}
            <button className="btn-submit" type="submit">Create Group Space</button>
          </form>

          <h3>Your Group Spaces</h3>
          {groups.length === 0 ? (
            <p className="no-events">You are not a member of any group spaces yet.</p>
          ) : (
            <div className="group-list">
              {groups.map((grp) => (
                <div key={grp.group_id} className="group-card">
                  <div className="group-card-header">
                    <h4>{grp.name}</h4>
                    <span className={`badge ${grp.is_admin ? 'badge-admin' : 'badge-member'}`}>
                      {grp.is_admin ? '👑 Admin' : 'Member'}
                    </span>
                  </div>
                  {grp.description && <p className="event-description">{grp.description}</p>}
                  <p className="event-category">Admin: {grp.admin_username}</p>
                  <button
                    className="btn-submit"
                    style={{ marginTop: '0.5rem', width: 'auto' }}
                    onClick={() => setSelectedGroup(grp)}
                  >
                    Enter Group Space →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            type="button"
            style={{ marginBottom: '1rem', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}
            onClick={() => {
              setSelectedGroup(null)
              setGroupDetails(null)
              loadGroups()
            }}
          >
            ← Back to All Group Spaces
          </button>

          <div className="group-header-banner">
            <div>
              <h2>{selectedGroup.name}</h2>
              {selectedGroup.description && <p>{selectedGroup.description}</p>}
              <p className="event-category">Admin: <strong>{selectedGroup.admin_username}</strong></p>
            </div>
            <div>
              <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-member'}`}>
                {isAdmin ? '👑 You are an Admin' : 'You are a Member'}
              </span>
            </div>
          </div>

          {/* Admin Member Management */}
          {isAdmin && (
            <details style={{ marginBottom: '1.5rem', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '4px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Manage Group Members</summary>
              <form onSubmit={handleAddMember} style={{ marginTop: '0.75rem' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Add Username</label>
                    <input
                      value={memberUsername}
                      onChange={(e) => setMemberUsername(e.target.value)}
                      placeholder="Username"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <button className="btn-submit" type="submit" style={{ width: 'auto' }}>Add Member</button>
                {memberMessage && <div className={`message ${memberMessage.type}`}>{memberMessage.text}</div>}
              </form>

              {groupDetails?.members && groupDetails.members.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4>Members:</h4>
                  <ul style={{ paddingLeft: '1.25rem' }}>
                    {groupDetails.members.map((m) => (
                      <li key={m.username}>
                        {m.username} ({m.role})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </details>
          )}

          {/* Navigation Sub-Tabs */}
          <div className="group-tabs">
            <button
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Overview
            </button>
            <button
              className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              Tasks ({tasks.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              Events ({events.length})
            </button>
          </div>

          {/* TASKS SECTION */}
          {(activeTab === 'all' || activeTab === 'tasks') && (
            <section className="group-section">
              <h3>Group Tasks</h3>

              {isAdmin ? (
                <form onSubmit={handleCreateTask} style={{ marginBottom: '1.5rem' }}>
                  <h4>Create Task (Admin)</h4>
                  <div className="form-group">
                    <label>Task Title</label>
                    <input
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Write integration tests"
                      maxLength={200}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Task Description (optional)</label>
                    <textarea
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Add details for the team..."
                      maxLength={2000}
                      rows={2}
                    />
                  </div>
                  <button className="btn-submit" type="submit">Add Group Task</button>
                  {taskMessage && <div className={`message ${taskMessage.type}`}>{taskMessage.text}</div>}
                </form>
              ) : (
                <div className="admin-notice">
                  ℹ️ Only group admins can create tasks in this group space.
                </div>
              )}

              <h4>Current Tasks</h4>
              {tasks.length === 0 ? (
                <p className="no-events">No tasks created yet in this group space.</p>
              ) : (
                <ul className="group-task-list">
                  {tasks.map((task) => (
                    <li key={task.task_id} className={`group-task-item ${task.completed ? 'completed' : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task.task_id)}
                          style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                        />
                        <div>
                          <strong style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                            {task.title}
                          </strong>
                          {task.description && (
                            <p style={{ margin: '0.25rem 0 0', color: '#4b5563', fontSize: '0.9rem' }}>
                              {task.description}
                            </p>
                          )}
                          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            Created by {task.created_by}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* EVENTS SECTION */}
          {(activeTab === 'all' || activeTab === 'events') && (
            <section className="group-section" style={{ marginTop: '2rem' }}>
              <h3>Group Events</h3>

              {isAdmin ? (
                <form onSubmit={handleCreateEvent} style={{ marginBottom: '1.5rem' }}>
                  <h4>Create Event (Admin)</h4>
                  <div className="form-group">
                    <label>Event Title</label>
                    <input
                      name="title"
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
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
                        onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End</label>
                      <input
                        type="datetime-local"
                        name="endTime"
                        value={eventForm.endTime}
                        onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
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
                        onChange={(e) => setEventForm({ ...eventForm, priority: e.target.value })}
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
                        onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                      >
                        <option value="">None</option>
                        <option value="Project">Project</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Deadline">Deadline</option>
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
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      maxLength={500}
                      rows={2}
                    />
                  </div>
                  <button className="btn-submit" type="submit">Add Group Event</button>
                  {eventMessage && <div className={`message ${eventMessage.type}`}>{eventMessage.text}</div>}
                </form>
              ) : (
                <div className="admin-notice">
                  ℹ️ Only group admins can create events in this group space.
                </div>
              )}

              {/* Group Space Calendar View */}
              <div style={{ margin: '1.5rem 0' }}>
                <h4>Group Calendar Schedule</h4>
                <div className="calendar-wrapper" style={{ padding: '10px 0', maxWidth: '450px' }}>
                  <Calendar
                    onChange={setSelectedDate}
                    value={selectedDate}
                    tileContent={({ date, view }) => {
                      if (view === 'month') {
                        const dateStr = date.toDateString()
                        const hasEvent = events.some((ev) => new Date(ev.start_time).toDateString() === dateStr)
                        return hasEvent ? <div style={{ fontSize: '8px', textAlign: 'center', color: '#2563eb' }}>●</div> : null
                      }
                      return null
                    }}
                  />
                </div>
                {eventsOnSelectedDate.length > 0 && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#eff6ff', borderRadius: '4px' }}>
                    <strong>Events on {selectedDate.toLocaleDateString()}:</strong>
                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                      {eventsOnSelectedDate.map((ev) => (
                        <li key={ev.event_id}>
                          {ev.title} ({formatTime(ev.start_time)} - {formatTime(ev.end_time)})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <h4>All Group Events</h4>
              {events.length === 0 ? (
                <p className="no-events">No events scheduled in this group space.</p>
              ) : (
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
                      <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#6b7280' }}>
                        Created by {event.created_by}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
