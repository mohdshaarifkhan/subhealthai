import type { DashboardViewData } from '@/lib/dashboardViewData';

/**
 * Transforms raw API responses into DashboardViewData format
 * @param dash - Response from /api/dashboard
 * @param exp - Response from /api/explain
 * @param riskData - Response from /api/risk (optional)
 * @param metricSnapshot - Response from /api/metric_snapshot (optional)
 * @returns DashboardViewData or null if transformation fails
 */
export function transformApiDataToDashboard(
  dash: any,
  exp: any,
  riskData?: any,
  metricSnapshot?: any
): DashboardViewData | null {
  if (!dash || !exp) {
    return null;
  }

  try {
    // Extract drivers from explain API response
    // The API now returns drivers with feature, delta_raw, sign, value, risk
    const contributors = exp?.drivers || exp?.top_contributors || [];
    
    // If explain API has no data, try to use drivers from dashboard API as fallback
    let drivers: any[] = [];
    
    if (contributors.length > 0) {
      drivers = contributors.map((d: any) => {
        // Handle different API response formats
        const featureName = d.name || d.feature || 'Unknown';
        // Use delta_raw if available, otherwise fall back to shap_value or impact
        // IMPORTANT: delta_raw can be negative (reduces instability) or positive (increases instability)
        let deltaRaw: number;
        if (d.delta_raw != null) {
          deltaRaw = Number(d.delta_raw);
        } else if (d.shap_value != null) {
          deltaRaw = Number(d.shap_value);
        } else if (d.impact != null) {
          // If impact is already provided (like 8), use it directly as delta_raw
          deltaRaw = Number(d.impact);
        } else {
          deltaRaw = 0;
        }
        
        // Convert delta_raw to impact (use directly, preserve sign)
        // Negative delta_raw = negative impact = green bar (reduces instability)
        // Positive delta_raw = positive impact = red bar (increases instability)
        const impact = Math.round(deltaRaw);
        
        console.log('[Transformer] Driver:', featureName, 'delta_raw:', deltaRaw, 'impact:', impact, 'sign:', d.sign || (deltaRaw >= 0 ? '+' : '-'));
        
        return {
          name: featureName,
          impact: impact, // This will be negative if delta_raw is negative
          value: d.value != null ? String(d.value) : (d.current_value != null ? String(d.current_value) : '—'),
          delta_raw: deltaRaw, // Preserve for UI text generation
          sign: d.sign || (deltaRaw >= 0 ? '+' : '-'),
          domain: d.domain,
          specialties: d.specialties,
        };
      });
    } else if (dash?.drivers && Array.isArray(dash.drivers) && dash.drivers.length > 0) {
      // Fallback to dashboard drivers if explain API has no data
      console.log('[Transformer] Using dashboard drivers as fallback for SHAP');
      drivers = dash.drivers.map((d: any) => ({
        name: d.name || 'Unknown',
        impact: typeof d.impact === 'number' ? d.impact : 0,
        value: String(d.value || '—'),
        delta_raw: typeof d.impact === 'number' ? d.impact : 0, // Use impact directly as delta_raw
        sign: (d.impact >= 0 ? '+' : '-') as '+' | '-',
        domain: d.domain,
        specialties: d.specialties,
      }));
    }
    
    console.log('[Transformer] Final drivers count:', drivers.length, 'from explain:', contributors.length > 0);

    // Extract vitals - prefer metricSnapshot, fallback to dash
    const vitals = {
      hrv: metricSnapshot?.hrv_avg ?? dash.vitals?.hrv ?? 0,
      rhr: metricSnapshot?.rhr ?? dash.vitals?.rhr ?? 0,
      resp: dash.vitals?.resp ?? 14,
      temp: dash.vitals?.temp ?? 98.6,
    };

    // Extract trends
    const trends = dash.trends || { hrv: 'stable' as const, rhr: 'stable' as const };

    // Extract drift
    const drift = dash.drift || {
      metabolic: 'Unknown' as const,
      cardio: 'Unknown' as const,
      inflammation: 'Unknown' as const,
    };

    // Extract sleep data
    const sleepMinutes = metricSnapshot?.sleep_minutes ?? dash.sleep?.total_minutes;
    const sleepHours = sleepMinutes != null ? sleepMinutes / 60 : 0;
    const sleep = dash.sleep || {
      deep: sleepHours ? Number((0.25 * sleepHours).toFixed(1)) : 0,
      rem: sleepHours ? Number((0.25 * sleepHours).toFixed(1)) : 0,
      light: sleepHours ? Number((0.4 * sleepHours).toFixed(1)) : 0,
      awake: sleepHours ? Number((0.1 * sleepHours).toFixed(1)) : 0,
    };

    // Extract labs
    const labs = dash.labs || [];

    // Extract forecast
    const forecast = dash.forecast || [];

    // Extract volatility
    const volatilityIndex = dash.volatilityIndex ?? dash.volatility_index ?? '0.000';
    const volatilityTrail = dash.volatilityTrail ?? dash.volatility_trail ?? [];

    // Determine hasForecast
    const hasForecast = dash.hasForecast ?? (forecast && forecast.length > 0);

    // Build the transformed data
    const transformed: DashboardViewData & { clinicalReasons?: string[] } = {
      instabilityScore: dash.instabilityScore ?? dash.instability_score ?? 0,
      status: dash.status || (dash.instabilityScore < 50 ? 'STABLE' : 'ELEVATED'),
      narrative: dash.narrative || 'No baseline computed yet. Risk scores will appear once we have enough wearable + lab data.',
      vitals,
      trends,
      drivers,
      drift,
      sleep,
      labs,
      forecast,
      volatilityIndex,
      volatilityTrail,
      hasForecast,
      // Include optional fields if present
      ...(dash.clinicalConditions && { clinicalConditions: dash.clinicalConditions }),
      ...(dash.dataSources && { dataSources: dash.dataSources }),
      ...(dash.reliabilityBins && { reliabilityBins: dash.reliabilityBins }),
      ...(dash.reliability && { reliability: dash.reliability }),
      // Preserve clinicalReasons from API
      ...(dash.clinicalReasons && Array.isArray(dash.clinicalReasons) && { clinicalReasons: dash.clinicalReasons }),
    };

    return transformed;
  } catch (error) {
    console.error('Error transforming API data to dashboard:', error);
    return null;
  }
}

