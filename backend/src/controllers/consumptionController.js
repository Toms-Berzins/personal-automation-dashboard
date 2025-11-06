/**
 * Consumption Controller
 *
 * Handles API endpoints for consumption tracking and analysis
 */

import * as db from '../database/db.js';
import marketInsights from '../data/marketInsights.js';

/**
 * GET /api/consumption/monthly
 * Get monthly consumption statistics
 */
export async function getMonthlyConsumption(req, res) {
  try {
    const result = await db.query(`
      SELECT * FROM monthly_consumption
      ORDER BY month DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching monthly consumption:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/consumption/history
 * Get consumption history with optional filtering
 */
export async function getConsumptionHistory(req, res) {
  try {
    const { months = 12 } = req.query;

    const result = await db.query(
      `SELECT
        consumption_date,
        kg_consumed,
        notes
      FROM consumption_history
      WHERE consumption_date >= CURRENT_DATE - INTERVAL '${parseInt(months)} months'
      ORDER BY consumption_date DESC`,
      []
    );

    res.json({
      success: true,
      data: result.rows,
      period: `Last ${months} months`
    });
  } catch (error) {
    console.error('Error fetching consumption history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/consumption/trends
 * Get consumption trends and analytics
 */
export async function getConsumptionTrends(req, res) {
  try {
    // Get overall statistics
    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total_months,
        SUM(kg_consumed) as total_kg,
        AVG(kg_consumed) as avg_kg_monthly,
        MAX(kg_consumed) as peak_kg,
        MIN(kg_consumed) as lowest_kg,
        MIN(consumption_date) as earliest_date,
        MAX(consumption_date) as latest_date
      FROM consumption_history
    `);

    // Get yearly breakdown
    const yearlyResult = await db.query(`
      SELECT * FROM yearly_consumption
      ORDER BY year DESC
    `);

    // Get seasonal breakdown
    const seasonalResult = await db.query(`
      SELECT * FROM seasonal_consumption
      ORDER BY year DESC, season
    `);

    // Get recent trend with moving average
    const trendResult = await db.query(`
      SELECT * FROM recent_consumption_trend
      ORDER BY consumption_date DESC
    `);

    res.json({
      success: true,
      data: {
        overall: statsResult.rows[0],
        yearly: yearlyResult.rows,
        seasonal: seasonalResult.rows,
        recent_trend: trendResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching consumption trends:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/consumption/comparison
 * Compare consumption with price data for cost analysis
 */
export async function getConsumptionPriceComparison(req, res) {
  try {
    const { months = 12 } = req.query;

    // Get consumption data (includes months with 0 kg for tracking purposes)
    const consumptionResult = await db.query(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', consumption_date), 'YYYY-MM') as month,
        SUM(kg_consumed) as kg_consumed
      FROM consumption_history
      WHERE consumption_date >= CURRENT_DATE - INTERVAL '${parseInt(months)} months'
      GROUP BY DATE_TRUNC('month', consumption_date)
      ORDER BY DATE_TRUNC('month', consumption_date) DESC`
    );

    // Get average monthly prices for the requested period
    const priceResult = await db.query(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', timestamp), 'YYYY-MM') as month,
        AVG(price::NUMERIC) as avg_price,
        MIN(price::NUMERIC) as min_price,
        MAX(price::NUMERIC) as max_price,
        COUNT(*) as price_count
      FROM product_prices
      WHERE timestamp >= CURRENT_DATE - INTERVAL '${parseInt(months)} months'
      GROUP BY DATE_TRUNC('month', timestamp)
      ORDER BY DATE_TRUNC('month', timestamp) DESC`
    );

    // First check if product_prices table has any data
    const priceCountResult = await db.query(
      `SELECT COUNT(*) as total_prices,
              MIN(timestamp) as earliest_date,
              MAX(timestamp) as latest_date
       FROM product_prices`
    );

    console.log('\n📊 Product Prices Table Check:');
    console.log(`   Total price records: ${priceCountResult.rows[0].total_prices}`);
    console.log(`   Date range: ${priceCountResult.rows[0].earliest_date} to ${priceCountResult.rows[0].latest_date}`);

    // Get average price per calendar month across ALL historical years
    // E.g., average of all Octobers (2023, 2024, 2025), all Novembers, etc.
    const monthlyAvgPricesResult = await db.query(
      `SELECT
        EXTRACT(MONTH FROM timestamp)::INTEGER as calendar_month,
        AVG(price::NUMERIC) as avg_price_for_month,
        COUNT(*) as sample_count,
        MIN(price::NUMERIC) as min_price,
        MAX(price::NUMERIC) as max_price
       FROM product_prices
       GROUP BY EXTRACT(MONTH FROM timestamp)
       ORDER BY calendar_month`
    );

    console.log(`   Monthly averages query returned: ${monthlyAvgPricesResult.rows.length} months with data`);

    // Create a map of calendar month -> average price
    const monthlyAvgPrices = {};
    monthlyAvgPricesResult.rows.forEach(row => {
      monthlyAvgPrices[row.calendar_month] = {
        avgPrice: parseFloat(row.avg_price_for_month),
        sampleCount: parseInt(row.sample_count),
        minPrice: parseFloat(row.min_price),
        maxPrice: parseFloat(row.max_price)
      };
    });

    // Get overall average price as last fallback
    const overallAvgPriceResult = await db.query(
      `SELECT AVG(CAST(price AS NUMERIC)) as overall_avg
       FROM product_prices`
    );
    const overallAvgPrice = parseFloat(overallAvgPriceResult.rows[0]?.overall_avg) || null;

    console.log('\n📊 ========== PRICE DATA DEBUG ==========');
    console.log('📊 Historical calendar month averages (from ALL years of scraped data):');
    if (Object.keys(monthlyAvgPrices).length === 0) {
      console.log('   ⚠️  NO HISTORICAL DATA FOUND - Check product_prices table!');
    } else {
      Object.entries(monthlyAvgPrices).forEach(([month, data]) => {
        const monthName = new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'long' });
        console.log(`   ${month.padStart(2, ' ')} (${monthName.padEnd(9)}): €${data.avgPrice.toFixed(2)}/ton (${data.sampleCount} samples from all years, range: €${data.minPrice.toFixed(2)}-€${data.maxPrice.toFixed(2)})`);
      });
    }

    console.log(`\n📊 Recent ${priceResult.rows.length} months with specific month/year data:`);
    if (priceResult.rows.length === 0) {
      console.log('   ⚠️  No specific monthly data in last ${months} months');
    } else {
      priceResult.rows.forEach(row => {
        console.log(`   ${row.month}: €${parseFloat(row.avg_price).toFixed(2)}/ton (${row.price_count} samples)`);
      });
    }

    console.log(`\n📊 Overall average fallback: €${overallAvgPrice?.toFixed(2)}/ton`);
    console.log('📊 =======================================\n');

    // Merge consumption and price data
    const comparison = consumptionResult.rows.map(consumption => {
      const priceData = priceResult.rows.find(p =>
        p.month === consumption.month
      );

      // Extract calendar month from consumption.month (format: "2025-10")
      const calendarMonth = parseInt(consumption.month.split('-')[1]);
      const historicalMonthData = monthlyAvgPrices[calendarMonth];

      // Price selection priority: monthly > historical monthly avg > overall avg
      let priceToUse = null;
      let priceType = null;
      let priceConfidence = 0; // 0-100 scale
      let minPrice = null;
      let maxPrice = null;
      let priceVariance = null;

      if (priceData) {
        // Use actual monthly data for this specific month/year
        priceToUse = parseFloat(priceData.avg_price);
        priceType = 'monthly';
        priceConfidence = 100; // Actual monthly data
        minPrice = parseFloat(priceData.min_price);
        maxPrice = parseFloat(priceData.max_price);
        priceVariance = maxPrice - minPrice;
      } else if (historicalMonthData) {
        // Use historical average for this calendar month (e.g., all Octobers)
        priceToUse = historicalMonthData.avgPrice;
        priceType = 'historical';
        priceConfidence = 60; // Historical average for calendar month
        minPrice = historicalMonthData.minPrice;
        maxPrice = historicalMonthData.maxPrice;
        priceVariance = maxPrice - minPrice;
      } else if (overallAvgPrice) {
        // Last resort: overall average
        priceToUse = overallAvgPrice;
        priceType = 'overall_avg';
        priceConfidence = 30; // Overall fallback
      }

      // Calculate cost: Convert kg to tons, then multiply by price per ton
      // Price in database is per TON (€/ton)
      // Consumption is in KG
      // Cost = (kg / 1000) * price_per_ton
      const kgConsumed = parseFloat(consumption.kg_consumed);
      const tons = kgConsumed / 1000;
      const estimatedCost = priceToUse && kgConsumed > 0
        ? tons * priceToUse
        : null;

      // Convert price per ton to price per kg for display
      const pricePerKg = priceToUse ? priceToUse / 1000 : null;
      const minPricePerKg = minPrice ? minPrice / 1000 : null;
      const maxPricePerKg = maxPrice ? maxPrice / 1000 : null;
      const variancePerKg = priceVariance ? priceVariance / 1000 : null;

      const result = {
        month: consumption.month,
        kg_consumed: kgConsumed,
        avg_price: pricePerKg, // Price per kg for display
        avg_price_per_ton: priceToUse, // Keep original price per ton for reference
        avg_price_type: priceType,
        price_confidence: priceConfidence,
        min_price: minPricePerKg,
        max_price: maxPricePerKg,
        price_variance: variancePerKg,
        estimated_cost: estimatedCost ? estimatedCost.toFixed(2) : null
      };

      // Debug log for each month to see price selection
      const monthName = new Date(consumption.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      console.log(`\n📊 ${monthName} (${consumption.month}):`);
      console.log(`   Calendar month: ${calendarMonth}`);

      if (priceData) {
        console.log(`   ✅ Using SPECIFIC ${consumption.month} price data`);
        console.log(`      → €${priceToUse?.toFixed(2)}/ton (${priceData.price_count} samples)`);
      } else if (historicalMonthData) {
        console.log(`   ⚡ Using HISTORICAL average for calendar month ${calendarMonth}`);
        console.log(`      → €${priceToUse?.toFixed(2)}/ton (avg of ${historicalMonthData.sampleCount} samples across all years)`);
      } else if (priceToUse) {
        console.log(`   ⚠️  Using OVERALL AVERAGE (fallback)`);
        console.log(`      → €${priceToUse?.toFixed(2)}/ton`);
      } else {
        console.log(`   ❌ NO PRICE DATA AVAILABLE`);
      }

      console.log(`   Display: €${pricePerKg?.toFixed(3)}/kg | Cost: ${kgConsumed} kg × €${pricePerKg?.toFixed(3)}/kg = €${result.estimated_cost}`);

      return result;
    });

    // Calculate cost metrics
    const totalCost = comparison.reduce((sum, item) =>
      sum + (parseFloat(item.estimated_cost) || 0), 0
    );

    const totalKg = comparison.reduce((sum, item) => sum + item.kg_consumed, 0);
    const monthsWithMonthlyPrice = comparison.filter(item => item.avg_price_type === 'monthly').length;
    const monthsWithHistoricalPrice = comparison.filter(item => item.avg_price_type === 'historical').length;
    const monthsWithOverallPrice = comparison.filter(item => item.avg_price_type === 'overall_avg').length;

    // Calculate weighted average confidence
    const totalMonths = comparison.length;
    const avgConfidence = totalMonths > 0
      ? comparison.reduce((sum, item) => sum + (item.price_confidence || 0), 0) / totalMonths
      : 0;

    // Calculate cost trends
    let costTrend = null;
    if (comparison.length >= 3) {
      const recentCosts = comparison.slice(0, 3).filter(c => c.estimated_cost);
      const olderCosts = comparison.slice(-3).filter(c => c.estimated_cost);

      if (recentCosts.length > 0 && olderCosts.length > 0) {
        const recentAvg = recentCosts.reduce((sum, c) => sum + parseFloat(c.estimated_cost), 0) / recentCosts.length;
        const olderAvg = olderCosts.reduce((sum, c) => sum + parseFloat(c.estimated_cost), 0) / olderCosts.length;
        const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

        costTrend = {
          recent_avg: recentAvg.toFixed(2),
          older_avg: olderAvg.toFixed(2),
          percent_change: percentChange.toFixed(1),
          direction: percentChange > 0 ? 'increasing' : percentChange < 0 ? 'decreasing' : 'stable'
        };
      }
    }

    // Find best and worst months for cost efficiency
    const monthsWithPrices = comparison.filter(m => m.avg_price);
    let bestMonth = null;
    let worstMonth = null;

    if (monthsWithPrices.length > 0) {
      bestMonth = monthsWithPrices.reduce((min, m) =>
        m.avg_price < min.avg_price ? m : min
      );
      worstMonth = monthsWithPrices.reduce((max, m) =>
        m.avg_price > max.avg_price ? m : max
      );
    }

    // Calculate potential savings (if bought at lowest price)
    // Remember: need to use price per ton for calculation
    let potentialSavings = null;
    if (bestMonth && totalKg > 0) {
      const totalTons = totalKg / 1000;
      const bestPricePerTon = bestMonth.avg_price_per_ton; // Use per ton price
      const costAtBestPrice = totalTons * bestPricePerTon;
      const actualCost = totalCost;
      const savings = actualCost - costAtBestPrice;

      if (savings > 0) {
        potentialSavings = {
          amount: savings.toFixed(2),
          percent: ((savings / actualCost) * 100).toFixed(1),
          best_price: bestPricePerTon.toFixed(2),
          best_month: bestMonth.month
        };
      }
    }

    // Calculate weighted average price per ton
    const totalValidMonths = comparison.filter(m => m.avg_price_per_ton).length;
    const avgPricePerTon = totalValidMonths > 0
      ? comparison
          .filter(m => m.avg_price_per_ton)
          .reduce((sum, m) => sum + m.avg_price_per_ton, 0) / totalValidMonths
      : null;

    res.json({
      success: true,
      data: {
        comparison,
        summary: {
          total_kg: totalKg,
          total_cost: totalCost.toFixed(2),
          avg_price_per_ton: avgPricePerTon ? avgPricePerTon.toFixed(2) : null,
          avg_cost_per_kg: totalKg > 0
            ? (totalCost / totalKg).toFixed(2)
            : null,
          period: `Last ${months} months`,
          months_with_monthly_price: monthsWithMonthlyPrice,
          months_with_historical_price: monthsWithHistoricalPrice,
          months_with_overall_price: monthsWithOverallPrice,
          price_confidence: avgConfidence.toFixed(0),
          price_calculation_method: 'Priority: Monthly actual > Historical monthly avg > Overall avg',
          cost_trend: costTrend,
          best_month: bestMonth ? {
            month: bestMonth.month,
            price: bestMonth.avg_price.toFixed(2)
          } : null,
          worst_month: worstMonth ? {
            month: worstMonth.month,
            price: worstMonth.avg_price.toFixed(2)
          } : null,
          potential_savings: potentialSavings
        }
      }
    });
  } catch (error) {
    console.error('Error fetching consumption/price comparison:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/consumption
 * Add a new consumption record
 */
export async function addConsumption(req, res) {
  try {
    const { consumption_date, kg_consumed, notes } = req.body;

    if (!consumption_date || kg_consumed === undefined) {
      return res.status(400).json({
        success: false,
        error: 'consumption_date and kg_consumed are required'
      });
    }

    const result = await db.query(
      `INSERT INTO consumption_history (consumption_date, kg_consumed, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (consumption_date)
       DO UPDATE SET
         kg_consumed = EXCLUDED.kg_consumed,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [consumption_date, kg_consumed, notes || null]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Consumption record added successfully'
    });
  } catch (error) {
    console.error('Error adding consumption:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/consumption/stats
 * Get quick consumption statistics
 */
export async function getConsumptionStats(req, res) {
  try {
    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total_months,
        SUM(kg_consumed) as total_kg,
        AVG(kg_consumed) as avg_monthly_kg,
        MAX(kg_consumed) as peak_month_kg,
        (SELECT kg_consumed FROM consumption_history ORDER BY consumption_date DESC LIMIT 1) as last_month_kg,
        (SELECT consumption_date FROM consumption_history ORDER BY consumption_date DESC LIMIT 1) as last_update
      FROM consumption_history
    `);

    res.json({
      success: true,
      data: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching consumption stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/consumption/insights
 * Get market insights and forecasts
 */
export async function getMarketInsights(req, res) {
  try {
    res.json({
      success: true,
      data: marketInsights
    });
  } catch (error) {
    console.error('Error fetching market insights:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/consumption/forecast
 * Get 6-month consumption and cost forecast
 */
export async function getForecast(req, res) {
  try {
    const forecast = {
      forecast6Months: marketInsights.forecast6Months,
      seasonal: marketInsights.seasonalForecast,
      summary: {
        avgPricePerKg: marketInsights.averagePricePerKg,
        totalHistoricalCost: marketInsights.totalHistoricalCost,
        winterProjection: marketInsights.seasonalForecast.winter2026,
        summerProjection: marketInsights.seasonalForecast.summer2026
      }
    };

    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export default {
  getMonthlyConsumption,
  getConsumptionHistory,
  getConsumptionTrends,
  getConsumptionPriceComparison,
  addConsumption,
  getConsumptionStats,
  getMarketInsights,
  getForecast
};
