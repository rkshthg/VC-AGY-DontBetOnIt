'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Crew {
  id: string
  name: string
  inviteCode: string
  creatorId: string
  createdAt: string
}

interface CrewMemberStats {
  userId: string
  username: string
  email: string
  globalBalance: number
  creditsWon: number
  creditsWagered: number
  totalBets: number
  betsWon: number
  biggestWin: number
  netProfit: number
  winRate: number
}

interface BetCard {
  id: string
  crewId: string
  creatorId: string
  creatorUsername: string
  title: string
  description: string
  fixedWager: number
  status: 'active' | 'resolved' | 'refunded'
  winningOptionId?: string
  winningOptionText?: string
  pot: number
  createdAt: string
  options: { [optionId: string]: string }
  wagers: { [userId: string]: string }
}

interface UserProfile {
  id: string
  username: string
  email: string
  balance: number
}

export default function CrewSpace({ params }: { params: Promise<{ crewId: string }> }) {
  const { crewId } = use(params)
  const router = useRouter()

  // Base Data
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [crew, setCrew] = useState<Crew | null>(null)
  const [leaderboard, setLeaderboard] = useState<CrewMemberStats[]>([])
  const [bets, setBets] = useState<BetCard[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Sort Leaderboard
  const [leaderboardSort, setLeaderboardSort] = useState<'netProfit' | 'globalBalance' | 'winRate'>('netProfit')

  // Modals state
  const [showCreateBetModal, setShowCreateBetModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPromoteModal, setShowPromoteModal] = useState(false)

  // Target bet for admin actions
  const [selectedBet, setSelectedBet] = useState<BetCard | null>(null)

  // Form Inputs
  const [newBetTitle, setNewBetTitle] = useState('')
  const [newBetDesc, setNewBetDesc] = useState('')
  const [newBetWager, setNewBetWager] = useState(5000)
  const [newBetOptions, setNewBetOptions] = useState<string[]>(['', ''])
  
  // Wager inputs per active card
  const [wagerSelection, setWagerSelection] = useState<{ [betId: string]: string }>({})
  const [customOptionInput, setCustomOptionInput] = useState<{ [betId: string]: string }>({})
  const [wagerLoading, setWagerLoading] = useState<{ [betId: string]: boolean }>({})

  // Admin edit options inputs
  const [editOptionsMap, setEditOptionsMap] = useState<{ [optionId: string]: string }>({})

  // Admin promote inputs
  const [promoteUserId, setPromoteUserId] = useState('')

  // Generic modal loadings
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')

  // Copy Clipboard State
  const [copiedInvite, setCopiedInvite] = useState(false)

  useEffect(() => {
    fetchCrewData()
  }, [crewId, leaderboardSort])

  const fetchCrewData = async () => {
    try {
      // Get current user first
      if (!currentUser) {
        const userRes = await fetch('/api/auth/me')
        const userData = await userRes.json()
        if (!userRes.ok || !userData.user) {
          router.push('/')
          return
        }
        setCurrentUser(userData.user)
      }

      // Fetch crew data (which includes leaderboard sorted by choice)
      const crewRes = await fetch(`/api/crews/${crewId}`)
      const crewData = await crewRes.json()

      if (!crewRes.ok) {
        throw new Error(crewData.error || 'Failed to load crew workspace.')
      }

      setCrew(crewData.crew)
      setBets(crewData.bets || [])
      setIsAdmin(crewData.isAdmin)

      // Leaderboard sorting client side (if needed, or use retrieved list)
      sortLeaderboardList(crewData.leaderboard || [], leaderboardSort)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred loading crew space.')
    } finally {
      setLoading(false)
    }
  }

  const sortLeaderboardList = (list: CrewMemberStats[], criterion: typeof leaderboardSort) => {
    const sorted = [...list].sort((a, b) => {
      if (criterion === 'globalBalance') return b.globalBalance - a.globalBalance
      if (criterion === 'winRate') {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate
        return b.totalBets - a.totalBets
      }
      return b.netProfit - a.netProfit
    })
    setLeaderboard(sorted)
  }

  const handleSortChange = (criterion: typeof leaderboardSort) => {
    setLeaderboardSort(criterion)
    sortLeaderboardList(leaderboard, criterion)
  }

  const copyInviteLink = () => {
    if (!crew) return
    const textToCopy = crew.inviteCode
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedInvite(true)
      setTimeout(() => setCopiedInvite(false), 2000)
    })
  }

  // Wager Submission Handler
  const handlePlaceWager = async (betId: string) => {
    const optionId = wagerSelection[betId] || ''
    const customText = customOptionInput[betId] || ''

    if (!optionId && !customText.trim()) {
      alert('Please select an option or enter a custom one.')
      return
    }

    setWagerLoading(prev => ({ ...prev, [betId]: true }))
    try {
      const res = await fetch(`/api/crews/${crewId}/bets/${betId}/wager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId, customOptionText: customText }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to place bet.')
      }

      // Re-fetch current state
      await fetchCrewData()
      // Refresh navbar user details
      const userRes = await fetch('/api/auth/me')
      const userData = await userRes.json()
      if (userRes.ok && userData.user) {
        setCurrentUser(userData.user)
      }

      // Clear inputs
      setWagerSelection(prev => ({ ...prev, [betId]: '' }))
      setCustomOptionInput(prev => ({ ...prev, [betId]: '' }))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setWagerLoading(prev => ({ ...prev, [betId]: false }))
    }
  }

  // Add Option Input Field to Form
  const addOptionField = () => {
    setNewBetOptions([...newBetOptions, ''])
  }

  const removeOptionField = (index: number) => {
    if (newBetOptions.length <= 2) return
    const updated = [...newBetOptions]
    updated.splice(index, 1)
    setNewBetOptions(updated)
  }

  // Create Bet Card Submit
  const handleCreateBetCard = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setModalLoading(true)

    const filteredOptions = newBetOptions.filter(o => o.trim())
    if (filteredOptions.length < 2) {
      setModalError('Please define at least 2 options.')
      setModalLoading(false)
      return
    }

    const userBalance = currentUser?.balance || 0
    if (newBetWager > userBalance) {
      setModalError(`Insufficient funds. You cannot set a fixed wager of ${newBetWager.toLocaleString()} Betcoins because you only have ${userBalance.toLocaleString()} Betcoins in your global balance.`)
      setModalLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/crews/${crewId}/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBetTitle,
          description: newBetDesc,
          fixedWager: newBetWager,
          options: filteredOptions,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create Bet Card.')
      }

      setShowCreateBetModal(false)
      setNewBetTitle('')
      setNewBetDesc('')
      setNewBetWager(5000)
      setNewBetOptions(['', ''])
      
      await fetchCrewData()
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setModalLoading(false)
    }
  }

  // Admin Resolve Bet Submit
  const handleResolveBet = async (winningOptionId: string) => {
    if (!selectedBet) return
    setModalError('')
    setModalLoading(true)

    try {
      const res = await fetch(`/api/crews/${crewId}/bets/${selectedBet.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winningOptionId }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resolve bet.')
      }

      setShowResolveModal(false)
      setSelectedBet(null)
      await fetchCrewData()
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setModalLoading(false)
    }
  }

  // Admin Edit Options Submit
  const handleEditOptions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBet) return
    setModalError('')
    setModalLoading(true)

    try {
      const res = await fetch(`/api/crews/${crewId}/bets/${selectedBet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: editOptionsMap }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to edit options.')
      }

      setShowEditModal(false)
      setSelectedBet(null)
      await fetchCrewData()
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setModalLoading(false)
    }
  }

  // Admin Promote Member Submit
  const handlePromoteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!promoteUserId) return
    setModalError('')
    setModalLoading(true)

    try {
      const res = await fetch(`/api/crews/${crewId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: promoteUserId }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to promote member.')
      }

      setShowPromoteModal(false)
      setPromoteUserId('')
      alert('Member promoted to Crew Admin successfully.')
      await fetchCrewData()
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

  // Helper to calculate percentages of wagers on a card
  const calculateOptionStats = (bet: BetCard, optionId: string) => {
    const totalWagersCount = Object.keys(bet.wagers).length
    if (totalWagersCount === 0) return { count: 0, percent: 0 }

    const optionWagersCount = Object.values(bet.wagers).filter(id => id === optionId).length
    const percent = Math.round((optionWagersCount / totalWagersCount) * 100)
    return { count: optionWagersCount, percent }
  }

  // Find user's stats in this crew
  const myStats = leaderboard.find(m => m.userId === currentUser?.id)

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#120A08',
      }}>
        <div className="text-gold" style={{ fontSize: '20px', fontWeight: 'bold' }}>Loading Crew Space...</div>
      </div>
    )
  }

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
            {currentUser && (
              <>
                <div className="nav-balance">
                  <span className="gold-coin"></span>
                  <span className="text-gold">{currentUser.balance.toLocaleString()}</span>
                  <span className="nav-balance-label" style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '2px' }}>Betcoins</span>
                </div>
                <Link href="/profile" className="btn btn-text nav-profile-link" style={{ fontSize: '14px', fontWeight: '600', padding: '8px 12px' }}>
                  @{currentUser.username}
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

        {/* Crew Header Banner */}
        <div className="glass-panel crew-banner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <Link href="/dashboard" style={{ color: 'var(--gold-primary)', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                &larr; Dashboard
              </Link>
              {isAdmin && <span className="bet-badge status-active" style={{ fontSize: '10px' }}>Crew Admin</span>}
            </div>
            <h1 style={{ fontSize: '26px' }}>{crew?.name}</h1>
          </div>

          <div className="invite-code-container">
            <div className="invite-code-box">
              <span className="text-muted">Invite Code:</span>
              <strong className="text-gold" style={{ fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '0.05em' }}>{crew?.inviteCode}</strong>
              <button
                onClick={copyInviteLink}
                className="btn btn-text"
                style={{ padding: '4px 8px', fontSize: '12px', minWidth: '70px' }}
              >
                {copiedInvite ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            {isAdmin && (
              <button onClick={() => setShowPromoteModal(true)} className="btn btn-secondary" style={{ padding: '10px 16px', fontSize: '13px' }}>
                Promote Admin
              </button>
            )}
          </div>
        </div>

        {/* Personal vs Crew Statistics */}
        <div className="stats-grid">
          <div className="glass-panel stat-item">
            <div className="stat-val text-gold">{myStats ? myStats.totalBets : 0}</div>
            <div className="stat-lbl">Wagers Placed</div>
          </div>
          <div className="glass-panel stat-item">
            <div className="stat-val text-gold">{myStats ? myStats.betsWon : 0}</div>
            <div className="stat-lbl">Wagers Won</div>
          </div>
          <div className="glass-panel stat-item">
            <div className="stat-val" style={{ color: myStats && myStats.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
              {myStats && myStats.netProfit >= 0 ? '+' : ''}{myStats ? myStats.netProfit.toLocaleString() : 0}
            </div>
            <div className="stat-lbl">Crew Net Profit (Betcoins)</div>
          </div>
          <div className="glass-panel stat-item">
            <div className="stat-val text-gold">
              {myStats && myStats.biggestWin > 0 ? `${myStats.biggestWin.toLocaleString()}` : '0'}
            </div>
            <div className="stat-lbl">Biggest Win (Pot)</div>
          </div>
        </div>

        {/* Crew Work Grid */}
        <div className="dashboard-grid">
          {/* Left Side: Bet Feed */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="section-title" style={{ margin: 0 }}>Betting Lobby</h2>
              <button onClick={() => setShowCreateBetModal(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                + Create Bet Card
              </button>
            </div>

            {bets.length === 0 ? (
              <div className="glass-panel panel-padding-xl" style={{ textAlign: 'center' }}>
                <p className="text-muted" style={{ marginBottom: '16px' }}>No bet cards have been posted in this lobby yet.</p>
                <button onClick={() => setShowCreateBetModal(true)} className="btn btn-secondary btn-sm">
                  Post the First Bet Card
                </button>
              </div>
            ) : (
              <div className="bets-container">
                {bets.map((bet) => {
                  const hasUserBet = !!bet.wagers[currentUser?.id || '']
                  const userSelectedOptionId = bet.wagers[currentUser?.id || '']
                  
                  return (
                    <div className={`glass-panel bet-card-details ${bet.status === 'active' ? 'gold-card' : ''}`} key={bet.id} style={{
                      boxShadow: bet.status === 'active' ? 'var(--shadow-gold), var(--shadow-sm)' : 'var(--shadow-sm)',
                    }}>
                      <div className="bet-card-header">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span className={`bet-badge status-${bet.status}`}>
                              {bet.status === 'active' ? 'Active' : bet.status === 'resolved' ? 'Resolved' : 'Refunded'}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Posted by @{bet.creatorUsername}
                            </span>
                          </div>
                          <h3 className="bet-card-title">{bet.title}</h3>
                          <span className="bet-card-wager-lbl">
                            Fixed Wager: <strong className="text-gold">{bet.fixedWager.toLocaleString()}</strong> Betcoins
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="stat-lbl">Accumulated Pot</div>
                          <div className="text-gold" style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)' }}>
                            {bet.pot.toLocaleString()}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {Object.keys(bet.wagers).length} bets placed
                          </span>
                        </div>
                      </div>

                      {bet.description && <p className="bet-card-desc">{bet.description}</p>}

                      {/* Options rendering */}
                      <div className="options-list">
                        {Object.entries(bet.options).map(([optionId, optionText]) => {
                          const stats = calculateOptionStats(bet, optionId)
                          const isWinningOutcome = bet.status === 'resolved' && bet.winningOptionId === optionId
                          const isUserSelection = userSelectedOptionId === optionId

                          let rowClass = 'option-row'
                          if (isWinningOutcome) rowClass += ' winning-outcome'
                          if (isUserSelection) rowClass += ' selected'
                          if (hasUserBet || bet.status !== 'active') rowClass += ' voted'

                          return (
                            <div
                              key={optionId}
                              className={rowClass}
                              onClick={() => {
                                if (bet.status === 'active' && !hasUserBet) {
                                  setWagerSelection(prev => ({ ...prev, [bet.id]: optionId }))
                                  setCustomOptionInput(prev => ({ ...prev, [bet.id]: '' })) // Reset custom input if preset option chosen
                                }
                              }}
                            >
                              {/* Background progress fill if user has bet or card resolved */}
                              {(hasUserBet || bet.status !== 'active') && (
                                <div className="option-fill" style={{ width: `${stats.percent}%` }}></div>
                              )}
                              
                              <div className="option-content">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {bet.status === 'active' && !hasUserBet && (
                                    <input
                                      type="radio"
                                      name={`bet-option-${bet.id}`}
                                      checked={wagerSelection[bet.id] === optionId}
                                      onChange={() => {}} // handled by onClick on the row
                                      style={{ accentColor: 'var(--gold-primary)', cursor: 'pointer' }}
                                    />
                                  )}
                                  <span>{optionText}</span>
                                  {isUserSelection && <span className="text-gold" style={{ fontSize: '12px', fontWeight: 'bold' }}>(Your Bet)</span>}
                                  {isWinningOutcome && <span className="text-gold" style={{ fontSize: '12px', fontWeight: 'bold' }}>(Winner)</span>}
                                </div>
                                {(hasUserBet || bet.status !== 'active') && (
                                  <span className="option-votes-stat">
                                    {stats.count} wagers ({stats.percent}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {/* Custom Option Field - Render only if active and user hasn't bet */}
                        {bet.status === 'active' && !hasUserBet && (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                className="form-input"
                                type="text"
                                placeholder="Create your own custom option and bet on it..."
                                value={customOptionInput[bet.id] || ''}
                                onChange={(e) => {
                                  setCustomOptionInput(prev => ({ ...prev, [bet.id]: e.target.value }))
                                  setWagerSelection(prev => ({ ...prev, [bet.id]: '' })) // Clear selected radio if custom typed
                                }}
                                style={{ fontSize: '13px' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="bet-card-action-bar">
                        {/* Wager Placed Notification / Status info */}
                        <div>
                          {hasUserBet && bet.status === 'active' && (
                            <span style={{ fontSize: '13px', color: 'var(--gold-primary)', fontWeight: '600' }}>
                              &checkmark; Wager locked. Awaiting admin resolution.
                            </span>
                          )}
                          {bet.status === 'resolved' && (
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              Winning outcome declared: <strong>{bet.winningOptionText}</strong>
                            </span>
                          )}
                          {bet.status === 'refunded' && (
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              No winners. Wagers refunded to participants.
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                          {/* User Betting Action */}
                          {bet.status === 'active' && !hasUserBet && (
                            <button
                              onClick={() => handlePlaceWager(bet.id)}
                              className="btn btn-primary"
                              style={{ padding: '8px 16px', fontSize: '13px' }}
                              disabled={wagerLoading[bet.id] || (!wagerSelection[bet.id] && !(customOptionInput[bet.id] || '').trim())}
                            >
                              {wagerLoading[bet.id] ? 'Submitting...' : `Place Bet (${bet.fixedWager.toLocaleString()} Betcoins)`}
                            </button>
                          )}

                          {/* Admin Resolution & Modification Actions */}
                          {isAdmin && bet.status === 'active' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedBet(bet)
                                  setEditOptionsMap(bet.options)
                                  setShowEditModal(true)
                                }}
                                className="btn btn-text"
                                style={{ padding: '6px 12px', fontSize: '13px' }}
                              >
                                Edit Options
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBet(bet)
                                  setShowResolveModal(true)
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '13px' }}
                              >
                                Resolve Bet
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Side: Leaderboard */}
          <div>
            <h2 className="section-title">Crew Standings</h2>
            <div className="glass-panel" style={{ padding: '20px 0' }}>
              <div style={{ padding: '0 20px 12px 20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted" style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Rank By</span>
                <select
                  value={leaderboardSort}
                  onChange={(e) => handleSortChange(e.target.value as any)}
                  style={{
                    background: '#0E0706',
                    color: 'var(--text-main)',
                    border: '1px solid var(--panel-border)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="netProfit">Net Profit</option>
                  <option value="globalBalance">Global Balance</option>
                  <option value="winRate">Win Rate</option>
                </select>
              </div>

              {leaderboard.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                  No members in the standings.
                </div>
              ) : (
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>Rk</th>
                      <th>User</th>
                      <th style={{ textAlign: 'right' }}>
                        {leaderboardSort === 'globalBalance' ? 'Global' : leaderboardSort === 'winRate' ? 'Rate' : 'Net'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((member, index) => {
                      const isMe = member.userId === currentUser?.id
                      
                      let displayValue = ''
                      if (leaderboardSort === 'globalBalance') {
                        displayValue = member.globalBalance.toLocaleString()
                      } else if (leaderboardSort === 'winRate') {
                        displayValue = `${Math.round(member.winRate * 100)}%`
                      } else {
                        // Net Profit
                        displayValue = `${member.netProfit >= 0 ? '+' : ''}${member.netProfit.toLocaleString()}`
                      }

                      return (
                        <tr key={member.userId} className={isMe ? 'current-user-row' : ''}>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`rank-badge rank-${index + 1}`}>
                              {index + 1}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: '600' }}>@{member.username}</div>
                            <div className="text-muted" style={{ fontSize: '11px' }}>
                              {member.totalBets} wagers ({member.betsWon} W)
                            </div>
                          </td>
                          <td style={{
                            textAlign: 'right',
                            fontWeight: '700',
                            fontFamily: 'var(--font-display)',
                            color: leaderboardSort === 'netProfit' 
                              ? (member.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-error)')
                              : 'var(--text-main)',
                          }}>
                            {displayValue}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* CREATE BET CARD MODAL */}
      {showCreateBetModal && (
        <div className="modal-overlay" onClick={() => setShowCreateBetModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '20px' }}>Create Bet Card</h2>
              <button className="modal-close" onClick={() => setShowCreateBetModal(false)}>&times;</button>
            </div>
            {modalError && <div className="alert alert-error">{modalError}</div>}
            <form onSubmit={handleCreateBetCard}>
              <div className="form-group">
                <label className="form-label" htmlFor="bet-title">Wager Topic / Question</label>
                <input
                  id="bet-title"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Will the next project build compile successfully?"
                  value={newBetTitle}
                  onChange={(e) => setNewBetTitle(e.target.value)}
                  required
                  disabled={modalLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="bet-desc">Additional Details (Optional)</label>
                <input
                  id="bet-desc"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Refers to the prod deploy at 5 PM."
                  value={newBetDesc}
                  onChange={(e) => setNewBetDesc(e.target.value)}
                  disabled={modalLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="bet-wager">Fixed Wager (Betcoins)</label>
                <input
                  id="bet-wager"
                  className="form-input"
                  type="number"
                  placeholder="5000"
                  value={newBetWager}
                  onChange={(e) => setNewBetWager(Number(e.target.value))}
                  required
                  min="1"
                  disabled={modalLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Options (Minimum 2)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {newBetOptions.map((option, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        className="form-input"
                        type="text"
                        placeholder={`Option ${idx + 1}`}
                        value={option}
                        onChange={(e) => {
                          const updated = [...newBetOptions]
                          updated[idx] = e.target.value
                          setNewBetOptions(updated)
                        }}
                        required={idx < 2}
                        disabled={modalLoading}
                      />
                      {newBetOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOptionField(idx)}
                          className="btn btn-text"
                          style={{ padding: '8px', color: 'var(--color-error)' }}
                          disabled={modalLoading}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addOptionField}
                  className="btn btn-text"
                  style={{ marginTop: '10px', fontSize: '13px', padding: '4px 8px' }}
                  disabled={modalLoading}
                >
                  + Add Option Row
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateBetModal(false)}
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
                  {modalLoading ? 'Creating...' : 'Post Wager Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE BET MODAL */}
      {showResolveModal && selectedBet && (
        <div className="modal-overlay" onClick={() => setShowResolveModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '20px' }}>Resolve Wager</h2>
              <button className="modal-close" onClick={() => setShowResolveModal(false)}>&times;</button>
            </div>
            {modalError && <div className="alert alert-error">{modalError}</div>}
            
            <p className="text-muted" style={{ fontSize: '14px', marginBottom: '20px' }}>
              Declare the winning outcome for: <strong>"{selectedBet.title}"</strong>. Payouts will be distributed atomically.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(selectedBet.options).map(([optionId, optionText]) => (
                <button
                  key={optionId}
                  onClick={() => handleResolveBet(optionId)}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'space-between', width: '100%', padding: '14px 20px' }}
                  disabled={modalLoading}
                >
                  <span>{optionText}</span>
                  <span className="text-gold" style={{ fontSize: '12px' }}>
                    {calculateOptionStats(selectedBet, optionId).count} bets
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                onClick={() => setShowResolveModal(false)}
                className="btn btn-text"
                disabled={modalLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT OPTIONS MODAL */}
      {showEditModal && selectedBet && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '20px' }}>Edit Option Labels</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            {modalError && <div className="alert alert-error">{modalError}</div>}
            
            <p className="text-muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
              Modify the text of options. Placed bets will remain mapped to their respective IDs and keep intact.
            </p>

            <form onSubmit={handleEditOptions}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(selectedBet.options).map(([optionId, optionText]) => (
                  <div className="form-group" key={optionId} style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Option ID: {optionId.substring(0, 8)}...</label>
                    <input
                      className="form-input"
                      type="text"
                      value={editOptionsMap[optionId] || ''}
                      onChange={(e) => {
                        setEditOptionsMap(prev => ({
                          ...prev,
                          [optionId]: e.target.value,
                        }))
                      }}
                      required
                      disabled={modalLoading}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                  {modalLoading ? 'Saving...' : 'Save Edits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROMOTE ADMIN MODAL */}
      {showPromoteModal && (
        <div className="modal-overlay" onClick={() => setShowPromoteModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '20px' }}>Promote Member to Admin</h2>
              <button className="modal-close" onClick={() => setShowPromoteModal(false)}>&times;</button>
            </div>
            {modalError && <div className="alert alert-error">{modalError}</div>}
            
            <form onSubmit={handlePromoteMember}>
              <div className="form-group">
                <label className="form-label" htmlFor="promote-select">Select Member</label>
                <select
                  id="promote-select"
                  className="form-input"
                  value={promoteUserId}
                  onChange={(e) => setPromoteUserId(e.target.value)}
                  required
                  disabled={modalLoading}
                  style={{ background: '#0E0706', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }}
                >
                  <option value="">-- Choose Member --</option>
                  {leaderboard
                    .filter(m => m.userId !== currentUser?.id) // exclude current admin
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>
                        @{m.username} ({m.email})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(false)}
                  className="btn btn-text"
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={modalLoading || !promoteUserId}
                >
                  {modalLoading ? 'Promoting...' : 'Promote to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
