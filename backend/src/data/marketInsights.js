/**
 * Market Insights and Forecast Data
 * Based on analysis from Granulu-paterina-un-tirgus-parskats-2022-2026.pdf
 */

export const marketInsights = {
  // Historical averages
  averagePricePerKg: 0.26, // EUR
  totalHistoricalCost: 2975.70, // EUR
  totalHistoricalConsumption: 11445, // kg

  // Pricing tiers
  pricingTiers: [
    {
      type: 'bulk',
      size: '975kg bags',
      pricePerKg: 0.24,
      savings: '14-15% cheaper',
      recommendation: 'Best value for high-volume buyers'
    },
    {
      type: 'standard',
      size: '15kg bags',
      pricePerKg: 0.28,
      savings: 'baseline',
      recommendation: 'Suitable for occasional use'
    },
    {
      type: 'premium',
      size: 'small packs',
      pricePerKg: 0.30,
      savings: 'premium pricing',
      recommendation: 'Convenience over value'
    }
  ],

  // Market conditions
  marketConditions: {
    stability: 'stable',
    availability: 'in-stock across all SKUs',
    competition: 'commoditized market',
    priceDirection: 'potential erosion risk',
    recommendation: 'Favor bulk purchases, monitor price movements'
  },

  // Seasonal patterns (from forecast)
  seasonalForecast: {
    winter2026: {
      months: ['Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026'],
      avgConsumptionKg: 600,
      peakConsumptionKg: 800,
      avgMonthlyCost: 156, // EUR (600kg * 0.26)
      peakMonthlyCost: 208  // EUR (800kg * 0.26)
    },
    summer2026: {
      months: ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026'],
      avgConsumptionKg: 300,
      peakConsumptionKg: 450,
      avgMonthlyCost: 78,   // EUR (300kg * 0.26)
      peakMonthlyCost: 117  // EUR (450kg * 0.26)
    }
  },

  // 6-month forecast data (from charts)
  forecast6Months: [
    { month: 'Nov 2025', consumptionKg: 800, costEur: 208, confidence: 'high' },
    { month: 'Dec 2025', consumptionKg: 450, costEur: 117, confidence: 'high' },
    { month: 'Jan 2026', consumptionKg: 630, costEur: 164, confidence: 'medium' },
    { month: 'Feb 2026', consumptionKg: 450, costEur: 117, confidence: 'medium' },
    { month: 'Mar 2026', consumptionKg: 630, costEur: 164, confidence: 'medium' },
    { month: 'Apr 2026', consumptionKg: 210, costEur: 55, confidence: 'low' }
  ],

  // Key insights (from PDF page 2)
  keyInsights: [
    {
      type: 'trend',
      title: 'Bulk bags beat small packs on price per kilo',
      description: 'The bulk 975 kg bag is priced at 234 EUR (~0.24 EUR/kg), while a smaller 15 kg bag costs 4.18 EUR (~0.28 EUR/kg). Bulk packaging provides roughly 14-15% cheaper cost per kilo.',
      confidence: 85,
      actionable: true,
      recommendation: 'Buy in bulk for larger volumes to save 14-15% per kg'
    },
    {
      type: 'opportunity',
      title: 'Premium mini-packings hint at higher margins',
      description: 'Premium 6mm pellets at 240 EUR suggest premium segment opportunity if packaging is clarified.',
      confidence: 70,
      actionable: true,
      recommendation: 'Target premium segment with verified packaging'
    },
    {
      type: 'anomaly',
      title: 'Outlier price 240 EUR flags data integrity concerns',
      description: 'The 240 EUR price stands out. May be mispricing or unit error that needs validation.',
      confidence: 65,
      actionable: true,
      recommendation: 'Validate listing details to avoid pricing mistakes'
    },
    {
      type: 'warning',
      title: 'Commoditization risk may trigger price erosion',
      description: 'All items are 6mm granules with similar specs. Prices cluster around bulk (~0.24 EUR/kg) to small-pack (~0.28 EUR/kg). Pattern suggests price competition.',
      confidence: 70,
      actionable: true,
      recommendation: 'Consider value-added options or promotions to defend margins'
    }
  ],

  // Buying recommendations
  buyingStrategy: {
    optimal: {
      timing: 'September-October (before heating season)',
      quantity: 'Bulk purchases (975kg bags)',
      priceTarget: '€0.24/kg or lower',
      reasoning: 'Lock in prices before winter demand spike'
    },
    acceptable: {
      timing: 'November-January (heating season)',
      quantity: 'Standard purchases (multiple 15kg bags)',
      priceTarget: '€0.26-0.28/kg',
      reasoning: 'Market average during peak season'
    },
    avoid: {
      timing: 'Peak winter months (Dec-Feb) if prices spike',
      quantity: 'Small premium packs',
      priceTarget: 'Above €0.30/kg',
      reasoning: 'Overpaying during demand peak'
    }
  },

  // Cost optimization tips
  costOptimization: [
    'Stock up in Sept-Oct when prices are typically 10-20% lower',
    'Buy bulk (975kg bags) to save 14-15% per kg',
    'Monitor consumption rate to avoid last-minute premium purchases',
    'Target total winter stock of ~3,000kg (Nov-Apr at 500kg/month avg)',
    'Consider sharing bulk purchases with neighbors for better pricing'
  ],

  // Updated timestamp
  lastUpdated: '2025-10-27',
  dataSource: 'Granulu-paterina-un-tirgus-parskats-2022-2026.pdf'
};

export default marketInsights;
