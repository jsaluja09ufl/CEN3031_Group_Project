import { useState } from 'react'
import { api } from '../api/client'

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    const result = await api.login(username, password)
    if (result.success) {
      localStorage.setItem('session_token', result.session_token)
      setMessage({ type: 'success', text: 'Login successful!' })
      if (onLoginSuccess) onLoginSuccess(result.session_token)
    } else {
      setMessage({ type: 'error', text: result.error})
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Log In</h2>
      <div className="form-group">
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button className="btn-submit" type="submit">Log In</button>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
    </form>
  )
}
