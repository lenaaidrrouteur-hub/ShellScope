import {
  Alert24Regular,
  ArrowSync24Regular,
  Bot24Regular,
  History24Regular,
  Home24Regular,
  Settings24Regular,
  ShieldCheckmark24Regular,
} from "@fluentui/react-icons";

export const Sidebar = () => (
  <aside className="sidebar">
    <div className="brand">
      <span className="brand-mark">&gt;_</span>
      <span>ShellScope</span>
    </div>
    <nav aria-label="Navigation principale">
      <a className="nav-item active" href="#overview">
        <Home24Regular />
        Vue d’ensemble
      </a>
      <a className="nav-item" href="#issues">
        <Alert24Regular />
        Problèmes
      </a>
      <a className="nav-item" href="#path">
        <ArrowSync24Regular />
        PATH
      </a>
      <a className="nav-item" href="#shells">
        <span className="nav-glyph">$</span>Shells
      </a>
      <a className="nav-item" href="#advisor">
        <span className="nav-glyph">?</span>Conseil
      </a>
      <a className="nav-item" href="#python">
        <span className="nav-glyph">Py</span>Python
      </a>
      <a className="nav-item" href="#project">
        <span className="nav-glyph">+</span>Nouveau projet
      </a>
      <a className="nav-item" href="#codex">
        <Bot24Regular />
        Codex
      </a>
      <button className="nav-item" type="button" disabled title="À venir">
        <History24Regular />
        Historique
      </button>
    </nav>
    <div className="sidebar-bottom">
      <button className="nav-item" type="button" disabled title="À venir">
        <Settings24Regular />
        Paramètres
      </button>
      <div className="safety-mini">
        <ShieldCheckmark24Regular />
        <span>
          Aucune modification
          <br />
          sans confirmation
        </span>
      </div>
    </div>
  </aside>
);
