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
          <span className="empty-icon">📊</span>
          <h3>No Consumption Records Yet</h3>
          <p>Start logging your weekly pellet consumption to track your heating usage.</p>
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
              <th className="text-center">Temp (°C)</th>
              <th className="text-center">Hours</th>
              <th>Notes</th>
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
                        >
                          ✏️
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
                        >
                          🗑️
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
