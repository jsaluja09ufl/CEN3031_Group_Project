import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function GroupTasks({ groupId, isAdmin }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const token = localStorage.getItem('session_token')

  const loadTasks = async () => {
    if (!groupId || !token) return
    setLoading(true)
    try {
      const res = await api.getGroupTasks(token, groupId)
      if (res.success) {
        setTasks(res.tasks || [])
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to load tasks' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error loading group tasks' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [groupId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setMessage({ type: 'error', text: 'Task title is required' })
      return
    }

    setSubmitting(true)
    try {
      const res = await api.createGroupTask(token, groupId, {
        title: cleanTitle,
        description: description.trim()
      })
      if (res.success) {
        setMessage({ type: 'success', text: 'Task created successfully!' })
        setTitle('')
        setDescription('')
        setShowForm(false)
        loadTasks()
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to create task' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not create task. Only admins can create tasks.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (taskId) => {
    try {
      const res = await api.toggleGroupTask(token, groupId, taskId)
      if (res.success) {
        setTasks((prev) =>
          prev.map((t) => (t.task_id === taskId ? { ...t, completed: res.task.completed } : t))
        )
      }
    } catch {}
  }

  return (
    <div className="group-space-section" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>Group Tasks</h3>
        {isAdmin && (
          <button
            type="button"
            className="btn-submit"
            style={{ width: 'auto', margin: 0, padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ New Task'}
          </button>
        )}
      </div>

      {!isAdmin && (
        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0.25rem 0 0.75rem' }}>
          ℹ️ Only group admins can create tasks in this group space.
        </p>
      )}

      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ marginTop: 0 }}>Create Group Task (Admin)</h4>
          <div className="form-group">
            <label>Task Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Prepare presentation slides"
              maxLength={200}
              required
            />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details about this task..."
              maxLength={2000}
              rows={2}
            />
          </div>
          <button className="btn-submit" type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Add Group Task'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="no-events">Loading group tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="no-events">No tasks created for this group space yet.</p>
      ) : (
        <ul className="event-list">
          {tasks.map((task) => (
            <li
              key={task.task_id}
              className="event"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                borderLeftColor: task.completed ? '#10b981' : '#3b82f6'
              }}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task.task_id)}
                style={{ marginTop: '0.25rem', width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <strong style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                  {task.title}
                </strong>
                {task.description && (
                  <p className="event-description" style={{ margin: '0.25rem 0' }}>
                    {task.description}
                  </p>
                )}
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Created by {task.created_by}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
