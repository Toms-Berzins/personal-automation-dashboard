import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ScraperDashboard from './components/ScraperDashboard';
import PriceHistory from './components/PriceHistory';
import AIChatWidget from './components/AIChatWidget';
import AIInsightsPanel from './components/AIInsightsPanel';
import UsageTracker from './components/UsageTracker';
import PelletTracker from './components/pellets/PelletTracker';
import './styles/App.css';

type Tab = 'scraper' | 'history' | 'pellets' | 'usage' | 'ai-insights';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('scraper');

  const getPageTitle = (tab: Tab): string => {
    const titles = {
      scraper: 'Web Scraper',
      history: 'Price History',
      pellets: 'Pellet Tracker',
      usage: 'Usage Tracker',
      'ai-insights': 'AI Insights',
    };
    return titles[tab];
  };

  const getPageDescription = (tab: Tab): string => {
    const descriptions = {
      scraper: 'On-demand web scraping powered by Firecrawl API',
      history: 'Track price trends and historical data',
      pellets: 'Track pellet stock, consumption, and heating material inventory',
      usage: 'Monitor API usage and consumption metrics',
      'ai-insights': 'AI-powered analysis and insights',
    };
    return descriptions[tab];
  };

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as Tab)} />

      <div className="app-content">
        <header className="page-header">
          <div className="header-content">
            <h1 className="page-title">{getPageTitle(activeTab)}</h1>
            <p className="page-description">{getPageDescription(activeTab)}</p>
          </div>
        </header>

        <main className="main-content">
          {activeTab === 'scraper' && <ScraperDashboard />}
          {activeTab === 'history' && <PriceHistory />}
          {activeTab === 'pellets' && <PelletTracker />}
          {activeTab === 'usage' && <UsageTracker />}
          {activeTab === 'ai-insights' && <AIInsightsPanel />}
        </main>

        <footer className="footer">
          <p>Powered by Firecrawl API • PostgreSQL • React + TypeScript • OpenAI GPT-5 Nano</p>
        </footer>
      </div>

      {/* AI Chat Widget - Available on all pages */}
      <AIChatWidget />
    </div>
  );
}

export default App;
