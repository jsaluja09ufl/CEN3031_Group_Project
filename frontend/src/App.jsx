
import { useEffect, useState } from 'react'
import './App.css'
import Login from './components/Login'
import SignUp from './components/SignUp'
import HabitTask from './features/habitTask/HabitTask'
import { api } from './api/client'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [view, setView] = useState('login')

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
    setCurrentUser(null)
    setView('login')
  }

  return (
    <div className="card">

      {view === 'home' && (
        <div>
          <h2>Welcome, {currentUser}!</h2>

          <button
            type="button"
            className="btn-submit"
            onClick={() => setView('habitTasks')}
          >
            Habits & Tasks
          </button>

          <button
            type="button"
            className="btn-submit"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
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
          <Login
            onLoginSuccess={() => {
              setView('home')
              api.validatUser(localStorage.getItem('session_token'))
                .then((res) => {
                  if (res.success) {
                    setCurrentUser(res.session.username)
                  }
                })
                .catch(() => {})
            }}
          />

          <p style={{ marginTop: '1rem', textAlign: 'center' }}>
            Don't have an account?{' '}
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer'
              }}
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
