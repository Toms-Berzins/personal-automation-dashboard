import React, { useState, useEffect } from 'react';
import type { StockPurchaseFormData, CreateStockPurchase, StockPurchase } from '../../types/pellets';
import { formatNumber } from '../../services/pelletApi';
import DatePicker from '../common/DatePicker';

interface StockPurchaseFormProps {
  initialData?: StockPurchase;
  onSubmit: (data: CreateStockPurchase) => Promise<void>;
  onCancel?: () => void;
}

const StockPurchaseForm: React.FC<StockPurchaseFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<StockPurchaseFormData>({
    purchase_date: initialData ? new Date(initialData.purchase_date) : new Date(),
    entry_mode: initialData?.num_bags ? 'bags' : 'pallets',
    num_pallets: initialData?.num_pallets || 1,
    num_bags: initialData?.num_bags || 1,
    bags_per_pallet: initialData?.bags_per_pallet || 65,
    weight_per_bag: initialData?.weight_per_bag || 15.0,
    notes: initialData?.notes || '',
    supplier: initialData?.supplier || '',
    price_per_pallet: initialData?.price_per_pallet || '',
    total_cost: initialData?.total_cost || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate derived values based on entry mode
  const totalBags = formData.entry_mode === 'bags'
    ? formData.num_bags
    : formData.num_pallets * formData.bags_per_pallet;
  const totalWeightKg = totalBags * formData.weight_per_bag;
  const totalWeightTons = totalWeightKg / 1000;

  // Auto-calculate total cost when price per pallet changes
  useEffect(() => {
    if (formData.price_per_pallet && typeof formData.price_per_pallet === 'number') {
      setFormData((prev) => ({
        ...prev,
        total_cost: prev.num_pallets * (prev.price_per_pallet as number),
      }));
    }
  }, [formData.num_pallets, formData.price_per_pallet]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'num_pallets' ||
        name === 'bags_per_pallet' ||
        name === 'weight_per_bag' ||
        name === 'price_per_pallet'
          ? value === ''
            ? ''
            : parseFloat(value)
          : value,
    }));
  };

  const handleDateChange = (date: Date) => {
    setFormData((prev) => ({
      ...prev,
      purchase_date: date,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.purchase_date) {
      setError('Purchase date is required');
      return;
    }

    // Validate based on entry mode
    if (formData.entry_mode === 'pallets' && formData.num_pallets <= 0) {
      setError('Number of pallets must be greater than 0');
      return;
    }

    if (formData.entry_mode === 'bags' && formData.num_bags <= 0) {
      setError('Number of bags must be greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData: CreateStockPurchase = {
        purchase_date: formData.purchase_date.toISOString().split('T')[0],
        weight_per_bag: formData.weight_per_bag,
        notes: formData.notes || undefined,
        supplier: formData.supplier || undefined,
        price_per_pallet:
          typeof formData.price_per_pallet === 'number' ? formData.price_per_pallet : undefined,
        total_cost: typeof formData.total_cost === 'number' ? formData.total_cost : undefined,
      };

      // Add the appropriate fields based on entry mode
      if (formData.entry_mode === 'pallets') {
        submitData.num_pallets = formData.num_pallets;
        submitData.bags_per_pallet = formData.bags_per_pallet;
      } else {
        submitData.num_bags = formData.num_bags;
      }

      await onSubmit(submitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save stock purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="stock-purchase-form">
      <h3 className="form-title">
        {initialData ? 'Edit Stock Purchase' : 'Add New Stock Purchase'}
      </h3>

      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Purchase Date */}
        <div className="form-group">
          <label htmlFor="purchase_date">
            Purchase Date <span className="required">*</span>
          </label>
          <DatePicker
            value={formData.purchase_date}
            onChange={handleDateChange}
            maxDate={new Date()}
            placeholder="Select purchase date"
            required
          />
        </div>

        {/* Entry Mode Toggle */}
        <div className="form-group">
          <label>Entry Mode <span className="required">*</span></label>
          <div className="toggle-switch-container">
            <button
              type="button"
              className={`toggle-option ${formData.entry_mode === 'pallets' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, entry_mode: 'pallets' })}
            >
              <span className="toggle-icon">📦</span>
              <span className="toggle-text">Pallets</span>
            </button>
            <button
              type="button"
              className={`toggle-option ${formData.entry_mode === 'bags' ? 'active' : ''}`}
              onClick={() => setFormData({ ...formData, entry_mode: 'bags' })}
            >
              <span className="toggle-icon">🎒</span>
              <span className="toggle-text">Bags</span>
            </button>
          </div>
        </div>

        {/* Pallet Entry Mode */}
        {formData.entry_mode === 'pallets' && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="num_pallets">
                Number of Pallets <span className="required">*</span>
              </label>
              <input
                type="number"
                id="num_pallets"
                name="num_pallets"
                value={formData.num_pallets}
                onChange={handleInputChange}
                min="1"
                step="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="bags_per_pallet">Bags per Pallet</label>
              <input
                type="number"
                id="bags_per_pallet"
                name="bags_per_pallet"
                value={formData.bags_per_pallet}
                onChange={handleInputChange}
                min="1"
                step="1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="weight_per_bag">Weight per Bag (kg)</label>
              <input
                type="number"
                id="weight_per_bag"
                name="weight_per_bag"
                value={formData.weight_per_bag}
                onChange={handleInputChange}
                min="0.1"
                step="0.1"
              />
            </div>
          </div>
        )}

        {/* Bag Entry Mode */}
        {formData.entry_mode === 'bags' && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="num_bags">
                Number of Bags <span className="required">*</span>
              </label>
              <input
                type="number"
                id="num_bags"
                name="num_bags"
                value={formData.num_bags}
                onChange={handleInputChange}
                min="1"
                step="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="weight_per_bag">Weight per Bag (kg)</label>
              <input
                type="number"
                id="weight_per_bag"
                name="weight_per_bag"
                value={formData.weight_per_bag}
                onChange={handleInputChange}
                min="0.1"
                step="0.1"
              />
            </div>
          </div>
        )}

        {/* Calculated Totals */}
        <div className="calculated-totals">
          <div className="total-item">
            <span className="total-label">Total Bags:</span>
            <span className="total-value">{formatNumber(totalBags)} bags</span>
          </div>
          <div className="total-item">
            <span className="total-label">Total Weight:</span>
            <span className="total-value">{formatNumber(totalWeightKg, 2)} kg</span>
          </div>
          <div className="total-item highlight">
            <span className="total-label">Total Weight:</span>
            <span className="total-value">{formatNumber(totalWeightTons, 3)} tons</span>
          </div>
        </div>

        {/* Supplier */}
        <div className="form-group">
          <label htmlFor="supplier">Supplier (Optional)</label>
          <input
            type="text"
            id="supplier"
            name="supplier"
            value={formData.supplier}
            onChange={handleInputChange}
            placeholder="e.g., Local Pellet Supplier"
          />
        </div>

        {/* Pricing */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="price_per_pallet">Price per Pallet ($)</label>
            <input
              type="number"
              id="price_per_pallet"
              name="price_per_pallet"
              value={formData.price_per_pallet}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label htmlFor="total_cost">Total Cost ($)</label>
            <input
              type="number"
              id="total_cost"
              name="total_cost"
              value={formData.total_cost}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              placeholder="Auto-calculated"
              readOnly={typeof formData.price_per_pallet === 'number'}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label htmlFor="notes">Notes (Optional)</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            placeholder="Add any additional notes about this purchase..."
          />
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
              'Update Stock'
            ) : (
              'Add Stock'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockPurchaseForm;
