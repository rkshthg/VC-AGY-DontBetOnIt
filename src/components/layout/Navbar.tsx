'use client'

import Link from 'next/link'
import type { User } from '@/types/user'

interface NavbarProps {
  user: User | null
  onLogout: () => void
}

/**
 * Shared top navigation bar used across all authenticated pages.
 * Displays the app logo, the user's live balance, a profile link, and a logout button.
 */
export default function Navbar({ user, onLogout }: NavbarProps) {
  return (
    <header className="navbar">
      <div className="container navbar-container">
        <Link href="/dashboard" className="logo">
          <span className="gold-coin"></span>
          <span className="text-gold logo-text">Don&apos;t Bet On It</span>
        </Link>
        <div className="nav-user">
          {user && (
            <>
              <div className="nav-balance">
                <span className="gold-coin"></span>
                <span className="text-gold">{user.balance.toLocaleString()}</span>
                <span
                  className="nav-balance-label"
                  style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '2px' }}
                >
                  Betcoins
                </span>
              </div>
              <Link
                href="/profile"
                className="btn btn-text nav-profile-link"
                style={{ fontSize: '14px', fontWeight: '600', padding: '8px 12px' }}
              >
                @{user.username}
              </Link>
              <button
                onClick={onLogout}
                className="btn btn-text nav-logout-btn"
                style={{ fontSize: '14px' }}
              >
                Log Out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
