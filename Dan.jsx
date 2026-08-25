import React, { useState } from 'react';
import { useDanMusicAuth } from './SubscriptionGate';

const BOOST_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours

export default function DanMusic() {
  const { user, isPremium, upgrade, upgrading, upgradeError, clearUpgradeError, logout } = useDanMusicAuth();

  const [activeTab, setActiveTab] = useState('chart');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const fallbackAvatar = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80';

  const [artists, setArtists] = useState([]);

  const [believedState, setBelievedState] = useState({});
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newArtist, setNewArtist] = useState({
    name: '',
    city: '',
    genre: 'Hip-Hop',
    bio: '',
    trackTitle: '',
    avatarUrl: '',
    collabNeed: '',
    audioFile: null
  });

  const highestBelievedId = [...artists].sort((a, b) => b.believersCount - a.believersCount)[0]?.id;

  const myTracksCount = artists.filter(a => a.ownerId === user?.id).length;
  const trackLimitReached = !isPremium && myTracksCount >= 1;

  const handleAddArtist = (e) => {
    e.preventDefault();
    if (!newArtist.name || !newArtist.trackTitle) return;

    if (trackLimitReached) {
      setShowAddModal(false);
      setShowPremiumModal(true);
      return;
    }

    const audioUrl = newArtist.audioFile
      ? URL.createObjectURL(newArtist.audioFile)
      : null;

    const created = {
      id: `artist-${Date.now()}`,
      rank: artists.length + 1,
      ownerId: user?.id || null,
      isPremiumArtist: isPremium,
      name: newArtist.name,
      handle: `@${newArtist.name.toLowerCase().replace(/\s+/g, '')}`,
      city: newArtist.city || 'Global',
      genre: newArtist.genre,
      danScore: 700,
      bio: newArtist.bio || 'Emerging independent artist.',
      avatar: newArtist.avatarUrl || fallbackAvatar,
      openToCollab: Boolean(newArtist.collabNeed),
      collabRole: 'Artist',
      collabRequest: newArtist.collabNeed,
      believersCount: 0,
      boostedUntil: null,
      topTrack: {
        id: `track-${Date.now()}`,
        title: newArtist.trackTitle,
        duration: '3:00',
        audioUrl,
        playCount: 0
      }
    };

    setArtists([...artists, created]);
    setShowAddModal(false);
    setNewArtist({ name: '', city: '', genre: 'Hip-Hop', bio: '', trackTitle: '', avatarUrl: '', collabNeed: '', audioFile: null });
  };

  const handleBoost = (id) => {
    setArtists(prev => prev.map(artist =>
      artist.id === id
        ? { ...artist, boostedUntil: Date.now() + BOOST_DURATION_MS }
        : artist
    ));
  };

  const toggleBelieve = (id) => {
    const isBelieved = believedState[id];
    setBelievedState(prev => ({ ...prev, [id]: !isBelieved }));

    setArtists(prev => prev.map(artist => {
      if (artist.id === id) {
        return {
          ...artist,
          believersCount: isBelieved ? artist.believersCount - 1 : artist.believersCount + 1,
          danScore: isBelieved ? artist.danScore - 15 : artist.danScore + 15
        };
      }
      return artist;
    }));
  };

  const handlePlay = (track, artistName) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack({ ...track, artistName });
      setIsPlaying(true);

      setArtists(prev => prev.map(artist =>
        artist.topTrack.id === track.id
          ? { ...artist, topTrack: { ...artist.topTrack, playCount: (artist.topTrack.playCount || 0) + 1 } }
          : artist
      ));
    }
  };

  const filteredArtists = artists.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.topTrack.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || a.genre === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const rankArtists = (list) => {
    const now = Date.now();
    return [...list].sort((a, b) => {
      const aBoosted = a.boostedUntil && a.boostedUntil > now;
      const bBoosted = b.boostedUntil && b.boostedUntil > now;
      if (aBoosted !== bBoosted) return aBoosted ? -1 : 1;
      return b.danScore - a.danScore;
    });
  };

  const topFive = rankArtists(artists).slice(0, 5);
  const rankedFilteredArtists = rankArtists(filteredArtists);

  return (
    <div className="dan-app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Syne:wght@700;800;900&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .dan-app {
          min-height: 100vh;
          background-color: #0d0d0f;
          color: #f2f2f5;
          font-family: 'Space Grotesk', sans-serif;
          padding-bottom: 120px;
        }

        /* HEADER & BRAND */
        .navbar {
          background: #000000;
          border-bottom: 2px solid #1a1a1f;
          padding: 18px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo-box {
          width: 38px;
          height: 38px;
          background: #e5fe40;
          color: #000;
          font-family: 'Syne', sans-serif;
          font-weight: 900;
          font-size: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(-3deg);
        }

        .brand-name {
          font-family: 'Syne', sans-serif;
          font-weight: 900;
          font-size: 22px;
          letter-spacing: -1px;
          color: #ffffff;
          text-transform: uppercase;
        }

        .tag-pill {
          background: #1a1a22;
          border: 1px solid #2d2d38;
          color: #e5fe40;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 4px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .btn-drop {
          background: #e5fe40;
          border: 2px solid #e5fe40;
          color: #000;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 13px;
          padding: 10px 22px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-drop:hover {
          background: #000;
          color: #e5fe40;
        }

        /* HERO MANIFESTO */
        .manifesto-strip {
          max-width: 1000px;
          margin: 32px auto 0;
          padding: 0 24px;
        }

        .manifesto-box {
          background: #121216;
          border: 1px solid #24242e;
          border-left: 5px solid #e5fe40;
          padding: 22px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .manifesto-title {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 900;
          color: #ffffff;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: -0.5px;
        }

        .manifesto-desc {
          font-size: 13px;
          color: #a0a0b2;
          line-height: 1.6;
        }

        /* TABS NAV */
        .tab-row {
          max-width: 1000px;
          margin: 32px auto 28px;
          padding: 0 24px;
          display: flex;
          gap: 12px;
          border-bottom: 2px solid #1a1a22;
        }

        .nav-tab {
          background: transparent;
          border: none;
          color: #717182;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 15px;
          padding: 12px 20px;
          cursor: pointer;
          position: relative;
          text-transform: uppercase;
          transition: color 0.2s;
        }

        .nav-tab:hover {
          color: #ffffff;
        }

        .nav-tab.active {
          color: #e5fe40;
        }

        .nav-tab.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: #e5fe40;
        }

        .main-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* CHART VIEW */
        .chart-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .chart-row {
          background: #121216;
          border: 1px solid #22222b;
          padding: 18px 24px;
          display: grid;
          grid-template-columns: 48px 64px 1fr auto;
          align-items: center;
          gap: 20px;
          transition: background 0.2s, border-color 0.2s;
        }

        .chart-row:hover {
          background: #17171d;
          border-color: #333342;
        }

        .rank-num {
          font-family: 'Syne', sans-serif;
          font-size: 24px;
          font-weight: 900;
          color: #444455;
        }

        .rank-num.top-1 { color: #e5fe40; }
        .rank-num.top-2 { color: #ffffff; }
        .rank-num.top-3 { color: #ff7043; }

        .artist-avatar {
          width: 64px;
          height: 64px;
          object-fit: cover;
          border-radius: 2px;
          filter: grayscale(20%);
          transition: filter 0.2s;
        }

        .chart-row:hover .artist-avatar {
          filter: grayscale(0%);
        }

        .top-badge {
          display: inline-block;
          background: #e5fe40;
          color: #000;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .btn-play-circle {
          width: 44px;
          height: 44px;
          background: #1f1f28;
          border: 1px solid #333344;
          color: #fff;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-play-circle:hover {
          background: #e5fe40;
          color: #000;
          border-color: #e5fe40;
        }

        .btn-play-circle.playing {
          background: #ff3366;
          color: #fff;
          border-color: #ff3366;
        }

        .btn-believe {
          background: transparent;
          border: 1px solid #333344;
          color: #f2f2f5;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 13px;
          padding: 10px 18px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-believe:hover {
          border-color: #e5fe40;
          color: #e5fe40;
        }

        .btn-believe.active {
          background: #e5fe40;
          color: #000;
          border-color: #e5fe40;
        }

        /* GRID DISCOVER */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 20px;
        }

        .indie-card {
          background: #121216;
          border: 1px solid #22222b;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .card-image-wrap {
          height: 220px;
          position: relative;
          overflow: hidden;
          background: #000;
        }

        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.85;
          transition: transform 0.4s ease, opacity 0.4s ease;
        }

        .indie-card:hover .card-image {
          transform: scale(1.04);
          opacity: 1;
        }

        .score-pill {
          position: absolute;
          top: 14px;
          right: 14px;
          background: #000;
          border: 1px solid #333342;
          color: #e5fe40;
          font-weight: 700;
          font-size: 12px;
          padding: 4px 10px;
        }

        .card-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .artist-name-title {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          font-weight: 800;
          color: #fff;
        }

        .meta-sub {
          font-size: 12px;
          color: #777788;
          margin-top: 4px;
          margin-bottom: 16px;
        }

        .track-box {
          background: #0a0a0d;
          border: 1px solid #1a1a22;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        /* COLLAB CARDS */
        .collab-card {
          background: #121216;
          border: 1px solid #22222b;
          padding: 24px;
        }

        .collab-req {
          background: #0a0a0d;
          border-left: 3px solid #ff3366;
          padding: 14px;
          font-style: italic;
          color: #c4c4d4;
          font-size: 13px;
          margin: 16px 0 20px;
        }

        .btn-connect {
          width: 100%;
          background: #1f1f28;
          border: 1px solid #333344;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 13px;
          padding: 12px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-connect:hover {
          background: #fff;
          color: #000;
        }

        /* MODAL */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.88);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-box {
          background: #121216;
          border: 2px solid #2d2d3a;
          width: 100%;
          max-width: 480px;
          padding: 32px;
        }

        .field-label {
          font-size: 11px;
          font-weight: 700;
          color: #777788;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 6px;
          display: block;
        }

        .raw-input {
          width: 100%;
          background: #0a0a0d;
          border: 1px solid #242430;
          padding: 12px 14px;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          margin-bottom: 16px;
          outline: none;
        }

        .raw-input:focus {
          border-color: #e5fe40;
        }

        /* PLAYER BAR */
        .bottom-player {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #000;
          border-top: 2px solid #1f1f28;
          padding: 14px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 150;
        }

        /* CUSTOM FILE UPLOAD */
        .dm-file-upload {
          width: 100%;
          background: #0a0a0d;
          border: 1px solid #242430;
          padding: 12px 14px;
          color: #cfcfe0;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .dm-file-upload:hover {
          border-color: #e5fe40;
        }

        .dm-file-upload-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dm-file-arrow {
          color: #e5fe40;
          flex-shrink: 0;
          margin-left: 12px;
        }

        /* EMPTY STATE */
        .dm-empty-state {
          position: relative;
          overflow: hidden;
          border: 1px solid #24242e;
          background: radial-gradient(ellipse 500px 260px at 50% 0%, rgba(229,254,64,0.09), transparent 70%), #121216;
          padding: 70px 30px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .dm-empty-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #1a1a22;
          border: 1px solid #2d2d38;
          color: #e5fe40;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
          padding: 6px 14px;
          margin-bottom: 22px;
          text-transform: uppercase;
        }

        .dm-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #e5fe40;
          animation: dm-pulse 1.6s infinite;
        }

        @keyframes dm-pulse {
          0% { box-shadow: 0 0 0 0 rgba(229, 254, 64, 0.6); }
          70% { box-shadow: 0 0 0 9px rgba(229, 254, 64, 0); }
          100% { box-shadow: 0 0 0 0 rgba(229, 254, 64, 0); }
        }

        .dm-waveform {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 4px;
          height: 34px;
          margin-bottom: 24px;
        }

        .dm-waveform span {
          width: 4px;
          border-radius: 2px;
          background: #e5fe40;
          animation: dm-wave 1.1s ease-in-out infinite;
        }

        @keyframes dm-wave {
          0%, 100% { height: 8px; opacity: 0.55; }
          50% { height: 32px; opacity: 1; }
        }

        .dm-empty-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(22px, 4vw, 32px);
          font-weight: 900;
          letter-spacing: -1px;
          text-transform: uppercase;
          color: #ffffff;
          margin-bottom: 16px;
          line-height: 1.15;
        }

        .dm-empty-desc {
          color: #9a9ab0;
          font-size: 13px;
          line-height: 1.75;
          max-width: 440px;
          margin-bottom: 30px;
        }

        .dm-empty-cta {
          width: auto;
          padding: 14px 30px;
        }

        /* PREMIUM FEATURES */
        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-go-premium {
          background: transparent;
          border: 2px solid #e5fe40;
          color: #e5fe40;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 12px;
          padding: 9px 18px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-go-premium:hover {
          background: #e5fe40;
          color: #000;
        }

        .premium-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #1a1a22;
          border: 1px solid #e5fe40;
          color: #e5fe40;
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 800;
          padding: 7px 14px;
          letter-spacing: 0.5px;
        }

        .btn-logout {
          background: transparent;
          border: 1px solid #2d2d38;
          color: #777788;
          font-size: 11px;
          font-weight: 700;
          padding: 9px 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-logout:hover {
          border-color: #ff3366;
          color: #ff6b8c;
        }

        .pro-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background: #e5fe40;
          color: #000;
          font-size: 9px;
          font-weight: 900;
          padding: 2px 6px;
          margin-left: 8px;
          letter-spacing: 0.5px;
          vertical-align: middle;
        }

        .boost-badge {
          display: inline-block;
          background: #ff3366;
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          text-transform: uppercase;
          margin-bottom: 6px;
          margin-right: 6px;
        }

        .btn-boost {
          background: transparent;
          border: 1px solid #ff3366;
          color: #ff6b8c;
          font-size: 11px;
          font-weight: 700;
          padding: 9px 12px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-boost:hover:not(:disabled) {
          background: #ff3366;
          color: #fff;
        }

        .btn-boost:disabled {
          opacity: 0.5;
          cursor: default;
        }

        .analytics-chip {
          font-size: 10px;
          color: #777788;
          margin-top: 6px;
          letter-spacing: 0.3px;
        }

        .analytics-chip b {
          color: #e5fe40;
          font-weight: 700;
        }

        .track-limit-note {
          background: #14140c;
          border: 1px solid #3a3a1f;
          color: #cfcf8f;
          padding: 10px 12px;
          font-size: 12px;
          margin-bottom: 16px;
        }

        .track-limit-note button {
          background: none;
          border: none;
          color: #e5fe40;
          font-weight: 700;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          font-size: 12px;
        }

        .premium-modal-benefits {
          display: flex;
          flex-direction: column;
          gap: 13px;
          margin: 22px 0 26px;
        }

        .premium-modal-benefits div {
          color: #c4c4d4;
          font-size: 13px;
        }

        .premium-modal-benefits b {
          color: #e5fe40;
          margin-right: 10px;
        }

        .premium-modal-price {
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 48px;
          font-weight: 900;
          letter-spacing: -2px;
          margin-bottom: 4px;
        }

        .premium-modal-price span {
          color: #e5fe40;
          font-size: 12px;
          letter-spacing: 0;
          margin-right: 6px;
        }

        .premium-modal-price small {
          color: #777788;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 400;
        }
      `}</style>

      {/* NAVBAR */}
      <header className="navbar">
        <div className="brand-logo">
          <div className="logo-box">D</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="brand-name">DANMUSIC COMMUNITY</h1>
            </div>
          </div>
        </div>
        <div className="navbar-actions">
          {isPremium ? (
            <span className="premium-pill">★ PRO MEMBER</span>
          ) : (
            <button onClick={() => setShowPremiumModal(true)} className="btn-go-premium">
              Go Premium
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} className="btn-drop">
            + Add Track / Artist
          </button>
          {logout && (
            <button onClick={logout} className="btn-logout">
              Log Out
            </button>
          )}
        </div>
      </header>

      {/* HERO MANIFESTO BANNER */}
      <div className="manifesto-strip">
        <div className="manifesto-box">
          <div>
            <div className="manifesto-title">
              ⚡ ALL IN ONE PLACE FOR BEDROOM PRODUCERS & BATHROOM SINGERS
            </div>
            <div className="manifesto-desc">
              A 100% judgment-free space for bedroom producers, bathroom singers, acoustic guitarists & indie creators. Share raw tracks, swap unreleased demos, find collaborators, and grow together.
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="tab-row">
        <button 
          onClick={() => setActiveTab('chart')} 
          className={`nav-tab ${activeTab === 'chart' ? 'active' : ''}`}
        >
          Top 5 Chart
        </button>
        <button 
          onClick={() => setActiveTab('discover')} 
          className={`nav-tab ${activeTab === 'discover' ? 'active' : ''}`}
        >
          Discover All
        </button>
        <button 
          onClick={() => setActiveTab('collab')} 
          className={`nav-tab ${activeTab === 'collab' ? 'active' : ''}`}
        >
          Collab Board
        </button>
      </div>

      <div className="main-container">
        {/* TAB 1: WEEKLY TOP 5 */}
        {activeTab === 'chart' && topFive.length === 0 && (
          <EmptyState
            badge="Spotlight Open"
            title={<>Claim The #1 Spot<br />While It's Up For Grabs.</>}
            description="The chart resets on real activity, not seniority — there's no legacy name camping at the top. Drop a track and take your shot at the spotlight this week."
            ctaText="+ Claim The Spotlight"
            onCtaClick={() => setShowAddModal(true)}
          />
        )}

        {activeTab === 'chart' && topFive.length > 0 && (
          <div className="chart-list">
            {topFive.map((artist, idx) => {
              const isThisPlaying = currentTrack?.id === artist.topTrack.id && isPlaying;
              const isBelieved = believedState[artist.id];
              const isHighest = artist.id === highestBelievedId;
              const isMine = user && artist.ownerId === user.id;
              const isBoosted = artist.boostedUntil && artist.boostedUntil > Date.now();

              return (
                <div key={artist.id} className="chart-row">
                  <div className={`rank-num ${idx === 0 ? 'top-1' : idx === 1 ? 'top-2' : idx === 2 ? 'top-3' : ''}`}>
                    0{idx + 1}
                  </div>

                  <img 
                    src={artist.avatar} 
                    alt={artist.name} 
                    className="artist-avatar"
                    onError={(e) => { e.target.src = fallbackAvatar; }}
                  />

                  <div>
                    {isBoosted && <span className="boost-badge">🚀 Boosted</span>}
                    {isHighest && <span className="top-badge">★ Most Believed</span>}
                    <div className="artist-name-title">
                      {artist.name}
                      {artist.isPremiumArtist && <span className="pro-badge">✓ PRO</span>}
                    </div>
                    <div style={{ fontSize: 13, color: '#9a9ab0', marginTop: 2 }}>
                      "{artist.topTrack.title}" • <span style={{ color: '#e5fe40' }}>{artist.genre}</span> • {artist.city}
                    </div>
                    {isMine && isPremium && (
                      <div className="analytics-chip">
                        👁 <b>{artist.topTrack.playCount || 0}</b> plays · ★ <b>{artist.believersCount}</b> believers
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ textAlign: 'right', paddingRight: 10 }}>
                      <div style={{ fontSize: 10, color: '#777788', letterSpacing: 1 }}>REP SCORE</div>
                      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: '#fff' }}>
                        {artist.danScore}
                      </div>
                    </div>

                    {isMine && isPremium && (
                      <button
                        onClick={() => handleBoost(artist.id)}
                        disabled={isBoosted}
                        className="btn-boost"
                        title={isBoosted ? 'Already boosted' : 'Pin to top for 48 hours'}
                      >
                        {isBoosted ? '🚀 Active' : '🚀 Boost 48h'}
                      </button>
                    )}

                    <button 
                      onClick={() => handlePlay(artist.topTrack, artist.name)} 
                      className={`btn-play-circle ${isThisPlaying ? 'playing' : ''}`}
                    >
                      {isThisPlaying ? '❚❚' : '▶'}
                    </button>

                    <button 
                      onClick={() => toggleBelieve(artist.id)} 
                      className={`btn-believe ${isBelieved ? 'active' : ''}`}
                    >
                      {isBelieved ? '★ Believed' : '☆ Believe'} ({artist.believersCount})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: DISCOVER ALL */}
        {activeTab === 'discover' && artists.length === 0 && (
          <EmptyState
            badge="Genres Open"
            title={<>Every Genre.<br />Wide Open Right Now.</>}
            description="Hip-Hop, Indie, Electronic, Pop — every lane here is up for the taking. Add your track and be the first sound people find when they search it."
            ctaText="+ Add Your Sound"
            onCtaClick={() => setShowAddModal(true)}
          />
        )}

        {activeTab === 'discover' && artists.length > 0 && (
          <div>
            <div style={{ display: 'flex', gap: 14, marginBottom: 28 }}>
              <input 
                type="text" 
                placeholder="Search by artist, track title, or city..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="raw-input"
                style={{ flex: 1, marginBottom: 0 }}
              />
              <select 
                value={selectedGenre} 
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="raw-input"
                style={{ width: 180, marginBottom: 0, cursor: 'pointer' }}
              >
                <option value="All">All Genres</option>
                <option value="Hip-Hop">Hip-Hop</option>
                <option value="Indie / R&B">Indie / R&B</option>
                <option value="Electronic">Electronic</option>
                <option value="Pop">Pop</option>
              </select>
            </div>

            <div className="cards-grid">
              {rankedFilteredArtists.map(artist => {
                const isBelieved = believedState[artist.id];
                const isThisPlaying = currentTrack?.id === artist.topTrack.id && isPlaying;
                const isHighest = artist.id === highestBelievedId;
                const isMine = user && artist.ownerId === user.id;
                const isBoosted = artist.boostedUntil && artist.boostedUntil > Date.now();

                return (
                  <div key={artist.id} className="indie-card">
                    <div className="card-image-wrap">
                      <img 
                        src={artist.avatar} 
                        alt={artist.name} 
                        className="card-image"
                        onError={(e) => { e.target.src = fallbackAvatar; }}
                      />
                      <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6 }}>
                        {isBoosted && <span className="boost-badge" style={{ marginBottom: 0 }}>🚀 Boosted</span>}
                        {isHighest && <span className="top-badge" style={{ marginBottom: 0 }}>Most Believed</span>}
                      </div>
                      <div className="score-pill">
                        ⚡ {artist.danScore}
                      </div>
                    </div>

                    <div className="card-body">
                      <div className="artist-name-title">
                        {artist.name}
                        {artist.isPremiumArtist && <span className="pro-badge">✓ PRO</span>}
                      </div>
                      <div className="meta-sub">{artist.city} • {artist.genre}</div>
                      {isMine && isPremium && (
                        <div className="analytics-chip" style={{ marginTop: -10, marginBottom: 12 }}>
                          👁 <b>{artist.topTrack.playCount || 0}</b> plays · ★ <b>{artist.believersCount}</b> believers
                        </div>
                      )}

                      <div className="track-box">
                        <div style={{ overflow: 'hidden', paddingRight: 8 }}>
                          <div style={{ fontSize: 10, color: '#777788', letterSpacing: 0.5 }}>TRACK</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {artist.topTrack.title}
                          </div>
                        </div>
                        <button 
                          onClick={() => handlePlay(artist.topTrack, artist.name)} 
                          className={`btn-play-circle ${isThisPlaying ? 'playing' : ''}`}
                          style={{ width: 36, height: 36, fontSize: 12, flexShrink: 0 }}
                        >
                          {isThisPlaying ? '❚❚' : '▶'}
                        </button>
                      </div>

                      {isMine && isPremium && (
                        <button
                          onClick={() => handleBoost(artist.id)}
                          disabled={isBoosted}
                          className="btn-boost"
                          style={{ width: '100%', marginBottom: 10 }}
                        >
                          {isBoosted ? '🚀 Boost Active' : '🚀 Boost This Track (48h)'}
                        </button>
                      )}

                      <button 
                        onClick={() => toggleBelieve(artist.id)} 
                        className={`btn-believe ${isBelieved ? 'active' : ''}`}
                        style={{ marginTop: 'auto', width: '100%' }}
                      >
                        {isBelieved ? '★ Believed' : '☆ Believe Early'} ({artist.believersCount})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: COLLABORATIONS */}
        {activeTab === 'collab' && artists.filter(a => a.openToCollab).length === 0 && (
          <EmptyState
            badge="Collab Slots Open"
            title={<>Find Your Next<br />Collaborator First.</>}
            description="Post what you need — a producer, a vocalist, a mixing engineer — and be the first request other artists see when they open this board."
            ctaText="+ Post A Collab Request"
            onCtaClick={() => setShowAddModal(true)}
          />
        )}

        {activeTab === 'collab' && artists.filter(a => a.openToCollab).length > 0 && (
          <div className="cards-grid">
            {artists.filter(a => a.openToCollab).map(artist => (
              <div key={artist.id} className="collab-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <img 
                    src={artist.avatar} 
                    alt="" 
                    onError={(e) => { e.target.src = fallbackAvatar; }}
                    style={{ width: 48, height: 48, objectFit: 'cover' }} 
                  />
                  <div>
                    <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18 }}>{artist.name}</div>
                    <span style={{ fontSize: 12, color: '#e5fe40' }}>Looking for: {artist.collabRole}</span>
                  </div>
                </div>

                <div className="collab-req">
                  "{artist.collabRequest}"
                </div>

                <button onClick={() => alert(`Connection request sent to ${artist.name}!`)} className="btn-connect">
                  Connect & Collab
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD ARTIST MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 style={{ fontFamily: 'Syne', fontSize: 22, textTransform: 'uppercase', marginBottom: 4 }}>Submit Track / Artist</h2>
            <p style={{ color: '#888899', fontSize: 13, marginBottom: 24 }}>Add your independent music directly to the live feed.</p>

            {trackLimitReached && (
              <div className="track-limit-note">
                Free accounts get 1 track live at a time. <button type="button" onClick={() => { setShowAddModal(false); setShowPremiumModal(true); }}>Go Premium</button> to post unlimited tracks.
              </div>
            )}
            
            <form onSubmit={handleAddArtist}>
              <label className="field-label">Artist Name</label>
              <input 
                type="text" 
                placeholder="e.g. Alex Rivers" 
                required
                className="raw-input"
                value={newArtist.name}
                onChange={e => setNewArtist({...newArtist, name: e.target.value})}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label">City / Country</label>
                  <input 
                    type="text" 
                    placeholder="e.g. London, UK" 
                    className="raw-input"
                    value={newArtist.city}
                    onChange={e => setNewArtist({...newArtist, city: e.target.value})}
                  />
                </div>
                <div>
                  <label className="field-label">Genre</label>
                  <select 
                    className="raw-input"
                    value={newArtist.genre}
                    onChange={e => setNewArtist({...newArtist, genre: e.target.value})}
                  >
                    <option value="Hip-Hop">Hip-Hop</option>
                    <option value="Indie / R&B">Indie / R&B</option>
                    <option value="Electronic">Electronic</option>
                    <option value="Pop">Pop</option>
                  </select>
                </div>
              </div>

              <label className="field-label">Track Title</label>
              <input 
                type="text" 
                placeholder="e.g. Echoes in the Dark" 
                required
                className="raw-input"
                value={newArtist.trackTitle}
                onChange={e => setNewArtist({...newArtist, trackTitle: e.target.value})}
              />

              <label className="field-label">Track File (WAV or MP3)</label>
              <label htmlFor="dm-track-file" className="dm-file-upload">
                <span className="dm-file-upload-name">
                  {newArtist.audioFile ? newArtist.audioFile.name : 'Choose a WAV or MP3 file'}
                </span>
                <svg className="dm-file-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </label>
              <input 
                id="dm-track-file"
                type="file" 
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                style={{ display: 'none' }}
                onChange={e => setNewArtist({...newArtist, audioFile: e.target.files[0] || null})}
              />

              <label className="field-label">Collab Need (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Need a mixing engineer" 
                className="raw-input"
                value={newArtist.collabNeed}
                onChange={e => setNewArtist({...newArtist, collabNeed: e.target.value})}
              />

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-believe" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-drop" style={{ flex: 1 }}>
                  Submit Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GO PREMIUM MODAL */}
      {showPremiumModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 style={{ fontFamily: 'Syne', fontSize: 22, textTransform: 'uppercase', marginBottom: 4 }}>Go Premium</h2>
            <p style={{ color: '#888899', fontSize: 13, marginBottom: 8 }}>DanMusic stays free for everyone. Premium just gives you more room to grow.</p>

            <div className="premium-modal-price">
              <span>PKR</span>299<small> / month</small>
            </div>

            <div className="premium-modal-benefits">
              <div><b>+</b>Post unlimited tracks (free accounts: 1)</div>
              <div><b>+</b>PRO badge next to your name</div>
              <div><b>+</b>Boost any track to the top for 48 hours</div>
              <div><b>+</b>See plays and believers on your own tracks</div>
            </div>

            {upgradeError && (
              <div className="dm-error" style={{ background: '#190b10', border: '1px solid #ff3366', color: '#ff6b8c', padding: '11px 12px', marginBottom: 14, fontSize: 12 }}>
                {upgradeError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => { setShowPremiumModal(false); clearUpgradeError && clearUpgradeError(); }}
                className="btn-believe"
                style={{ flex: 1 }}
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={async () => { await upgrade(); setShowPremiumModal(false); }}
                disabled={upgrading}
                className="btn-drop"
                style={{ flex: 1 }}
              >
                {upgrading ? 'ACTIVATING...' : 'GO PREMIUM'}
              </button>
            </div>

            <div style={{ color: '#555563', textAlign: 'center', fontSize: 9, letterSpacing: 1, marginTop: 14 }}>
              DEVELOPMENT PAYMENT MODE
            </div>
          </div>
        </div>
      )}

      {/* PLAYER BAR */}
      {currentTrack && (
        <div className="bottom-player">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 12, height: 12, background: '#e5fe40', borderRadius: '50%' }} />
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15 }}>{currentTrack.title}</div>
              <div style={{ fontSize: 12, color: '#888899' }}>{currentTrack.artistName}</div>
            </div>
          </div>
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            className={`btn-play-circle ${isPlaying ? 'playing' : ''}`}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ badge, title, description, ctaText, onCtaClick }) {
  return (
    <div className="dm-empty-state">
      <div className="dm-empty-badge">
        <span className="dm-pulse-dot" />
        {badge}
      </div>
      <div className="dm-waveform">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <div className="dm-empty-title">{title}</div>
      <div className="dm-empty-desc">{description}</div>
      <button onClick={onCtaClick} className="btn-drop dm-empty-cta">
        {ctaText}
      </button>
    </div>
  );
}
