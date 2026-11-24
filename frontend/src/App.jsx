
import { useEffect, useState } from 'react'
import './App.css'
import Login from './components/Login'
import SignUp from './components/SignUp'
import HabitTask from './features/habitTask/HabitTask'
import EventForm from './components/EventForm'
import EventList from './components/EventList'
import { api } from './api/client'
import Home from './components/Home'
import GroupSpaceBrowse from './components/GroupSpaceBrowse'
import GroupSpaceCreationForm from './components/GroupSpaceCreationForm'
import GroupSpaceView from './components/GroupSpaceView'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [view, setView] = useState('login')
  const [events, setEvents] = useState([])
  const [selectedGroupSpace, setSelectedGroupSpace] = useState(null)

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

  const handleLogout = () => {
    localStorage.removeItem('session_token')
    localStorage.removeItem('username')
    localStorage.removeItem('is_admin')
    localStorage.removeItem('current_space_id')
    localStorage.removeItem('current_space_name')
    localStorage.removeItem('current_space_type')
    setCurrentUser(null)
    setView('login')
  }
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
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn-submit"
              onClick={() => setView('groupSpaces')}
            >
              Group Spaces
            </button>
            <button
              type="button"
              className="btn-submit"
              onClick={() => setView('habitTasks')}
            >
              Habits & Tasks
            </button>
          </div>

          <button
            type="button"
            className="btn-submit"
            style={{ background: '#4b5563' }}
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      )}

      {view === 'groupSpaces' && (
        <GroupSpaceBrowse
          currentUser={currentUser}
          onBack={() => setView('home')}
          onCreateClick={() => setView('createGroupSpace')}
          onSelectSpace={(space) => {
            setSelectedGroupSpace(space)
            setView('groupSpaceView')
          }}
        />
      )}

      {view === 'createGroupSpace' && (
        <GroupSpaceCreationForm
          onCancel={() => setView('groupSpaces')}
          onGroupSpaceCreated={() => {
            setView('groupSpaces')
          }}
        />
      )}

      {view === 'groupSpaceView' && (
        <GroupSpaceView
          space={selectedGroupSpace}
          currentUser={currentUser}
          onBack={() => setView('groupSpaces')}
        />
      )}

      {view === 'habitTasks' && (
        <div>
          <button
            type="button"
            onClick={() => setView('home')}
          >
            ← Back to Home
          </button>

          <HabitTask />
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
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer'
              }}
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
