import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function GroupViewMembership({ groupId, isAdmin, currentUser, onRoleDetermined }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [promotingUser, setPromotingUser] = useState(null)

  const token = localStorage.getItem('session_token')
  const effectiveUsername = currentUser || localStorage.getItem('username')

  const fetchMembers = async () => {
    if (!token || !groupId) return
    setLoading(true)
    try {
      const res = await api.getGroupMembers(token, groupId)
      if (res.success && res.members) {
        setMembers(res.members)
        const myRecord = res.members.find((m) => m.username === effectiveUsername)
        if (myRecord && onRoleDetermined) {
          onRoleDetermined(Boolean(myRecord.is_admin || myRecord.is_owner))
        }
      } else {
        setMessage({ type: 'error', text: res.error || res.message || 'Failed to load members' })
      }
    } catch (err) {
      console.error('Failed to load group members:', err)
      setMessage({ type: 'error', text: err?.response?.data?.error || err?.message || 'Network error loading members' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [groupId])

  // Derive admin status strictly from membership list when loaded, otherwise fallback to prop
  const currentMember = members.find((m) => m.username === effectiveUsername)
  const userIsAdmin = currentMember
    ? Boolean(currentMember.is_admin || currentMember.is_owner)
    : Boolean(isAdmin)

  const handleMakeAdmin = async (targetUsername) => {
    if (!token || !groupId || promotingUser) return
    setPromotingUser(targetUsername)
    setMessage(null)
    try {
      const res = await api.addGroupAdmin(token, groupId, targetUsername)
      if (res.success) {
        setMessage({ type: 'success', text: `${targetUsername} is now an admin!` })
        fetchMembers()
      } else {
        setMessage({ type: 'error', text: res.error || res.message || 'Failed to promote member' })
      }
    } catch (err) {
      console.error('Failed to promote member:', err)
      setMessage({ type: 'error', text: err?.response?.data?.error || err?.message || 'Network error updating member role' })
    } finally {
      setPromotingUser(null)
    }
  }

  return (
    <div className="group-space-section">
      <div >
        <h3>Group Members</h3>
        <span>
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="no-events">Loading members...</p>
      ) : members.length === 0 ? (
        <p className="no-events">No members found in this group space.</p>
      ) : (
        <ul className="event-list">
          {members.map((member) => (
            <li
              key={member.username}
              className="event"
            >
              <div>
                <strong>{member.username}</strong>
                {member.username === effectiveUsername && (
                  <span> (you)</span>
                )}
                <div>
                  <span>
                    {member.is_owner ? 'Owner' : member.is_admin ? 'Admin' : 'Member'}
                  </span>
                </div>
              </div>

              {userIsAdmin && !member.is_admin && !member.is_owner && member.username !== effectiveUsername && (
                <button
                  type="button"
                  className="btn-submit"
                  disabled={promotingUser === member.username}
                  onClick={() => handleMakeAdmin(member.username)}
                >
                  {promotingUser === member.username ? 'Updating...' : 'Make Admin'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

