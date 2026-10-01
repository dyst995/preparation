import { useCallback, useEffect, useState } from "react";
import MarkdownView from "./MarkdownView.jsx";
import Flashcards from "./Flashcards.jsx";
import { loadCatalog, loadNote } from "./api.js";
import {
  allTopics,
  availableTabs,
  defaultTab,
  findTopic,
  parseHash,
  setHash,
  splitAnswers,
  THEME_KEY,
} from "./lib.js";

export default function App() {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [route, setRoute] = useState(() => parseHash());
  const [note, setNote] = useState(null);
  const [answersOpen, setAnswersOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_KEY) || "dark",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch(() => setError("Could not load the notes catalog."));
  }, []);

  useEffect(() => {
    const onHash = () => {
      setAnswersOpen(false);
      setNavOpen(false);
      setRoute(parseHash());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  useEffect(() => {
    document.body.classList.toggle("nav-lock", navOpen);
    return () => document.body.classList.remove("nav-lock");
  }, [navOpen]);

  const found =
    catalog && route.topicDir
      ? findTopic(catalog, route.trackId, route.topicDir)
      : null;
  const topic = found?.topic;
  const tab = topic
    ? availableTabs(topic).some((t) => t.id === route.tab)
      ? route.tab
      : defaultTab(topic)
    : null;

  const filePath = topic && tab ? topic.files[tab] : null;

  useEffect(() => {
    if (!filePath) {
      setNote(null);
      return;
    }
    setNote(null);
    let cancelled = false;
    loadNote(filePath)
      .then((data) => {
        if (!cancelled) setNote(data);
      })
      .catch(() => {
        if (!cancelled) {
          setNote({ text: "Could not load this file.", path: filePath });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  const openTopic = useCallback((trackId, topicObj, nextTab) => {
    setNavOpen(false);
    setHash(trackId, topicObj.dir, nextTab || defaultTab(topicObj));
  }, []);

  const goHome = useCallback((id) => {
    setNavOpen(false);
    setHash(id);
  }, []);

  if (error) return <p className="empty">{error}</p>;
  if (!catalog) return <p className="empty">Loading catalog…</p>;

  return (
    <>
      <button
        type="button"
        id="nav-backdrop"
        aria-label="Close menu"
        hidden={!navOpen}
        onClick={() => setNavOpen(false)}
      />
      <aside id="sidebar" className={navOpen ? "open" : ""}>
        <div className="brand">
          <strong>Interview notes</strong>
          <span>Theory + flashcards</span>
          <button
            type="button"
            id="nav-close"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
          >
            Close
          </button>
        </div>
        <label className="search-wrap">
          <input
            id="search"
            type="search"
            placeholder="Search topics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </label>
        <Nav
          catalog={catalog}
          query={query}
          activeDir={route.topicDir}
          activeTrack={route.trackId}
          onHome={goHome}
          onTopic={openTopic}
        />
      </aside>
      <main id="main">
        <header id="topbar">
          <div className="topbar-left">
            <button
              type="button"
              id="nav-toggle"
              aria-expanded={navOpen}
              aria-controls="sidebar"
              onClick={() => setNavOpen((v) => !v)}
            >
              Menu
            </button>
            <Crumbs catalog={catalog} route={route} found={found} />
          </div>
          <button
            type="button"
            id="theme-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </header>
        {topic && (
          <div id="tabs">
            {availableTabs(topic).map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tab${t.id === tab ? " active" : ""}`}
                onClick={() => {
                  setAnswersOpen(false);
                  setHash(found.track.id, topic.dir, t.id);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <article id="content">
          <Page
            catalog={catalog}
            route={route}
            found={found}
            tab={tab}
            note={note}
            answersOpen={answersOpen}
            setAnswersOpen={setAnswersOpen}
            onOpenTopic={openTopic}
            onHome={goHome}
          />
        </article>
      </main>
    </>
  );
}

function Nav({ catalog, query, activeDir, activeTrack, onHome, onTopic }) {
  const q = query.trim().toLowerCase();
  return (
    <nav id="nav">
      {catalog.tracks.map((track) => (
        <section key={track.id} className="track">
          <button type="button" onClick={() => onHome(track.id)}>
            {track.name}
          </button>
          {track.modules.map((mod) => {
            const topics = mod.topics.filter((t) => {
              if (!q) return true;
              return (
                t.name.toLowerCase().includes(q) ||
                t.title.toLowerCase().includes(q) ||
                mod.name.toLowerCase().includes(q) ||
                track.name.toLowerCase().includes(q)
              );
            });
            if (!topics.length) return null;
            return (
              <details
                key={mod.id}
                className="mod"
                {...(Boolean(q) ||
                (track.id === activeTrack &&
                  topics.some((t) => t.dir === activeDir))
                  ? { open: true }
                  : {})}
              >
                <summary>{mod.name}</summary>
                {topics.map((topic) => (
                  <button
                    key={topic.dir}
                    type="button"
                    className={`topic${
                      track.id === activeTrack && topic.dir === activeDir
                        ? " active"
                        : ""
                    }`}
                    onClick={() => onTopic(track.id, topic)}
                  >
                    {topic.name}
                  </button>
                ))}
              </details>
            );
          })}
        </section>
      ))}
    </nav>
  );
}

function Crumbs({ catalog, route, found }) {
  if (!route.trackId) {
    return (
      <div id="crumbs">
        <strong>All tracks</strong>
      </div>
    );
  }
  if (!found) {
    const track = catalog.tracks.find((t) => t.id === route.trackId);
    return (
      <div id="crumbs">
        <strong>{track?.name || route.trackId}</strong>
      </div>
    );
  }
  return (
    <div id="crumbs">
      {found.track.name} · {found.mod.name} ·{" "}
      <strong>{found.topic.name}</strong>
    </div>
  );
}

function Page({
  catalog,
  route,
  found,
  tab,
  note,
  answersOpen,
  setAnswersOpen,
  onOpenTopic,
  onHome,
}) {
  if (!route.trackId) {
    return (
      <>
        <div className="md">
          <h1>Interview prep</h1>
          <p>
            Notes from this repo — study units (<code>notes.md</code>) and
            chapter files — plus flashcards when a topic has a{" "}
            <code>flashcards.json</code> deck. Checkboxes on notes and
            repetition are saved in this browser.
          </p>
        </div>
        <div className="home-grid">
          {catalog.tracks.map((track) => {
            const n = track.modules.reduce((a, m) => a + m.topics.length, 0);
            return (
              <button
                key={track.id}
                type="button"
                className="card"
                onClick={() => onHome(track.id)}
              >
                <h3>{track.name}</h3>
                <p>{n} topics</p>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  if (!found) {
    const track = catalog.tracks.find((t) => t.id === route.trackId);
    if (!track) {
      return <p className="empty">Unknown track.</p>;
    }
    return (
      <>
        <div className="md">
          <h1>{track.name}</h1>
        </div>
        <div className="home-grid">
          {allTopics(catalog)
            .filter((x) => x.track.id === track.id)
            .map((item) => (
              <button
                key={`${item.mod.id}-${item.topic.dir}`}
                type="button"
                className="card"
                onClick={() => onOpenTopic(track.id, item.topic)}
              >
                <h3>{item.topic.name}</h3>
                <p>{item.mod.name}</p>
              </button>
            ))}
        </div>
      </>
    );
  }

  if (!note) return <p className="empty">Loading…</p>;

  if (tab === "flashcards") {
    if (!note.data?.cards?.length) {
      return <p className="empty">No flashcards in this deck.</p>;
    }
    return <Flashcards deck={note.data} />;
  }

  if (tab === "selftest") {
    const { body, answers } = splitAnswers(note.text);
    return (
      <>
        <MarkdownView text={body} storageKey={note.path} />
        {answers && (
          <div className={`answers${answersOpen ? " open" : ""}`}>
            <button type="button" onClick={() => setAnswersOpen((v) => !v)}>
              {answersOpen ? "Hide answers" : "Show answers"}
            </button>
            <div className="body">
              <MarkdownView text={answers} />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <MarkdownView
      text={note.text}
      storageKey={
        tab === "notes" || tab === "repetition" || tab === "problems"
          ? note.path
          : null
      }
    />
  );
}
