import { useEffect, useState } from 'react'
import './App.css'
import Login from './components/Login'
import SignUp from './components/SignUp'
import EventForm from './components/EventForm'
import EventList from './components/EventList'
import { api } from './api/client'
import Home from './components/Home'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [view, setView] = useState('login')
  const [events, setEvents] = useState([])

  const loadEvents = () => {
    api.getEvents(localStorage.getItem('session_token'))
      .then((res) => {
        if (res.success) setEvents(res.events)
      })
      .catch(() => setEvents([]))
  }

  useEffect(() => {
    const sessionToken = localStorage.getItem('session_token')
    if (sessionToken) {
      api.validatUser(sessionToken)
        .then((res) => {
          if (res.success) {
            setCurrentUser(res.session.username)
            setView('home')
          } else {
            localStorage.removeItem('session_token')
            setView('login')
          }
        })
        .catch(() => setView('login'))
    }
  }, [])

  useEffect(() => {
    if (view === 'home') loadEvents()
  }, [view])

  return (
    <div className="card">
      {view === 'home' && (
        <div>
          <div className="home-header">
            <h2>Welcome, {currentUser}!</h2>
            <button
              className="btn-submit"
              onClick={() => {
                localStorage.removeItem('session_token')
                setCurrentUser(null)
                setEvents([])
                setView('login')
              }}
            >
              Log Out
            </button>
          </div>
          <EventForm onEventCreated={loadEvents} />
          <h2>Your Events</h2>
          <EventList events={events} />
          <Home username={currentUser} />
          <button
            className="btn-submit"
            onClick={() => {
              localStorage.removeItem('session_token')
              setCurrentUser(null)
              setView('login')
            }}
          >
            Log Out
          </button>
        </div>
      )}

      {view === 'login' && (
        <div>
          <Login onLoginSuccess={(res) => {
            setCurrentUser(res.username)
            localStorage.setItem('session_token', res.session_token)
            setView('home')
          }} />
          <p style={{ marginTop: '1rem', textAlign: 'center' }}>
            Don't have an account?{' '}
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}
              onClick={() => setView('signup')}
            >
              Sign Up
            </button>
          </p>
        </div>
      )}

      {view === 'signup' && (
        <div>
          <SignUp onSignUpSuccess={() => setView('login')} />
          <p style={{ marginTop: '1rem', textAlign: 'center' }}>
            Already have an account?{' '}
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}
              onClick={() => setView('login')}
            >
              Log In
            </button>
          </p>
        </div>
      )}
    </div>
  )
}

export default App
