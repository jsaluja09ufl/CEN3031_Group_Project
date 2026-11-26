
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { recordTaskCompletion } from '../../utils/plantState'
import PlantIcon from '../../components/PlantIcon'

function HabitTask({ onOpenPlant, currentUser }) {
  const [entries, setEntries] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('task')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [celebrationToast, setCelebrationToast] = useState(null)

  const sessionToken = localStorage.getItem('session_token')
  const username = currentUser || localStorage.getItem('username') || ''

  useEffect(() => {
    let active = true

    if (!sessionToken) {
      setError('Please log in to manage your habits and tasks.')
      setLoading(false)
      return
    }

    api.getHabitTasks(sessionToken)
      .then((data) => {
        if (active) {
          setEntries(data || [])
          setError('')
        }
      })
      .catch(() => {
        if (active) {
          setError('Unable to load habits and tasks.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [sessionToken])

  async function handleToggleCompletion(entry) {
    const isNowCompleted = !entry.completed
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, completed: isNowCompleted } : e))
    )

    if (isNowCompleted) {
      const result = recordTaskCompletion(username)
      if (result.leveledUp) {
        setCelebrationToast(`🎉 Level Up! Your plant evolved into a ${result.currentStage.name}!`)
      } else {
        setCelebrationToast(`🌱 Task completed! Your plant was watered! 💧`)
      }
      setTimeout(() => setCelebrationToast(null), 3500)
    }

    try {
      if (sessionToken && entry.id) {
        await api.toggleHabitTask(sessionToken, entry.id)
      }
    } catch {
      // Local optimistic state persists
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const cleanTitle = title.trim()

    if (!cleanTitle) {
      setError('Please enter a name for your task or habit.')
      return
    }

    if (!sessionToken) {
      setError('Please log in before creating a task or habit.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const newEntry = await api.createHabitTask(sessionToken, {
        title: cleanTitle,
        description: description.trim(),
        type
      })

      setEntries((previous) => [newEntry, ...previous])
      setTitle('')
      setDescription('')
      setType('task')
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.')
      } else {
        setError('Unable to save your task or habit. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      {celebrationToast && (
        <div className="plant-celebration-toast" role="status">
          {celebrationToast}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>Create a Habit or Task</h2>
        {onOpenPlant && (
          <PlantIcon currentUser={username} onClick={onOpenPlant} />
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="entry-type">Type</label>
          <select
            id="entry-type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="task">Task</option>
            <option value="habit">Habit</option>
          </select>
        </div>

        <div>
          <label htmlFor="entry-title">Name</label>
          <input
            id="entry-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Study for exam"
            maxLength={200}
          />
        </div>

        <div>
          <label htmlFor="entry-description">
            Description (optional)
          </label>
          <textarea
            id="entry-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add details..."
            maxLength={2000}
          />
        </div>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={saving || !sessionToken}>
          {saving
            ? 'Saving...'
            : `Create ${type === 'task' ? 'Task' : 'Habit'}`}
        </button>
      </form>

      <h3>My Habits and Tasks</h3>

      {loading ? (
        <p>Loading...</p>
      ) : entries.length === 0 ? (
        <p>No habits or tasks created yet.</p>
      ) : (
        <ul className="habit-task-list">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`habit-task-item ${entry.completed ? 'is-completed' : ''}`}
            >
              <div className="habit-task-row">
                <input
                  type="checkbox"
                  className="habit-task-checkbox"
                  checked={!!entry.completed}
                  onChange={() => handleToggleCompletion(entry)}
                  aria-label={`Mark ${entry.title} as ${entry.completed ? 'incomplete' : 'completed'}`}
                />
                <div className="habit-task-details">
                  <div className="habit-task-header">
                    <strong
                      className="habit-task-title"
                      style={{
                        textDecoration: entry.completed ? 'line-through' : 'none',
                        color: entry.completed ? '#6b7280' : 'inherit'
                      }}
                    >
                      {entry.title}
                    </strong>
                    <span
                      className="priority-tag"
                      style={{
                        background: entry.type === 'habit' ? '#ede9fe' : '#e0f2fe',
                        color: entry.type === 'habit' ? '#6d28d9' : '#0369a1',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase'
                      }}
                    >
                      {entry.type}
                    </span>
                  </div>
                  {entry.description && (
                    <p
                      className="habit-task-desc"
                      style={{
                        margin: '0.25rem 0 0',
                        fontSize: '0.9rem',
                        color: entry.completed ? '#9ca3af' : '#4b5563',
                        textDecoration: entry.completed ? 'line-through' : 'none'
                      }}
                    >
                      {entry.description}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default HabitTask
