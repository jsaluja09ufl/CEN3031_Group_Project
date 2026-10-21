
import { useEffect, useState } from 'react'
import { api } from '../../api/client'

function HabitTask() {
  const [entries, setEntries] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('task')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const sessionToken = localStorage.getItem('session_token')

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
          setEntries(data)
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
      <h2>Create a Habit or Task</h2>

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
        <ul>
          {entries.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.title}</strong> ({entry.type})
              {entry.description && <p>{entry.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default HabitTask
