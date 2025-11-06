import React, { useState, useEffect } from 'react';
import StockPurchaseForm from './StockPurchaseForm';
import WeeklyConsumptionForm from './WeeklyConsumptionForm';
import StockOverview from './StockOverview';
import ConsumptionHistory from './ConsumptionHistory';
import type { DashboardData, CreateStockPurchase, CreateConsumption } from '../../types/pellets';
import {
  getDashboardData,
  addStockPurchase,
  logConsumption,
  deleteConsumption,
} from '../../services/pelletApi';
import './pellets.css';

type View = 'overview' | 'add-stock' | 'log-consumption' | 'history';

const PelletTracker: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardData();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle stock purchase submission
  const handleAddStock = async (data: CreateStockPurchase) => {
    try {
      await addStockPurchase(data);
      setSuccessMessage('Stock purchase added successfully!');
      setCurrentView('overview');
      await loadDashboardData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      throw err; // Let the form handle the error
    }
  };

  // Handle consumption submission
  const handleLogConsumption = async (data: CreateConsumption) => {
    try {
      await logConsumption(data);
      setSuccessMessage('Consumption logged successfully!');
      setCurrentView('overview');
      await loadDashboardData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      throw err; // Let the form handle the error
    }
  };

  // Handle consumption deletion
  const handleDeleteConsumption = async (id: number) => {
    try {
      await deleteConsumption(id);
      setSuccessMessage('Consumption record deleted');
      await loadDashboardData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    }
  };

  if (loading) {
    return (
      <div className="pellet-tracker loading-state">
        <div className="loading-content">
          <span className="spinner-large"></span>
          <p>Loading pellet tracker...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="pellet-tracker error-state">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <h3>Failed to Load Data</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadDashboardData}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pellet-tracker">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="toast toast-success">
          <span className="toast-icon">✓</span>
          <span className="toast-message">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="toast toast-error">
          <span className="toast-icon">⚠️</span>
          <span className="toast-message">{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tracker-tabs">
        <button
          className={`tab ${currentView === 'overview' ? 'active' : ''}`}
          onClick={() => setCurrentView('overview')}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-label">Overview</span>
        </button>
        <button
          className={`tab ${currentView === 'add-stock' ? 'active' : ''}`}
          onClick={() => setCurrentView('add-stock')}
        >
          <span className="tab-icon">➕</span>
          <span className="tab-label">Add Stock</span>
        </button>
        <button
          className={`tab ${currentView === 'log-consumption' ? 'active' : ''}`}
          onClick={() => setCurrentView('log-consumption')}
        >
          <span className="tab-icon">🔥</span>
          <span className="tab-label">Log Usage</span>
        </button>
        <button
          className={`tab ${currentView === 'history' ? 'active' : ''}`}
          onClick={() => setCurrentView('history')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-label">History</span>
        </button>
      </div>

      {/* View Content */}
      <div className="tracker-content">
        {currentView === 'overview' && dashboardData && (
          <StockOverview
            currentStock={dashboardData.currentStock}
            projection={dashboardData.projection}
            onQuickEntry={() => setCurrentView('log-consumption')}
            onAddStock={() => setCurrentView('add-stock')}
          />
        )}

        {currentView === 'add-stock' && (
          <StockPurchaseForm
            onSubmit={handleAddStock}
            onCancel={() => setCurrentView('overview')}
          />
        )}

        {currentView === 'log-consumption' && (
          <WeeklyConsumptionForm
            onSubmit={handleLogConsumption}
            onCancel={() => setCurrentView('overview')}
          />
        )}

        {currentView === 'history' && dashboardData && (
          <ConsumptionHistory
            consumptions={dashboardData.recentConsumption}
            onDelete={handleDeleteConsumption}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

export default PelletTracker;
