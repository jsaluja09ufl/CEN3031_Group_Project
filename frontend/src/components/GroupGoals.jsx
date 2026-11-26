import { useEffect, useState } from 'react'
import { api } from '../api/client'

const emptyGoalForm = {
  goal_name: '',
  goal_description: '',
  goal_deadline: '',
  goal_scope: 'EVERYONE'
}

export default function GroupGoals({ groupId, isAdmin, currentUser }) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyGoalForm)
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [members, setMembers] = useState([])
  const [progress, setProgress] = useState({})

  const token = localStorage.getItem('session_token')

  const loadGoals = async () => {
    if (!groupId || !token) return
    setLoading(true)
    try {
      const res = await api.getGroupGoals(token, groupId)
      if (res.success) {
        setGoals(res.goals || [])
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to load goals' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error loading group goals' })
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    if (!groupId || !token) return
    try {
      const res = await api.getGroupMembers(token, groupId)
      if (res.success) {
        setMembers(res.members || [])
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error loading group members' })
    }
  }

  const loadProgress = async () => {
    if (!groupId || !token || !isAdmin) return
    try {
      const res = await api.getGoalProgress(token, groupId)
      if (res.success) {
        const byGoal = {}
        res.progress.forEach((item) => {
          byGoal[item.goal_id] = item
        })
        setProgress(byGoal)
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error loading goal progress' })
    }
  }

  useEffect(() => {
    loadGoals()
    loadMembers()
  }, [groupId])

  useEffect(() => {
    loadProgress()
  }, [groupId, isAdmin])

  const isAssignedToMe = (goal) => goal.goal_scope === 'EVERYONE' || goal.goal_scope === currentUser

  const handleToggle = async (goalId) => {
    try {
      const res = await api.toggleGoalCompletion(token, groupId, goalId)
      if (res.success) {
        setGoals((prev) =>
          prev.map((g) => (g.goal_id === goalId ? { ...g, completed: res.completed } : g))
        )
        loadProgress()
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to update goal' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error updating goal' })
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.goal_name.trim()) {
      setMessage({ type: 'error', text: 'Goal name is required' })
      return
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const payload = {
        goal_name: form.goal_name.trim(),
        goal_description: form.goal_description.trim() || null,
        goal_deadline: form.goal_deadline || null,
        goal_scope: form.goal_scope
      }

      const res = await api.createGroupGoal(token, groupId, payload)
      if (res.success) {
        setMessage({ type: 'success', text: 'Goal created successfully!' })
        setForm(emptyGoalForm)
        setShowForm(false)
        loadGoals()
        loadProgress()
      } else {
        setMessage({ type: 'error', text: res.error || res.message || 'Failed to create goal' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error creating goal' })
    } finally {
      setSubmitting(false)
    }
  }

  const formatDeadline = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="group-space-section" style={{ marginTop: '1.5rem' }}>
      <div>
        <h3>Group Goals</h3>
        {isAdmin && !showForm && (
          <button
            type="button"
            className="btn-submit"
            onClick={() => setShowForm(true)}
          >
            Create Goal
          </button>
        )}
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit}>
          <h4>New Goal</h4>
          <div className="form-group">
            <label>Goal Name</label>
            <input
              name="goal_name"
              value={form.goal_name}
              onChange={handleChange}
              placeholder="e.g. Finish Sprint 1"
              maxLength={100}
              required
            />
          </div>

          <div className="form-group">
            <label>Description (optional)</label>
            <textarea
              name="goal_description"
              value={form.goal_description}
              onChange={handleChange}
              placeholder="Details about this goal..."
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Deadline (optional)</label>
              <input
                type="datetime-local"
                name="goal_deadline"
                value={form.goal_deadline}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Scope</label>
              <select name="goal_scope" value={form.goal_scope} onChange={handleChange}>
                <option value="EVERYONE">Everyone</option>
                {members.map((member) => (
                  <option key={member.username} value={member.username}>
                    {member.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <button type="submit" className="btn-submit">
              {submitting ? 'Saving...' : 'Save Goal'}
            </button>
            <button
              type="button"
              className="btn-submit"
              onClick={() => {
                setShowForm(false)
                setForm(emptyGoalForm)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="no-events">Loading goals...</p>
      ) : goals.length === 0 ? (
        <p className="no-events">No group goals set yet.</p>
      ) : (
        <ul className="event-list">
          {goals.map((goal) => (
            <li key={goal.goal_id} className="event">
              <div>
                <strong>{goal.goal_name}</strong>
                : <span>{goal.goal_scope === 'EVERYONE' ? 'everyone' : `assigned to ${goal.goal_scope}`}</span>
              </div>
              {goal.goal_description && (
                <p className="event-description">
                  Description: {goal.goal_description}
                </p>
              )}
              {goal.goal_deadline && (
                <div>
                  Deadline: {formatDeadline(goal.goal_deadline)}
                </div>
              )}

              {isAssignedToMe(goal) && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(goal.completed)}
                    onChange={() => handleToggle(goal.goal_id)}
                    style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                  />
                  {goal.completed ? 'Done' : 'Mark as done'}
                </label>
              )}

              {isAdmin && progress[goal.goal_id] && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#f9fafb', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    <strong>Progress:</strong>{' '}
                    {progress[goal.goal_id].completed_count} of {progress[goal.goal_id].total}{' '}
                    {progress[goal.goal_id].total === 1 ? 'member' : 'members'} done
                  </div>
                  <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(progress[goal.goal_id].completed_count / progress[goal.goal_id].total) * 100}%`,
                        background: '#10b981'
                      }}
                    />
                  </div>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: 0, listStyle: 'none', fontSize: '0.85rem' }}>
                    {progress[goal.goal_id].members.map((member) => (
                      <li key={member.username} style={{ color: member.completed ? '#166534' : '#6b7280' }}>
                        {member.completed ? '✓' : '✗'} {member.username}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

