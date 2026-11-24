import { useState } from 'react'
import { api } from '../api/client'
import { validateGroupSpace } from '../utils/validateGroupSpace'

const emptyForm = {
  group_name: '',
  group_type: 0
}

export default function GroupSpaceCreationForm({ onGroupSpaceCreated, onCancel }) {
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({
      ...form,
      [name]: name === 'group_type' ? Number(value) : value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    const error = validateGroupSpace(form)
    if (error) {
      setMessage({ type: 'error', text: error })
      return
    }

    const sessionToken = localStorage.getItem('session_token')
    if (!sessionToken) {
      setMessage({ type: 'error', text: 'Please log in to create a group space.' })
      return
    }

    try {
      const result = await api.createGroupSpace(sessionToken, {
        name: form.group_name.trim(),
        group_type: Number(form.group_type)
      })
      if (result.success) {
        setMessage({ type: 'success', text: `Group Space created!` })
        localStorage.setItem('current_space_id', result.id)
        localStorage.setItem('current_space_name', form.group_name.trim())
        localStorage.setItem('current_space_type', Number(form.group_type) === 1 ? 'Public' : 'Private')
        setForm(emptyForm)
        if (onGroupSpaceCreated) onGroupSpaceCreated(result)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to create Group Space' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not create group space. Check the fields or make sure the backend is running.' })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {onCancel && (
        <button type="button" onClick={onCancel}>
          Back to Group Space List
        </button>
      )}
      <h2>New Group Space</h2>
      <div className="form-group">
        <label>Group Name</label>
        <input
          name="group_name"
          value={form.group_name}
          onChange={handleChange}
          maxLength={100}
          placeholder="e.g. Study Group"
          required
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Group Type</label>
          <select name="group_type" value={form.group_type} onChange={handleChange}>
            <option value={0}>Private</option>
            <option value={1}>Public</option>
          </select>
        </div>
      </div>
      <div>
        <button className="btn-submit" type="submit">Create Group Space</button>
        {onCancel && (
          <button type="button" className="btn-submit" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
    </form>
  )
}
