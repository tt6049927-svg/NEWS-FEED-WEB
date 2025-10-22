/* AppBundle.js
   Single-file React + Vite News Feed App
   - Use VITE_NEWS_API_KEY in project root .env for live NewsAPI data
   - Includes dark/light theme toggle
   - Falls back to mock/demo data if no API key is found
   - Drop into /src in a Vite React project or upload to GitHub for preview
*/

/* ===== Imports ===== */
import React, { createContext, useContext, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

/* ===== Inline CSS (keeps file self-contained) ===== */
const css = `
:root{--bg:#ffffff;--text:#000000}
body{margin:0;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;background:var(--bg);color:var(--text);transition:background .25s,color .25s}
.light-mode{--bg:#ffffff;--text:#0f172a}
.dark-mode{--bg:#0b1220;--text:#e6eef6}
.container{max-width:1100px;margin:0 auto;padding:16px}
.navbar, .footer{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:8px;background:#111827;color:#fff;margin-bottom:12px}
.nav-left{display:flex;align-items:center;gap:12px}
.logo{width:44px;height:44px;object-fit:cover;border-radius:8px;background:#fff}
.nav-links a{margin-right:12px;color:inherit;text-decoration:none;font-weight:600}
.search-bar{display:flex;gap:8px;margin-bottom:12px}
.search-bar input{flex:1;padding:10px;border-radius:8px;border:1px solid #ccc}
.search-bar button{padding:10px 14px;border-radius:8px;border:0;background:#2563eb;color:#fff;cursor:pointer}
.category-filter{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.category-filter button{padding:8px 10px;border-radius:8px;border:1px solid #cbd5e1;background:transparent;cursor:pointer}
.news-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.news-card{border-radius:10px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);background:var(--card-bg,#fff);display:flex;flex-direction:column}
.news-card img{width:100%;height:180px;object-fit:cover}
.news-card .body{padding:12px;flex:1;display:flex;flex-direction:column}
.news-card h3{margin:0 0 8px;font-size:1.05rem}
.news-meta{display:flex;justify-content:space-between;font-size:0.85rem;color:#6b7280;margin-bottom:8px}
.news-actions{display:flex;justify-content:space-between;align-items:center;margin-top:12px}
.news-actions a{color:#2563eb;text-decoration:none}
.news-actions button{padding:8px 10px;border-radius:8px;border:0;background:#0ea5e9;color:#fff;cursor:pointer}
.pagination{display:flex;gap:8px;justify-content:center;align-items:center;margin-top:16px}
.empty{padding:28px;text-align:center;color:#6b7280}
.footer{margin-top:18px}
.theme-toggle{padding:8px 10px;border-radius:8px;border:0;background:#6b7280;color:#fff;cursor:pointer}
.small{font-size:0.9rem;color:#94a3b8}
`;

/* inject CSS */
if (typeof document !== "undefined") {
  const el = document.createElement("style");
  el.innerHTML = css;
  document.head.appendChild(el);
}

/* ===== Mock fallback articles ===== */
const DEMO_ARTICLES = [
  {
    source: { name: "Demo News" },
    author: "Author Demo",
    title: "Welcome to News Feed — Demo Mode",
    description: "This demo article appears when no API key is provided. Add VITE_NEWS_API_KEY to .env for live data.",
    url: "https://example.com/demo",
    urlToImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
    publishedAt: new Date().toISOString(),
    content: "Demo content. Replace with live articles when an API key is added.",
  },
  {
    source: { name: "DemoTech" },
    author: "Tech Demo",
    title: "Mock: Tech trends in classrooms",
    description: "Example mock description for tech category.",
    url: "https://example.com/tech-demo",
    urlToImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
    publishedAt: new Date().toISOString(),
    content: "Demo tech content.",
  },
];

/* ===== Bookmark Context (localStorage persistence) ===== */
const BookmarkContext = createContext();

function BookmarkProvider({ children }) {
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("news_bookmarks_v1");
      if (raw) setBookmarks(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load bookmarks:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("news_bookmarks_v1", JSON.stringify(bookmarks));
    } catch (e) {
      console.warn("Failed to save bookmarks:", e);
    }
  }, [bookmarks]);

  const add = (article) => {
    setBookmarks((prev) => {
      if (prev.some((p) => p.url === article.url)) return prev;
      return [article, ...prev];
    });
  };

  const remove = (article) => {
    setBookmarks((prev) => prev.filter((p) => p.url !== article.url));
  };

  return <BookmarkContext.Provider value={{ bookmarks, addBookmark: add, removeBookmark: remove }}>{children}</BookmarkContext.Provider>;
}

