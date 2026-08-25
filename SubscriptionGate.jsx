import React, { createContext, useContext, useEffect, useState } from 'react';

const API_URL = 'http://localhost:5001';

// Lets any component under SubscriptionGate (e.g. DanMusic) read the
// logged-in user, whether they're premium, and trigger upgrade/logout,
// without SubscriptionGate having to block rendering on subscription status.
const DanMusicAuthContext = createContext(null);

export function useDanMusicAuth() {
  return useContext(DanMusicAuthContext);
}

export default function SubscriptionGate({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [user, setUser] = useState(null);

  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    const token = localStorage.getItem('danmusic_token');

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setAuthenticated(true);
        setUser(data.user);
        setSubscribed(Boolean(data.user?.hasActiveSubscription));
        localStorage.setItem('danmusic_user', JSON.stringify(data.user));
      } else {
        // Bad/expired token — treat as logged out rather than stuck.
        localStorage.removeItem('danmusic_token');
        localStorage.removeItem('danmusic_user');
        setAuthenticated(false);
      }
    } catch {
      // Server unreachable — don't fake a session, just show the login screen.
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    setProcessing(true);
    setError('');

    try {
      const endpoint =
        mode === 'login'
          ? '/api/login'
          : '/api/register';

      const body =
        mode === 'login'
          ? {
              email,
              password
            }
          : {
              name,
              email,
              password
            };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Something went wrong.'
        );
      }

      if (mode === 'register') {
        setMode('login');
        setError('');
        return;
      }

      localStorage.setItem(
        'danmusic_token',
        data.token
      );

      localStorage.setItem(
        'danmusic_user',
        JSON.stringify(data.user)
      );

      setAuthenticated(true);
      setUser(data.user);
      setSubscribed(
        Boolean(data.user?.hasActiveSubscription)
      );
    } catch (err) {
      setError(
        err.message ||
        'Unable to connect to DanMusic.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('danmusic_token');
    localStorage.removeItem('danmusic_user');
    setAuthenticated(false);
    setSubscribed(false);
    setUser(null);
    setEmail('');
    setPassword('');
    setName('');
    setMode('login');
  };

  const handleDevelopmentSubscription = async () => {
    const token = localStorage.getItem('danmusic_token');

    if (!token) {
      setError('Please log in first.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      /*
       * DEVELOPMENT PAYMENT MODE
       *
       * Your current server activates the 299 PKR
       * membership for testing.
       *
       * This is NOT a real payment gateway.
       */
      const response = await fetch(
        `${API_URL}/api/subscribe`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Unable to activate membership.'
        );
      }

      if (data.token) {
        localStorage.setItem(
          'danmusic_token',
          data.token
        );
      }

      if (data.user) {
        localStorage.setItem(
          'danmusic_user',
          JSON.stringify(data.user)
        );
        setUser(data.user);
      }

      setSubscribed(true);
    } catch (err) {
      setError(
        err.message ||
        'Subscription activation failed.'
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!authenticated) {
    return (
      <div className="dm-gate">
        <GateStyles />
        <GateNavbar />

        <main className="dm-gate-main">
          <div className="dm-eyebrow">
            DANMUSIC COMMUNITY
          </div>

          <h1 className="dm-title">
            DISCOVER THEM
            <br />
            <span>BEFORE THEY'RE FAMOUS.</span>
          </h1>

          <p className="dm-description">
            A home for emerging artists, producers,
            singers, rappers and independent creators.
          </p>

          <div className="dm-auth-card">
            <div className="dm-card-heading">
              {mode === 'login'
                ? 'WELCOME BACK'
                : 'JOIN DANMUSIC'}
            </div>

            <div className="dm-card-subheading">
              {mode === 'login'
                ? 'Log in to continue.'
                : 'Create your DanMusic account.'}
            </div>

            <form onSubmit={handleAuth}>
              {mode === 'register' && (
                <>
                  <label className="dm-label">
                    NAME
                  </label>

                  <input
                    className="dm-input"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    placeholder="Your name"
                    required
                  />
                </>
              )}

              <label className="dm-label">
                EMAIL
              </label>

              <input
                className="dm-input"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                required
              />

              <label className="dm-label">
                PASSWORD
              </label>

              <input
                className="dm-input"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="••••••••"
                minLength={6}
                required
              />

              {error && (
                <div className="dm-error">
                  {error}
                </div>
              )}

              <button
                className="dm-primary-button"
                type="submit"
                disabled={processing}
              >
                {processing
                  ? 'PLEASE WAIT...'
                  : mode === 'login'
                    ? 'LOGIN'
                    : 'CREATE ACCOUNT'}
              </button>
            </form>

            <button
              className="dm-switch-button"
              onClick={() => {
                setMode(
                  mode === 'login'
                    ? 'register'
                    : 'login'
                );
                setError('');
              }}
            >
              {mode === 'login'
                ? 'NEW TO DANMUSIC? CREATE ACCOUNT'
                : 'ALREADY HAVE AN ACCOUNT? LOGIN'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // No paywall — everyone who's logged in gets the app. Premium status,
  // the current user, and the upgrade/logout actions are handed down
  // through context so DanMusic (or anything else inside) can use them
  // to gate specific premium features instead of the whole app.
  return (
    <DanMusicAuthContext.Provider
      value={{
        user,
        isPremium: subscribed,
        upgrade: handleDevelopmentSubscription,
        upgrading: processing,
        upgradeError: error,
        clearUpgradeError: () => setError(''),
        logout: handleLogout
      }}
    >
      {children}
    </DanMusicAuthContext.Provider>
  );
}

function LoadingScreen() {
  return (
    <div className="dm-loading">
      <div className="dm-loading-logo">
        D
      </div>

      <div className="dm-loading-text">
        LOADING DANMUSIC...
      </div>

      <GateStyles />
    </div>
  );
}

function GateNavbar() {
  return (
    <header className="dm-gate-navbar">
      <div className="dm-brand">
        <div className="dm-logo">
          D
        </div>

        <div className="dm-brand-name">
          DANMUSIC COMMUNITY
        </div>
      </div>

      <div className="dm-tag">
        ALL IN ONE PLACE
      </div>
    </header>
  );
}

function GateStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Syne:wght@700;800;900&display=swap');

      .dm-gate,
      .dm-loading {
        min-height: 100vh;
        background: #0d0d0f;
        color: #f2f2f5;
        font-family: 'Space Grotesk', sans-serif;
      }

      .dm-gate-navbar {
        height: 76px;
        background: #000;
        border-bottom: 2px solid #1f1f28;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 32px;
      }

      .dm-brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .dm-logo,
      .dm-loading-logo {
        width: 38px;
        height: 38px;
        background: #e5fe40;
        color: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Syne', sans-serif;
        font-size: 22px;
        font-weight: 900;
        transform: rotate(-3deg);
      }

      .dm-brand-name {
        color: #fff;
        font-family: 'Syne', sans-serif;
        font-weight: 900;
        font-size: 20px;
        letter-spacing: -1px;
      }

      .dm-tag {
        color: #e5fe40;
        background: #121216;
        border: 1px solid #2d2d3a;
        padding: 6px 10px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1px;
      }

      .dm-gate-main {
        width: 100%;
        max-width: 650px;
        margin: auto;
        padding: 75px 22px 90px;
        text-align: center;
      }

      .dm-eyebrow {
        color: #e5fe40;
        font-family: 'Syne', sans-serif;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 2px;
        margin-bottom: 18px;
      }

      .dm-title {
        margin: 0 0 22px;
        font-family: 'Syne', sans-serif;
        font-size: clamp(42px, 8vw, 72px);
        line-height: .92;
        letter-spacing: -4px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .dm-title span {
        color: #e5fe40;
      }

      .dm-description {
        color: #9a9ab0;
        max-width: 510px;
        margin: 0 auto 38px;
        font-size: 14px;
        line-height: 1.7;
      }

      .dm-auth-card,
      .dm-subscription-card {
        background: #121216;
        border: 2px solid #2d2d3a;
        border-top: 4px solid #e5fe40;
        padding: 30px;
        text-align: left;
      }

      .dm-card-heading {
        color: #fff;
        font-family: 'Syne', sans-serif;
        font-size: 24px;
        font-weight: 900;
      }

      .dm-card-subheading {
        color: #777788;
        font-size: 13px;
        margin: 5px 0 25px;
      }

      .dm-label,
      .dm-small-label {
        display: block;
        color: #777788;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1px;
        margin-bottom: 7px;
      }

      .dm-input {
        width: 100%;
        background: #0a0a0d;
        border: 1px solid #242430;
        color: #fff;
        padding: 13px 14px;
        margin-bottom: 17px;
        outline: none;
        font-family: 'Space Grotesk', sans-serif;
      }

      .dm-input:focus {
        border-color: #e5fe40;
      }

      .dm-primary-button {
        width: 100%;
        background: #e5fe40;
        color: #000;
        border: 2px solid #e5fe40;
        padding: 15px;
        font-family: 'Syne', sans-serif;
        font-weight: 900;
        font-size: 12px;
        cursor: pointer;
        transition: .15s ease;
      }

      .dm-primary-button:hover:not(:disabled) {
        background: #000;
        color: #e5fe40;
      }

      .dm-primary-button:disabled {
        opacity: .55;
        cursor: wait;
      }

      .dm-switch-button {
        width: 100%;
        margin-top: 17px;
        background: transparent;
        border: 0;
        color: #777788;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .7px;
        cursor: pointer;
      }

      .dm-switch-button:hover {
        color: #e5fe40;
      }

      .dm-plan-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .dm-plan-name {
        color: #fff;
        font-family: 'Syne', sans-serif;
        font-size: 21px;
        font-weight: 900;
      }

      .dm-monthly {
        background: #e5fe40;
        color: #000;
        padding: 5px 8px;
        font-size: 9px;
        font-weight: 900;
      }

      .dm-price {
        color: #fff;
        font-family: 'Syne', sans-serif;
        font-size: 64px;
        font-weight: 900;
        letter-spacing: -3px;
        margin: 28px 0 22px;
      }

      .dm-price span {
        color: #e5fe40;
        font-size: 13px;
        letter-spacing: 0;
        margin-right: 8px;
      }

      .dm-price small {
        color: #777788;
        font-family: 'Space Grotesk', sans-serif;
        font-size: 12px;
        font-weight: 400;
        letter-spacing: 0;
      }

      .dm-divider {
        height: 1px;
        background: #24242e;
        margin-bottom: 20px;
      }

      .dm-benefits {
        display: flex;
        flex-direction: column;
        gap: 13px;
        margin-bottom: 25px;
      }

      .dm-benefits div {
        color: #c4c4d4;
        font-size: 13px;
      }

      .dm-benefits b {
        color: #e5fe40;
        margin-right: 10px;
      }

      .dm-error {
        background: #190b10;
        border: 1px solid #ff3366;
        color: #ff6b8c;
        padding: 11px 12px;
        margin-bottom: 14px;
        font-size: 12px;
      }

      .dm-development {
        color: #555563;
        text-align: center;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 1px;
        margin-top: 13px;
      }

      .dm-footer-note {
        color: #555563;
        font-size: 9px;
        letter-spacing: 1px;
        margin-top: 20px;
      }

      .dm-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .dm-loading-logo {
        margin-bottom: 18px;
      }

      .dm-loading-text {
        color: #777788;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1px;
      }

      @media (max-width: 600px) {
        .dm-gate-navbar {
          padding: 0 18px;
        }

        .dm-brand-name {
          font-size: 15px;
        }

        .dm-tag {
          display: none;
        }

        .dm-gate-main {
          padding: 55px 18px 75px;
        }

        .dm-title {
          letter-spacing: -2px;
        }

        .dm-auth-card,
        .dm-subscription-card {
          padding: 22px;
        }

        .dm-price {
          font-size: 52px;
        }
      }
    `}</style>
  );
}
