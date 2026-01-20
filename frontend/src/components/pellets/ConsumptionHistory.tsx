import React, { useState } from 'react';
import type { Consumption } from '../../types/pellets';
import { formatNumber } from '../../services/pelletApi';

interface ConsumptionHistoryProps {
  consumptions: Consumption[];
  onEdit?: (consumption: Consumption) => void;
  onDelete?: (id: number) => void;
  loading?: boolean;
}

const ConsumptionHistory: React.FC<ConsumptionHistoryProps> = ({
  consumptions,
  onEdit,
  onDelete,
  loading = false,
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const handleDeleteClick = (id: number) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId !== null && onDelete) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  if (loading) {
    return (
      <div className="consumption-history loading">
        <div className="loading-spinner">
          <span className="spinner"></span>
          <p>Loading consumption history...</p>
        </div>
      </div>
    );
  }

  if (consumptions.length === 0) {
    return (
      <div className="consumption-history empty">
        <div className="empty-state">
          <span className="empty-icon empty-icon--history"></span>
          <h3>No Consumption Records Yet</h3>
          <p className="empty-description">
            Start logging your weekly pellet consumption to track your heating usage and optimize your purchases.
          </p>
          <div className="empty-tips">
            <h4>Getting Started:</h4>
            <ul>
              <li>Switch to the <strong>"Log Usage"</strong> tab to record your first week</li>
              <li>Enter the number of bags you've used this week</li>
              <li>Optional: Add temperature and heating hours for better insights</li>
              <li>Track patterns over time to predict when to reorder</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Calculate monthly totals
  const monthlyTotals: { [key: string]: { bags: number; kg: number; weeks: number } } = {};
  consumptions.forEach((c) => {
    const monthKey = c.week_start_date.substring(0, 7); // YYYY-MM
    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = { bags: 0, kg: 0, weeks: 0 };
    }
    monthlyTotals[monthKey].bags += c.bags_used;
    monthlyTotals[monthKey].kg += c.manual_weight_kg || c.weight_kg;
    monthlyTotals[monthKey].weeks += 1;
  });

  return (
    <div className="consumption-history">
      <div className="history-header">
        <h3>Consumption History</h3>
        <p className="history-subtitle">
          Showing {consumptions.length} week{consumptions.length !== 1 ? 's' : ''} of data
        </p>
      </div>

      {/* Monthly Summary Cards */}
      <div className="monthly-summary">
        <h4>Monthly Summary</h4>
        <div className="summary-cards">
          {Object.entries(monthlyTotals)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 3)
            .map(([month, totals]) => (
              <div key={month} className="summary-card">
                <div className="card-month">
                  {new Date(month + '-01').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </div>
                <div className="card-stats">
                  <div className="card-stat">
                    <span className="stat-value">{formatNumber(totals.bags)}</span>
                    <span className="stat-label">bags</span>
                  </div>
                  <div className="card-stat">
                    <span className="stat-value">{formatNumber(totals.kg, 1)}</span>
                    <span className="stat-label">kg</span>
                  </div>
                  <div className="card-stat">
                    <span className="stat-value">{totals.weeks}</span>
                    <span className="stat-label">weeks</span>
                  </div>
                </div>
                <div className="card-avg">
                  Avg: {formatNumber(totals.bags / totals.weeks, 1)} bags/week
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Consumption Table */}
      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>Week</th>
              <th>Period</th>
              <th className="text-right">Bags Used</th>
              <th className="text-right">Weight (kg)</th>
              <th className="text-center">
                Temp (°C) <span className="optional-header">Optional</span>
              </th>
              <th className="text-center">
                Hours <span className="optional-header">Optional</span>
              </th>
              <th>
                Notes <span className="optional-header">Optional</span>
              </th>
              {(onEdit || onDelete) && <th className="text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {consumptions.map((consumption) => (
              <tr
                key={consumption.id}
                className={selectedId === consumption.id ? 'selected' : ''}
                onClick={() => setSelectedId(consumption.id)}
              >
                <td className="week-cell">
                  <span className="week-badge">{consumption.week_year}</span>
                </td>
                <td className="period-cell">
                  <div className="period-dates">
                    <span className="period-start">
                      {new Date(consumption.week_start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="period-separator">→</span>
                    <span className="period-end">
                      {new Date(consumption.week_end_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </td>
                <td className="text-right bags-cell">
                  <span className="bags-value">{formatNumber(consumption.bags_used)}</span>
                  <span className="bags-unit">bags</span>
                </td>
                <td className="text-right weight-cell">
                  {formatNumber(consumption.manual_weight_kg || consumption.weight_kg, 1)}
                  {consumption.manual_weight_kg && (
                    <span className="manual-indicator" title="Manually entered">
                      *
                    </span>
                  )}
                </td>
                <td className="text-center temp-cell">
                  {consumption.temperature_avg ? (
                    <span className="temp-value">{formatNumber(consumption.temperature_avg, 1)}°</span>
                  ) : (
                    <span className="na-value">—</span>
                  )}
                </td>
                <td className="text-center hours-cell">
                  {consumption.heating_hours ? (
                    <span className="hours-value">{consumption.heating_hours}h</span>
                  ) : (
                    <span className="na-value">—</span>
                  )}
                </td>
                <td className="notes-cell">
                  {consumption.notes ? (
                    <span className="notes-text" title={consumption.notes}>
                      {consumption.notes.length > 50
                        ? consumption.notes.substring(0, 50) + '...'
                        : consumption.notes}
                    </span>
                  ) : (
                    <span className="na-value">—</span>
                  )}
                </td>
                {(onEdit || onDelete) && (
                  <td className="actions-cell">
                    <div className="action-buttons">
                      {onEdit && (
                        <button
                          className="btn-action btn-edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(consumption);
                          }}
                          title="Edit"
                          aria-label="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          className="btn-action btn-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(consumption.id);
                          }}
                          title="Delete"
                          aria-label="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Deletion</h3>
            <p>Are you sure you want to delete this consumption record?</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleDeleteCancel}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumptionHistory;
