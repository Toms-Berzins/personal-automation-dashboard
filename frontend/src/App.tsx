import React, { useState } from 'react';
import ScraperDashboard from './components/ScraperDashboard';
import PriceHistory from './components/PriceHistory';
import './styles/App.css';

type Tab = 'scraper' | 'history';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('scraper');

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1 className="logo">
            <span className="logo-icon">🔍</span>
            Automation Dashboard
          </h1>
          <p className="subtitle">On-Demand Web Scraper & Price Tracker</p>
        </div>
      </header>

      <nav className="tabs">
        <div className="container">
          <button
            className={`tab ${activeTab === 'scraper' ? 'active' : ''}`}
            onClick={() => setActiveTab('scraper')}
          >
            🚀 Scraper
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📊 Price History
          </button>
        </div>
      </nav>

      <main className="main">
        <div className="container">
          {activeTab === 'scraper' && <ScraperDashboard />}
          {activeTab === 'history' && <PriceHistory />}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>Powered by Firecrawl API • PostgreSQL • React + TypeScript</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
