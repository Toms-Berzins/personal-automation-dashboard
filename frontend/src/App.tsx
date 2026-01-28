import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ScraperDashboard from './components/ScraperDashboard';
import PriceHistory from './components/PriceHistory';
import AIChatWidget from './components/AIChatWidget';
import AIInsightsPanel from './components/AIInsightsPanel';
import UsageTracker from './components/UsageTracker';
import PelletTracker from './components/pellets/PelletTracker';
import WeatherDashboard from './components/weather/WeatherDashboard';
import HeaterDashboard from './components/heater/HeaterDashboard';
import './styles/App.css';

type Tab = 'scraper' | 'history' | 'pellets' | 'heater' | 'weather' | 'usage' | 'ai-insights';

function App() {
  // Read initial tab from URL hash
  const getInitialTab = (): Tab => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    const validTabs: Tab[] = ['scraper', 'history', 'pellets', 'heater', 'weather', 'usage', 'ai-insights'];
    return validTabs.includes(hash as Tab) ? (hash as Tab) : 'scraper';
  };

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab());

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const newTab = getInitialTab();
      setActiveTab(newTab);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const getPageTitle = (tab: Tab): string => {
    const titles = {
      scraper: 'Web Scraper',
      history: 'Price History',
      pellets: 'Pellet Tracker',
      heater: 'Heater Dashboard',
      weather: 'Weather Forecast',
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
      heater: 'Monitor Centrometal PelTec Lambda heater status and statistics',
      weather: 'Live weather forecast and historical data for Jelgava, Latvia',
      usage: 'Monitor API usage and consumption metrics',
      'ai-insights': 'AI-powered analysis and insights',
    };
    return descriptions[tab];
  };

  // Handle tab change and update URL
  const handleTabChange = (tab: string) => {
    const newTab = tab as Tab;
    setActiveTab(newTab);
    window.location.hash = `#/${newTab}`;
  };

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

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
          {activeTab === 'heater' && <HeaterDashboard />}
          {activeTab === 'weather' && <WeatherDashboard />}
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
