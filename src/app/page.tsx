'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LandingPageContent() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(errorParam)
    }
  }, [searchParams])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const endpoint = activeTab === 'signup' ? '/api/auth/signup' : '/api/auth/login'
    const body = activeTab === 'signup' 
      ? { username, email, password } 
      : { loginIdentifier: email || username, password }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'An unexpected error occurred.')
      }

      if (activeTab === 'signup') {
        setSuccess('Account created successfully! Redirecting to dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Glows */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(212, 175, 55, 0.05)',
        filter: 'blur(80px)',
        top: '-100px',
        left: '-100px',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(212, 175, 55, 0.03)',
        filter: 'blur(100px)',
        bottom: '-100px',
        right: '-100px',
        pointerEvents: 'none',
      }} />

      {/* Main Container */}
      <div style={{ width: '100%', maxWidth: '440px', zIndex: 10 }}>
        {/* Logo and Tagline */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '800',
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}>
            <span className="gold-coin" style={{ width: '22px', height: '22px' }}></span>
            <span className="text-gold">Don't Bet On It</span>
          </div>
          <p className="text-muted" style={{ fontSize: '15px' }}>
            The risk-free virtual betting platform for your crew.
          </p>
        </div>

        {/* Auth Glass Card */}
        <div className="glass-panel" style={{ padding: '36px', borderRadius: 'var(--radius-lg)' }}>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Form Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--panel-border)',
            marginBottom: '28px',
            paddingBottom: '2px',
            gap: '8px',
          }}>
            <button
              onClick={() => {
                setActiveTab('login')
                setError('')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeTab === 'login' ? 'var(--gold-primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-display)',
                fontWeight: '700',
                fontSize: '16px',
                padding: '8px 16px 12px 16px',
                cursor: 'pointer',
                borderBottom: activeTab === 'login' ? '2px solid var(--gold-primary)' : '2px solid transparent',
                marginBottom: '-3px',
                transition: 'all var(--transition-fast)',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('signup')
                setError('')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeTab === 'signup' ? 'var(--gold-primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-display)',
                fontWeight: '700',
                fontSize: '16px',
                padding: '8px 16px 12px 16px',
                cursor: 'pointer',
                borderBottom: activeTab === 'signup' ? '2px solid var(--gold-primary)' : '2px solid transparent',
                marginBottom: '-3px',
                transition: 'all var(--transition-fast)',
              }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuth}>
            {activeTab === 'signup' && (
              <div className="form-group">
                <label className="form-label" htmlFor="username">Username</label>
                <input
                  id="username"
                  className="form-input"
                  type="text"
                  placeholder="squad_leader_99"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={activeTab === 'signup'}
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email-input">
                {activeTab === 'signup' ? 'Email Address' : 'Username or Email'}
              </label>
              <input
                id="email-input"
                className="form-input"
                type={activeTab === 'signup' ? 'email' : 'text'}
                placeholder={activeTab === 'signup' ? 'alex@example.com' : 'alex@example.com or username'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label" htmlFor="password-input">Password</label>
              <input
                id="password-input"
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              style={{ width: '100%', padding: '14px', marginBottom: '20px' }}
              disabled={loading}
            >
              {loading ? (
                <span>Processing...</span>
              ) : activeTab === 'signup' ? (
                <span>Join & Claim Welcome Bonus</span>
              ) : (
                <span>Enter Squad Lounge</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '20px 0',
            gap: '12px',
          }}>
            <span style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }}></span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
            <span style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }}></span>
          </div>

          {/* Google SSO Login */}
          <Link
            href="/api/auth/google"
            className="btn btn-secondary"
            style={{
              width: '100%',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            {/* Google Icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '8px' }}>
              <path fill="#EA4335" d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.6-2.6C13.51.81 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3.07 2.38C4.76 5.34 6.7 3.48 9 3.48z" />
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.77 2.15c1.63-1.5 2.57-3.7 2.57-6.49z" />
              <path fill="#FBBC05" d="M4.03 10.66c-.22-.65-.35-1.35-.35-2.06s.13-1.41.35-2.06L.96 4.16C.35 5.38 0 6.78 0 8.26s.35 2.88.96 4.1l3.07-2.38z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.77-2.15c-.77.52-1.75.83-2.77.83-2.3 0-4.24-1.86-4.97-4.38l-3.07 2.38C2.44 15.98 5.48 18 9 18z" />
            </svg>
            <span>Continue with Google</span>
          </Link>
        </div>

        {/* Footer Disclaimer */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <p>
            By continuing, you acknowledge that <strong>Don't Bet On It</strong> is strictly for entertainment purposes. No real money or deposits are supported.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#120A08',
      }}>
        <div className="text-gold" style={{ fontSize: '20px', fontWeight: 'bold' }}>Loading...</div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  )
}
