import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoSearchOutline,
  IoNotificationsOutline,
  IoSunnyOutline,
  IoOpenOutline,
  IoCloseOutline,
} from 'react-icons/io5';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';

export default function Header() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeQuery, setActiveQuery] = useState('');
  const [showSearchCard, setShowSearchCard] = useState(false);
  const [searchSource, setSearchSource] = useState('educolink');
  const [googleProvider, setGoogleProvider] = useState('web');
  const [googleAnswer, setGoogleAnswer] = useState(null);
  const [googleSnippet, setGoogleSnippet] = useState(null);
  const [googleKnowledge, setGoogleKnowledge] = useState(null);

  const getDomain = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  };

  const getResultTitle = (item) => item?.title || item?.link || 'Result';
  const getResultLink = (item) => item?.link || item?.url || '';
  const getResultSnippet = (item) => item?.snippet || item?.description || 'No summary available.';
  const getResultDisplayLink = (item) => item?.displayLink || item?.displayedLink || getDomain(getResultLink(item));

  const handleAuthAction = () => {
    if (token) {
      logout();
      navigate('/login');
      return;
    }

    navigate('/login');
  };

  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'S';

  const runSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setShowSearchCard(false);
      setSearchResults([]);
      return;
    }

    setLoadingSearch(true);
    setSearchError('');
    setShowSearchCard(true);
    setActiveQuery(trimmed);
    setSearchSource('educolink');

    try {
      const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(trimmed)}`);

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results : [];

      setSearchResults(results);
      if (!results.length) {
        setSearchError('No EducoLink result found. Click Google to fetch web result cards.');
      }
    } catch (err) {
      setSearchResults([]);
      setSearchError(err.message || 'Unable to fetch search results.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const openGoogleSearch = () => {
    const trimmed = query.trim() || activeQuery;
    if (!trimmed) {
      return;
    }

    runGoogleCardSearch(trimmed);
  };

  const runGoogleCardSearch = async (keyword) => {
    setLoadingSearch(true);
    setSearchError('');
    setShowSearchCard(true);
    setActiveQuery(keyword);
    setSearchSource('google');

    try {
      const response = await fetch(`${API_BASE_URL}/api/search/web?q=${encodeURIComponent(keyword)}`);
      if (!response.ok) {
        throw new Error('Unable to fetch web search results');
      }

      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      setGoogleProvider(data?.provider || 'web');
      setGoogleAnswer(data?.answer || null);
      setGoogleSnippet(data?.snippet || null);
      setGoogleKnowledge(data?.knowledge || null);

      setSearchResults(results);
      if (!results.length && !data?.answer && !data?.knowledge) {
        setSearchError('No results found. Try another keyword.');
      }
    } catch (err) {
      setSearchResults([]);
      setGoogleAnswer(null);
      setGoogleSnippet(null);
      setGoogleKnowledge(null);
      setSearchError(err.message || 'Unable to fetch web search results.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    runSearch();
  };

  const closeSearchCard = () => {
    setShowSearchCard(false);
  };

  const hasDirectAnswerSection = Boolean(googleAnswer || googleKnowledge || googleSnippet);

  const directAnswerText =
    googleAnswer ||
    (googleKnowledge?.title ? String(googleKnowledge.title) : null) ||
    googleSnippet ||
    '';

  const directAnswerSnippet =
    (googleAnswer && (googleSnippet || googleKnowledge?.description)) ||
    (!googleAnswer && googleKnowledge?.description) ||
    null;

  return (
    <>
      <header className="header">
        <div className="header-search-wrap">
        <form className="header-search" onSubmit={handleSearchSubmit}>
          <IoSearchOutline />
          <input
            type="text"
            placeholder="Search modules, notes, lectures..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="search-google-btn" onClick={openGoogleSearch}>
            Google
          </button>
        </form>

        {showSearchCard && searchSource !== 'google' && (
          <div className="search-result-card">
            <div className="search-card-header">
              <div>
                <h4>{searchSource === 'google' ? 'Google Web Cards' : 'EducoLink Results'}</h4>
                <p>{activeQuery}</p>
              </div>
              <button
                type="button"
                className="search-card-close"
                onClick={closeSearchCard}
                aria-label="Close search results"
              >
                <IoCloseOutline />
              </button>
            </div>

            {loadingSearch && <div className="search-card-state">Searching...</div>}
            {!loadingSearch && searchError && <div className="search-card-state">{searchError}</div>}

            {!loadingSearch && !searchError && (
              <div className="search-results-list">
                {searchResults.map((item) => (
                  <a key={item.link + item.title} href={item.link} className="search-result-item">
                    <h5>{item.title}</h5>
                    <p>{item.description}</p>
                    <span>
                      Read more <IoOpenOutline />
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

        <div className="header-right">
        <button className="btn-icon" title="Toggle Theme">
          <IoSunnyOutline />
        </button>
        <button className="btn-icon" title="Notifications" style={{ position: 'relative' }}>
          <IoNotificationsOutline />
          <span style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '8px', height: '8px', borderRadius: '50%',
            background: 'var(--error)', border: '2px solid var(--surface-container-lowest)'
          }} />
        </button>
        <button
          className="auth-action-btn"
          onClick={handleAuthAction}
          title={token ? 'Logout' : 'Login'}
        >
          {token ? 'Logout' : 'Login'}
        </button>
        <div className="header-avatar" title="Profile">
          {userInitial}
        </div>
        </div>
      </header>

      {showSearchCard && searchSource === 'google' && (
        <>
          <div className="search-modal-backdrop" onClick={closeSearchCard} />
          <div className="search-result-card search-result-card-google">
            <div className="search-card-header">
              <div>
                <h4>Google Search</h4>
                <p>{activeQuery}</p>
                <p className="search-google-meta">Source: {googleProvider}</p>
              </div>
              <button
                type="button"
                className="search-card-close search-card-close-google"
                onClick={closeSearchCard}
                aria-label="Close search results"
              >
                <IoCloseOutline />
              </button>
            </div>

            {loadingSearch && <div className="search-card-state">Searching...</div>}
            {!loadingSearch && searchError && <div className="search-card-state">{searchError}</div>}

            {!loadingSearch && !searchError && (
              <div className="search-results-list search-results-list-google">
                {hasDirectAnswerSection && (
                  <section className="search-answer-card">
                    <div className="search-answer-title">{activeQuery}</div>
                    <div className="search-answer-text">{directAnswerText}</div>
                    {directAnswerSnippet && <p className="search-answer-snippet">{directAnswerSnippet}</p>}
                    <div className="search-answer-source">From Google</div>
                  </section>
                )}

                {searchResults.map((item, idx) => {
                  const title = getResultTitle(item);
                  const link = getResultLink(item);
                  const snippet = getResultSnippet(item);
                  const displayLink = getResultDisplayLink(item);
                  const key = `${link || 'nolink'}-${title}-${idx}`;

                  if (!link) {
                    return (
                      <div key={key} className="search-result-item search-result-item-google">
                        <div className="search-result-domain">{displayLink}</div>
                        <h5>{title}</h5>
                        <p>{snippet}</p>
                      </div>
                    );
                  }

                  return (
                    <a key={key} href={link} className="search-result-item search-result-item-google">
                      <div className="search-result-domain">{displayLink}</div>
                      <h5>{title}</h5>
                      <p>{snippet}</p>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
