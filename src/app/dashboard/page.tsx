'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Crew {
  id: string
  name: string
  inviteCode: string
  creatorId: string
  createdAt: string
}

interface UserProfile {
  id: string
  username: string
  email: string
  balance: number
  createdAt: string
}

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [crews, setCrews] = useState<Crew[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [newCrewName, setNewCrewName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')

  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch current profile
      const userRes = await fetch('/api/auth/me')
      const userData = await userRes.json()
      if (!userRes.ok || !userData.user) {
        router.push('/')
        return
      }
      setUser(userData.user)

      // 2. Fetch user crews
      const crewsRes = await fetch('/api/crews')
      const crewsData = await crewsRes.json()
      if (crewsRes.ok) {
        setCrews(crewsData.crews || [])
      } else {
        setError(crewsData.error || 'Failed to load Crews.')
      }
    } catch (err) {
      console.error(err)
      setError('An error occurred loading your dashboard.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCrew = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setModalLoading(true)

    try {
      const res = await fetch('/api/crews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCrewName }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create Crew.')
      }

      setCrews([data.crew, ...crews])
      setShowCreateModal(false)
      setNewCrewName('')
      
      // Redirect to the newly created crew page
      router.push(`/crew/${data.crew.id}`)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setModalLoading(false)
    }
  }

  const handleJoinCrew = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setModalLoading(true)

    try {
      const res = await fetch('/api/crews/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join Crew.')
      }

      setShowJoinModal(false)
      setInviteCode('')
      
      // Redirect to the joined crew page
      router.push(`/crew/${data.crewId}`)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setModalLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#120A08',
      }}>
        <div className="text-gold" style={{ fontSize: '20px', fontWeight: 'bold' }}>Entering Lounge...</div>
      </div>
    )}

  return (
    <div className="dashboard-layout">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="container navbar-container">
          <Link href="/dashboard" className="logo">
            <span className="gold-coin"></span>
            <span className="text-gold logo-text">Don't Bet On It</span>
          </Link>
          <div className="nav-user">
            {user && (
              <>
                <div className="nav-balance">
                  <span className="gold-coin"></span>
                  <span className="text-gold">{user.balance.toLocaleString()}</span>
                  <span className="nav-balance-label" style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '2px' }}>Betcoins</span>
                </div>
                <Link href="/profile" className="btn btn-text nav-profile-link" style={{ fontSize: '14px', fontWeight: '600', padding: '8px 12px' }}>
                  @{user.username}
                </Link>
                <button onClick={handleLogout} className="btn btn-text nav-logout-btn" style={{ fontSize: '14px' }}>
                  Log Out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{ flex: 1, padding: '40px 24px' }}>
        {error && <div className="alert alert-error" style={{ marginBottom: '32px' }}>{error}</div>}

        {/* Welcome Section */}
        <div className="welcome-banner">
          <div>
            <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
              Welcome back, <span className="text-gold">{user?.username}</span>!
            </h1>
            <p className="text-muted" style={{ fontSize: '15px' }}>
              You are ready to wager with your friends. Join or create a Crew to start betting.
            </p>
          </div>
          <div className="welcome-balance">
            <div className="stat-lbl" style={{ marginBottom: '4px' }}>Global Balance</div>
            <div className="balance-amount-container" style={{
              fontSize: '32px',
              fontWeight: '800',
              color: 'var(--gold-primary)',
              fontFamily: 'var(--font-display)',
            }}>
              <span className="gold-coin" style={{ width: '20px', height: '20px' }}></span>
              <span>{user?.balance.toLocaleString()}</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Betcoins</span>
          </div>
        </div>

        {/* Dashboard Sections Grid */}
        <div className="dashboard-grid">
          {/* Left Column: Crews List */}
          <div>
            <h2 className="section-title">Your Squad Crews</h2>
            {crews.length === 0 ? (
              <div className="glass-panel panel-padding-xl" style={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}>
                <div className="gold-coin" style={{ width: '40px', height: '40px', marginBottom: '8px' }}></div>
                <h3>No Crews Joined Yet</h3>
                <p className="text-muted" style={{ maxWidth: '400px', fontSize: '14px' }}>
                  Crews are private wagers spaces. Create your own squad and invite friends, or enter an invite code to join an existing one.
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
                    Create Crew
                  </button>
                  <button onClick={() => setShowJoinModal(true)} className="btn btn-secondary btn-sm">
                    Enter Invite Code
                  </button>
                </div>
              </div>
            ) : (
              <div className="crews-grid">
                {crews.map((crew) => (
                  <Link href={`/crew/${crew.id}`} key={crew.id} style={{ textDecoration: 'none' }}>
                    <div className="glass-panel interactive crew-card">
                      <h3 className="crew-card-title">{crew.name}</h3>
                      <div className="crew-card-meta">
                        <span>Invite Code: <strong className="text-gold">{crew.inviteCode}</strong></span>
                        <span>Created {new Date(crew.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Sidebar Actions */}
          <div>
            <h2 className="section-title">Squad Lounge</h2>
            <div className="glass-panel panel-padding-md" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Manage Crews</h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                + Create A Crew
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Join with Invite Code
              </button>

              <div style={{
                marginTop: '16px',
                paddingTop: '20px',
                borderTop: '1px solid var(--panel-border)',
                fontSize: '13px',
                color: 'var(--text-muted)',
                lineHeight: '1.6',
              }}>
                <h4 style={{ color: 'var(--text-main)', marginBottom: '8px', fontSize: '14px' }}>Platform Guidelines:</h4>
                <ul style={{ paddingLeft: '16px' }}>
                  <li>Every new member receives <strong>100,000 Betcoins</strong>.</li>
                  <li>Wagers are strictly virtual and hold no real monetary value.</li>
                  <li>Bets must use the fixed crew amount.</li>
                  <li>Only crew admins can declare winning outcomes.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* CREATE CREW MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '20px' }}>Create New Crew</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            {modalError && <div className="alert alert-error">{modalError}</div>}
            <form onSubmit={handleCreateCrew}>
              <div className="form-group">
                <label className="form-label" htmlFor="crew-name">Crew Name</label>
                <input
                  id="crew-name"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Office League, Friday Night Wagers"
                  value={newCrewName}
                  onChange={(e) => setNewCrewName(e.target.value)}
                  required
                  disabled={modalLoading}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-text"
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Creating...' : 'Create Crew'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN CREW MODAL */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '20px' }}>Join Crew</h2>
              <button className="modal-close" onClick={() => setShowJoinModal(false)}>&times;</button>
            </div>
            {modalError && <div className="alert alert-error">{modalError}</div>}
            <form onSubmit={handleJoinCrew}>
              <div className="form-group">
                <label className="form-label" htmlFor="invite-code">Invite Code</label>
                <input
                  id="invite-code"
                  className="form-input"
                  type="text"
                  placeholder="e.g. X8Y9Z2"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  disabled={modalLoading}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="btn btn-text"
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Joining...' : 'Join Crew'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
