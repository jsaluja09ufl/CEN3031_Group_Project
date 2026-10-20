import { useState } from 'react'
import { api } from '../api/client'

export default function SignUp({ onSignUpSuccess }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    re_enter_pass: ''
  })
  const [message, setMessage] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    try {
      if (form.password !== form.re_enter_pass) {
        setMessage({ type: 'error', text: 'Passwords do not match' })
        return
      }
      const result = await api.createUser(form)
      if (result.success) {
        setMessage({ type: 'success', text: 'Registration successful! You can now log in.' })
        if (onSignUpSuccess) {
          setTimeout(() => onSignUpSuccess(), 1000)
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to register' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error or backend unreachable.' })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Sign Up</h2>
      <div className="form-group">
        <label>Username</label>
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Re-enter Password</label>
        <input
          type="password"
          name="re_enter_pass"
          value={form.re_enter_pass}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>First Name</label>
        <input
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Last Name</label>
        <input
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>
      <button className="btn-submit" type="submit">Sign Up</button>
      {message && <div className={`message ${message.type}`}>{message.text}</div>}
    </form>
  )
}
