import { useEffect, useState } from 'react'
import './App.css'
import Login from './components/Login'
import SignUp from './components/SignUp'
import { api } from './api/client'
import Home from './components/Home'

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

  return (
    <div className="card">
      {view === 'home' && (
        <div>
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
