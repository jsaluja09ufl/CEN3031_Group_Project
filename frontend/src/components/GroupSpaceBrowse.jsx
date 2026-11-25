import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function GroupSpaceBrowse({
  onSelectSpace,
  onCreateClick,
  onBack
}) {
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [invites, setInvites] = useState([])
  const [respondingId, setRespondingId] = useState(null)

  const token = localStorage.getItem('session_token')

  const loadSpaces = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await api.getUserGroupSpaces(token)
      if (res.success) {
        setSpaces(res.user_group_spaces || [])
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to load group spaces' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not connect to server to load spaces' })
    } finally {
      setLoading(false)
    }
  }

  const loadInvites = async () => {
    if (!token) return
    try {
      const res = await api.getGroupInvites(token)
      if (res.success) {
        setInvites(res.invites || [])
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not connect to server to load invites' })
    }
  }

  const handleRespond = async (groupId, accept) => {
    setRespondingId(groupId)
    setMessage(null)
    try {
      const res = await api.respondToInvite(token, groupId, accept)
      if (res.success) {
        setMessage({ type: 'success', text: accept ? 'You joined the group space!' : 'Invite declined' })
        loadInvites()
        if (accept) loadSpaces()
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to respond to invite' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error responding to invite' })
    } finally {
      setRespondingId(null)
    }
  }

  useEffect(() => {
    loadSpaces()
    loadInvites()
  }, [])

  return (
    <div className="group-space-browse">
      <div className="home-header" style={{ marginBottom: '1rem' }}>
        {onBack && (
          <button type="button" onClick={onBack} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#2563eb', fontSize: '0.95rem' }}>
            ← Back to Home
          </button>
        )}
        <h2 style={{ margin: 0 }}>Group Spaces</h2>
        {onCreateClick && (
          <button type="button" className="btn-submit" style={{ width: 'auto', marginTop: 0 }} onClick={onCreateClick}>
            + Create Group
          </button>
        )}
      </div>

      {message && <div className={`message ${message.type}`} style={{ marginBottom: '1rem' }}>{message.text}</div>}

      {invites.length > 0 && (
        <>
          <h3>Pending Invites</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            {invites.map((invite) => (
              <div key={invite.group_id} className="event">
                <div>
                  <strong>{invite.name}</strong>
                  <span> : invited by {invite.invited_by}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-submit"
                    disabled={respondingId === invite.group_id}
                    onClick={() => handleRespond(invite.group_id, true)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn-submit"
                    style={{ background: '#4b5563' }}
                    disabled={respondingId === invite.group_id}
                    onClick={() => handleRespond(invite.group_id, false)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3>My Spaces</h3>
      {loading ? (
        <p className="no-events">Loading your spaces...</p>
      ) : spaces.length === 0 ? (
        <p className="no-events">You haven't created any group spaces yet. Click "Create Group" to get started!</p>
      ) : (
        <div className="group-spaces-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {spaces.map((space) => {
            return (
              <div
                key={space.id}
                className="event"
              >
                <div>
                  <div>
                    <strong>{space.name}</strong>
                    <span
                    >
                      : {space.group_type === 1 ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-submit"
                  onClick={() => onSelectSpace && onSelectSpace(space)}
                >
                  Enter Space
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
