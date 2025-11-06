import React, { useState, useEffect } from 'react';
import type { ConsumptionFormData, CreateConsumption, Consumption } from '../../types/pellets';
import { getWeekYear, getWeekBounds, formatDateISO } from '../../services/pelletApi';

interface WeeklyConsumptionFormProps {
  initialData?: Consumption;
  onSubmit: (data: CreateConsumption) => Promise<void>;
  onCancel?: () => void;
}

const WeeklyConsumptionForm: React.FC<WeeklyConsumptionFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ConsumptionFormData>({
    week_date: initialData ? new Date(initialData.week_start_date) : new Date(),
    bags_used: initialData?.bags_used || 0,
    manual_weight_kg: initialData?.manual_weight_kg || '',
    notes: initialData?.notes || '',
    temperature_avg: initialData?.temperature_avg || '',
    heating_hours: initialData?.heating_hours || '',
  });

  const [weekInfo, setWeekInfo] = useState({ weekYear: '', weekStart: '', weekEnd: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate week info when date changes
  useEffect(() => {
    if (formData.week_date) {
      const { weekStart, weekEnd } = getWeekBounds(formData.week_date);
      const weekYear = getWeekYear(formData.week_date);

      setWeekInfo({
        weekYear,
        weekStart: formatDateISO(weekStart),
        weekEnd: formatDateISO(weekEnd),
      });
    }
  }, [formData.week_date]);

  // Calculate automatic weight from bags
  const calculatedWeightKg = formData.bags_used * 15.0;
  const displayWeightKg =
    typeof formData.manual_weight_kg === 'number' ? formData.manual_weight_kg : calculatedWeightKg;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'bags_used' || name === 'manual_weight_kg' || name === 'heating_hours'
          ? value === ''
            ? ''
            : parseInt(value, 10)
          : name === 'temperature_avg'
          ? value === ''
            ? ''
            : parseFloat(value)
          : value,
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      week_date: e.target.value ? new Date(e.target.value) : null,
    }));
  };

  const handleBagsIncrement = () => {
    setFormData((prev) => ({
      ...prev,
      bags_used: prev.bags_used + 1,
    }));
  };

  const handleBagsDecrement = () => {
    setFormData((prev) => ({
      ...prev,
      bags_used: Math.max(0, prev.bags_used - 1),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.week_date) {
      setError('Please select a date');
      return;
    }

    if (formData.bags_used < 0) {
      setError('Bags used cannot be negative');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData: CreateConsumption = {
        week_year: weekInfo.weekYear,
        week_start_date: weekInfo.weekStart,
        week_end_date: weekInfo.weekEnd,
        bags_used: formData.bags_used,
        manual_weight_kg:
          typeof formData.manual_weight_kg === 'number' ? formData.manual_weight_kg : undefined,
        notes: formData.notes || undefined,
        temperature_avg:
          typeof formData.temperature_avg === 'number' ? formData.temperature_avg : undefined,
        heating_hours:
          typeof formData.heating_hours === 'number' ? formData.heating_hours : undefined,
      };

      await onSubmit(submitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log consumption');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="weekly-consumption-form">
      <h3 className="form-title">
        {initialData ? 'Edit Weekly Consumption' : 'Log Weekly Consumption'}
      </h3>

      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Week Selection */}
        <div className="form-group">
          <label htmlFor="week_date">
            Select Date (Week Will Be Auto-Calculated) <span className="required">*</span>
          </label>
          <input
            type="date"
            id="week_date"
            name="week_date"
            value={formData.week_date ? formData.week_date.toISOString().split('T')[0] : ''}
            onChange={handleDateChange}
            required
            max={new Date().toISOString().split('T')[0]}
          />
          {weekInfo.weekYear && (
            <div className="week-info">
              <span className="week-badge">{weekInfo.weekYear}</span>
              <span className="week-dates">
                {new Date(weekInfo.weekStart).toLocaleDateString()} -{' '}
                {new Date(weekInfo.weekEnd).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Bags Used */}
        <div className="form-group">
          <label htmlFor="bags_used">
            Bags Used <span className="required">*</span>
          </label>
          <div className="number-input-group">
            <button
              type="button"
              className="btn-decrement"
              onClick={handleBagsDecrement}
              disabled={formData.bags_used <= 0}
            >
              −
            </button>
            <input
              type="number"
              id="bags_used"
              name="bags_used"
              value={formData.bags_used}
              onChange={handleInputChange}
              min="0"
              step="1"
              required
              className="number-input"
            />
            <button type="button" className="btn-increment" onClick={handleBagsIncrement}>
              +
            </button>
          </div>
          <p className="help-text">Use +/- buttons or type the number directly</p>
        </div>

        {/* Weight Display & Override */}
        <div className="form-group">
          <label htmlFor="manual_weight_kg">Weight (kg)</label>
          <div className="weight-display">
            <div className="calculated-weight">
              <span className="label">Auto-calculated:</span>
              <span className="value">{calculatedWeightKg.toFixed(1)} kg</span>
              <span className="formula">({formData.bags_used} bags × 15 kg)</span>
            </div>
            <input
              type="number"
              id="manual_weight_kg"
              name="manual_weight_kg"
              value={formData.manual_weight_kg}
              onChange={handleInputChange}
              min="0"
              step="0.1"
              placeholder="Override auto-calculation (optional)"
            />
          </div>
        </div>

        {/* Optional Context Information */}
        <div className="form-section">
          <h4 className="section-title">Additional Context (Optional)</h4>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="temperature_avg">
                Average Temperature (°C)
                <span className="info-icon" title="Helps analyze consumption patterns">ℹ️</span>
              </label>
              <input
                type="number"
                id="temperature_avg"
                name="temperature_avg"
                value={formData.temperature_avg}
                onChange={handleInputChange}
                step="0.1"
                placeholder="e.g., 5.5"
              />
            </div>

            <div className="form-group">
              <label htmlFor="heating_hours">
                Heating Hours
                <span className="info-icon" title="Total hours heating system was active">ℹ️</span>
              </label>
              <input
                type="number"
                id="heating_hours"
                name="heating_hours"
                value={formData.heating_hours}
                onChange={handleInputChange}
                min="0"
                max="168"
                step="1"
                placeholder="e.g., 120"
              />
              <p className="help-text">Max 168 hours per week</p>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Any observations about this week's consumption..."
            />
          </div>
        </div>

        {/* Summary Card */}
        <div className="consumption-summary">
          <h4>Summary</h4>
          <div className="summary-items">
            <div className="summary-item">
              <span className="label">Week:</span>
              <span className="value">{weekInfo.weekYear || 'Select a date'}</span>
            </div>
            <div className="summary-item">
              <span className="label">Bags Used:</span>
              <span className="value">{formData.bags_used} bags</span>
            </div>
            <div className="summary-item">
              <span className="label">Weight:</span>
              <span className="value">{displayWeightKg.toFixed(1)} kg</span>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : initialData ? (
              'Update Entry'
            ) : (
              '🔥 Log Consumption'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WeeklyConsumptionForm;
