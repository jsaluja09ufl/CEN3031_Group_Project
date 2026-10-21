import { useState } from 'react'
import { api } from '../api/client'
import { validateEvent } from '../utils/validateEvent'

const emptyForm = {
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  startTime: '',
  endTime: ''
}

export default function EventForm({ onEventCreated }) {
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    const error = validateEvent(form)
    if (error) {
      setMessage({ type: 'error', text: error })
      return
    }

    try {
      const result = await api.createEvent(localStorage.getItem('session_token'), {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category || null,
        priority: form.priority,
        start_time: form.startTime,
        end_time: form.endTime
      })
      if (result.success) {
        setMessage({ type: 'success', text: 'Event created!' })
        setForm(emptyForm)
        if (onEventCreated) onEventCreated()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to create event' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not create event. Check the fields or make sure the backend is running.' })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>New Event</h2>
      <div className="form-group">
        <label>Title</label>
        <input name="title" value={form.title} onChange={handleChange} maxLength={100} required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Start</label>
          <input type="datetime-local" name="startTime" value={form.startTime} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>End</label>
          <input type="datetime-local" name="endTime" value={form.endTime} onChange={handleChange} required />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Priority</label>
          <select name="priority" value={form.priority} onChange={handleChange}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="form-group">
          <label>Category</label>
          <select name="category" value={form.category} onChange={handleChange}>
            <option value="">None</option>
            <option value="School">School</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="Health">Health</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} maxLength={500} rows={3} />
      </div>
      <button className="btn-submit" type="submit">Add Event</button>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
    </form>
  )
}
