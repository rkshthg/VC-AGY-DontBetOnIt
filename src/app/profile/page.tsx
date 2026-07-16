'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserProfile {
  id: string
  username: string
  email: string
  balance: number
  createdAt: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteInput, setDeleteInput] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const router = useRouter()

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      if (!res.ok || !data.user) {
        router.push('/')
        return
      }
      setUser(data.user)
    } catch (err) {
      console.error(err)
      setError('An error occurred loading your profile.')
    } finally {
      setLoading(false)
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

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const expectedPhrase = `delete my account @${user.username}`
    if (deleteInput.trim() !== expectedPhrase) {
      setDeleteError('Confirmation phrase does not match.')
      return
    }

    setDeleteLoading(true)
    setDeleteError('')

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete account.')
      }

      alert('Your account and all associated data have been permanently deleted.')
      router.push('/')
    } catch (err: any) {
      setDeleteError(err.message)
      setDeleteLoading(false)
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
        <div className="text-gold" style={{ fontSize: '20px', fontWeight: 'bold' }}>Loading Profile...</div>
      </div>
    )
  }

  const requiredPhrase = user ? `delete my account @${user.username}` : ''

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
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Link href="/dashboard" style={{ color: 'var(--gold-primary)', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              &larr; Back to Dashboard
            </Link>
          </div>

          <h1 style={{ fontSize: '32px', marginBottom: '32px' }} className="section-title">User Profile</h1>

          {error && <div className="alert alert-error" style={{ marginBottom: '32px' }}>{error}</div>}

          {/* Profile Information Panel */}
          <div className="glass-panel panel-padding-lg" style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '24px', color: 'var(--gold-primary)' }}>Account details</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
                <span className="text-muted" style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</span>
                <span style={{ fontWeight: '600' }}>@{user?.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
                <span className="text-muted" style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</span>
                <span style={{ fontWeight: '600' }}>{user?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
                <span className="text-muted" style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member Since</span>
                <span style={{ fontWeight: '600' }}>{user ? new Date(user.createdAt).toLocaleDateString() : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                <span className="text-muted" style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Global Balance</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: 'var(--gold-primary)', fontFamily: 'var(--font-display)' }}>
                  <span className="gold-coin"></span>
                  <span>{user?.balance.toLocaleString()} Betcoins</span>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone Panel (Account Deletion) */}
          <div className="glass-panel panel-padding-lg" style={{ borderColor: 'var(--color-error)', boxShadow: '0 8px 24px rgba(229, 91, 73, 0.05)' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--color-error)' }}>Danger Zone</h2>
            
            <p className="text-muted" style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Deleting your account is permanent and cannot be undone. This will permanently erase your profile, credit balance, squad crew memberships, and standings history. Active wagers you created will remain but will no longer be linked to your identity.
            </p>

            {deleteError && <div className="alert alert-error" style={{ marginBottom: '24px' }}>{deleteError}</div>}

            <form onSubmit={handleDeleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="delete-confirm" style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>
                  Type the following phrase to confirm deletion:
                </label>
                <code style={{
                  display: 'block',
                  background: '#0E0706',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  color: 'var(--text-main)',
                  border: '1px solid var(--panel-border)',
                  marginBottom: '12px',
                  userSelect: 'none',
                  fontFamily: 'monospace'
                }}>
                  {requiredPhrase}
                </code>
                <input
                  id="delete-confirm"
                  className="form-input"
                  type="text"
                  placeholder="Type the exact phrase above"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  required
                  disabled={deleteLoading}
                  style={{
                    borderColor: deleteInput === requiredPhrase ? 'var(--color-success)' : 'var(--panel-border)',
                    boxShadow: deleteInput === requiredPhrase ? '0 0 0 3px rgba(197, 160, 89, 0.15)' : 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  background: 'var(--color-error)',
                  color: '#FFF',
                  borderColor: 'var(--color-error)',
                  boxShadow: 'none',
                  opacity: deleteInput === requiredPhrase && !deleteLoading ? 1 : 0.5,
                  cursor: deleteInput === requiredPhrase && !deleteLoading ? 'pointer' : 'not-allowed',
                  transition: 'opacity var(--transition-fast)'
                }}
                disabled={deleteInput !== requiredPhrase || deleteLoading}
              >
                {deleteLoading ? 'Deleting Account...' : 'Delete My Account Permanently'}
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  )
}