/* ===== newsAPI service (Vite-ready) ===== */
async function fetchNews({ query = "", category = "general", page = 1 } = {}) {
  const API_KEY = import.meta?.env?.VITE_NEWS_API_KEY || null; // Vite env
  const BASE = "https://newsapi.org/v2";

  if (!API_KEY) {
    // fallback to demo
    return { articles: DEMO_ARTICLES, totalResults: DEMO_ARTICLES.length };
  }

  let url;
  if (query && query.trim()) {
    url = `${BASE}/everything?q=${encodeURIComponent(query)}&pageSize=20&page=${page}&apiKey=${API_KEY}`;
  } else if (category && category !== "general") {
    url = `${BASE}/top-headlines?country=us&category=${encodeURIComponent(category)}&pageSize=20&page=${page}&apiKey=${API_KEY}`;
  } else {
    url = `${BASE}/top-headlines?country=us&pageSize=20&page=${page}&apiKey=${API_KEY}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      console.error("NewsAPI error", res.status, txt);
      return { articles: [], totalResults: 0, error: txt || res.statusText };
    }
    const data = await res.json();
    return { articles: data.articles || [], totalResults: data.totalResults || 0 };
  } catch (err) {
    console.error("Fetch failed", err);
    return { articles: [], totalResults: 0, error: String(err) };
  }
}

/* ===== Components ===== */

function Navbar({ onToggleTheme, theme }) {
  return (
    <header className="navbar">
      <div className="nav-left">
        <img className="logo" src="https://raw.githubusercontent.com/favicon-io/favicon-generator/main/demo/logo-192.png" alt="logo" />
        <div>
          <div style={{ fontWeight: 700 }}>News Feed</div>
          <div className="small">Latest headlines</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <nav className="nav-links" aria-label="Main navigation">
          <Link to="/">Home</Link>
          <Link to="/bookmarks">Bookmarks</Link>
          <a href="https://newsapi.org/" target="_blank" rel="noreferrer">About</a>
        </nav>
        <button className="theme-toggle" onClick={onToggleTheme}>
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="small">© {new Date().getFullYear()} News Feed</div>
      <div className="small">Built with React + Vite</div>
    </footer>
  );
}

function SearchBar({ onSearch }) {
  function submit(e) {
    e.preventDefault();
    const q = e.target.search?.value || "";
    onSearch(q);
  }
  return (
    <form className="search-bar" onSubmit={submit}>
      <input name="search" placeholder="Search news (e.g., bitcoin, space)..." />
      <button type="submit">Search</button>
    </form>
  );
}

function CategoryFilter({ onSelect }) {
  const cats = ["General", "Technology", "Sports", "Business", "Health", "Entertainment", "Science"];
  return (
    <div className="category-filter" role="toolbar" aria-label="Categories">
      {cats.map((c) => (
        <button key={c} onClick={() => onSelect(c.toLowerCase())}>
          {c}
        </button>
      ))}
    </div>
  );
}

function Pagination({ page, onChange }) {
  return (
    <div className="pagination">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}>Prev</button>
      <div>Page {page}</div>
      <button onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}

function NewsCard({ article }) {
  const { bookmarks, addBookmark, removeBookmark } = useContext(BookmarkContext);
  const isBookmarked = bookmarks.some((b) => b.url === article.url);
  return (
    <article className="news-card" role="article">
      <img src={article.urlToImage || "https://via.placeholder.com/800x450?text=No+Image"} alt={article.title} />
      <div className="body">
        <h3>{article.title}</h3>
        <div className="news-meta">
          <span>{article.source?.name || "Unknown"}</span>
          <span>{new Date(article.publishedAt || Date.now()).toLocaleDateString()}</span>
        </div>
        <p style={{ flex: 1 }}>{article.description}</p>
        <div className="news-actions">
          <a href={article.url} target="_blank" rel="noreferrer">Read More</a>
          <button onClick={() => (isBookmarked ? removeBookmark(article) : addBookmark(article))}>
            {isBookmarked ? "Remove" : "Bookmark"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ===== Pages ===== */

function Home() {
  const [articles, setArticles] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("general");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load(q = query, c = category, p = page) {
    setLoading(true);
    setError(null);
    const res = await fetchNews({ query: q, category: c, page: p });
    if (res.error) setError(res.error);
    setArticles(res.articles || []);
    setLoading(false);
  }

  useEffect(() => {
    load("", "general", 1); // initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(query, category, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function onSearch(q) {
    setQuery(q);
    setPage(1);
    load(q, "general", 1);
  }

  function onCategory(c) {
    setCategory(c);
    setQuery("");
    setPage(1);
    load("", c, 1);
  }

  return (
    <main className="container" role="main">
      <SearchBar onSearch={onSearch} />
      <CategoryFilter onSelect={onCategory} />
      {loading ? (
        <div className="empty">Loading news…</div>
      ) : error ? (
        <div className="empty">Error: {String(error)}</div>
      ) : articles.length === 0 ? (
        <div className="empty">No news found.</div>
      ) : (
        <>
          <div className="news-grid">
            {articles.map((a, i) => (
              <NewsCard key={a.url || i} article={a} />
            ))}
          </div>
          <Pagination page={page} onChange={(p) => setPage(p)} />
        </>
      )}
    </main>
  );
}

function BookmarksPage() {
  const { bookmarks } = useContext(BookmarkContext);
  return (
    <main className="container">
      <h2>Saved Articles</h2>
      {bookmarks.length === 0 ? (
        <div className="empty">No bookmarks yet.</div>
      ) : (
        <div className="news-grid">
          {bookmarks.map((b, i) => (
            <NewsCard key={b.url || i} article={b} />
          ))}
        </div>
      )}
    </main>
  );
}

function ArticleDetails() {
  const loc = useLocation();
  const navigate = useNavigate();
  const article = loc.state?.article;

  if (!article) {
    return (
      <main className="container">
        <div className="empty">No article selected. Go back to <Link to="/">Home</Link>.</div>
      </main>
    );
  }

  return (
    <main className="container">
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>← Back</button>
      <div className="news-card" style={{ maxWidth: 900, margin: "0 auto" }}>
        <img src={article.urlToImage || "https://via.placeholder.com/1200x600"} alt={article.title} />
        <div className="body">
          <h2>{article.title}</h2>
          <div className="news-meta">
            <span>{article.source?.name}</span>
            <span>{new Date(article.publishedAt || Date.now()).toLocaleString()}</span>
          </div>
          <p>{article.description}</p>
          <div style={{ marginTop: 12 }}>{article.content}</div>
          <div style={{ marginTop: 12 }}>
            <a href={article.url} target="_blank" rel="noreferrer">Read original article</a>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ===== Main App ===== */
function AppWrapper() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.body.className = theme === "dark" ? "dark-mode" : "light-mode";
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <BookmarkProvider>
      <Router>
        <div>
          <Navbar onToggleTheme={toggleTheme} theme={theme} />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/article" element={<ArticleDetails />} />
            <Route path="*" element={<main className="container"><div className="empty">Page not found — <Link to="/">Home</Link></div></main>} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </BookmarkProvider>
  );
}

/* ===== Mounting when file is used in /src ===== */
if (typeof document !== "undefined") {
  const rootEl = document.getElementById("root") || (() => {
    const d = document.createElement("div");
    d.id = "root";
    document.body.appendChild(d);
    return d;
  })();

  try {
    ReactDOM.createRoot(rootEl).render(<React.StrictMode><AppWrapper /></React.StrictMode>);
  } catch (err) {
    console.error("Render error:", err);
    rootEl.innerHTML = "<pre style='color:red;padding:12px'>App failed to render — check console.</pre>";
  }
}

/* ===== Export (so GitHub preview or imports work) ===== */
export default AppWrapper;

/* ===== NOTES =====
1) For live NewsAPI use: create file .env (project root) with:
   VITE_NEWS_API_KEY=your_actual_key

   restart dev server after adding .env.

2) Commands (Vite project):
   npm install
   npm run dev

3) This file is self-contained for GitHub uploading as a single-file showcase.
   For production dev, split into modules under /src.
*/
