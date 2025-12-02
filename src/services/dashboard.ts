import { TimeForecast, BeachForecast } from './forecast';
import _ from 'lodash';

export interface DashboardStats {
  avgWaveHeight: number;
  avgWaveHeightChange: number; 
  peakWaveHeight: number;
  peakWaveHeightChange: number;
  bestRating: number;
  excellentConditionsPercent: number;
  optimalConditionsHours: number;
  lowWindHoursPercent: number;
}

export interface WaveForecastPoint {
  time: string;
  location: string;
  waveHeight: number;
}

export interface ConditionsPoint {
  time: string;
  windSpeed: number;
  swellHeight: number;
}

export interface RatingDistribution {
  location: string;
  ratings: {
    [key: string]: number; 
  };
}

export class DashboardService {
  public calculateStats(timeForecast: TimeForecast[]): DashboardStats {
    const allForecasts = this.flattenForecasts(timeForecast);
    
    if (allForecasts.length === 0) {
      return this.getEmptyStats();
    }

    const avgWaveHeight = _.meanBy(allForecasts, 'waveHeight');
    
    const peakWaveHeight = _.maxBy(allForecasts, 'waveHeight')?.waveHeight || 0;
    
    const bestRating = _.maxBy(allForecasts, 'rating')?.rating || 0;
    
    const excellentCount = allForecasts.filter(f => f.rating >= 3).length;
    const excellentConditionsPercent = (excellentCount / allForecasts.length) * 100;
    
    const lowWindForecasts = allForecasts.filter(f => f.windSpeed < 5);
    const optimalConditionsHours = lowWindForecasts.length;
    const lowWindHoursPercent = (lowWindForecasts.length / allForecasts.length) * 100;

    const referenceAvgWaveHeight = 0.93; 
    const referencePeakWaveHeight = 1.68; 
    
    const avgWaveHeightChange = ((avgWaveHeight - referenceAvgWaveHeight) / referenceAvgWaveHeight) * 100;
    const peakWaveHeightChange = ((peakWaveHeight - referencePeakWaveHeight) / referencePeakWaveHeight) * 100;

    return {
      avgWaveHeight,
      avgWaveHeightChange,
      peakWaveHeight,
      peakWaveHeightChange,
      bestRating,
      excellentConditionsPercent,
      optimalConditionsHours,
      lowWindHoursPercent,
    };
  }


  public getWaveForecastData(timeForecast: TimeForecast[]): WaveForecastPoint[] {
    const points: WaveForecastPoint[] = [];
    
    for (const timePoint of timeForecast) {
      for (const forecast of timePoint.forecast) {
        points.push({
          time: timePoint.time,
          location: forecast.name,
          waveHeight: forecast.waveHeight,
        });
      }
    }
    
    return points;
  }


  public getConditionsData(timeForecast: TimeForecast[]): ConditionsPoint[] {
    const points: ConditionsPoint[] = [];
    
    for (const timePoint of timeForecast) {
      const avgWindSpeed = _.meanBy(timePoint.forecast, 'windSpeed');
      const avgSwellHeight = _.meanBy(timePoint.forecast, 'swellHeight');
      
      points.push({
        time: timePoint.time,
        windSpeed: avgWindSpeed,
        swellHeight: avgSwellHeight,
      });
    }
    
    return points;
  }


  public getRatingDistribution(timeForecast: TimeForecast[]): RatingDistribution[] {
    const allForecasts = this.flattenForecasts(timeForecast);
    
    const byLocation = _.groupBy(allForecasts, 'name');
    
    const distributions: RatingDistribution[] = [];
    
    for (const [location, forecasts] of Object.entries(byLocation)) {
      const ratings: { [key: string]: number } = {
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
      };
      
      for (const forecast of forecasts) {
        const roundedRating = Math.min(4, Math.max(1, Math.round(forecast.rating)));
        ratings[roundedRating.toString()]++;
      }
      
      distributions.push({
        location,
        ratings,
      });
    }
    
    return distributions;
  }


  private flattenForecasts(timeForecast: TimeForecast[]): BeachForecast[] {
    const allForecasts: BeachForecast[] = [];
    
    for (const timePoint of timeForecast) {
      allForecasts.push(...timePoint.forecast);
    }
    
    return allForecasts;
  }


  private getEmptyStats(): DashboardStats {
    return {
      avgWaveHeight: 0,
      avgWaveHeightChange: 0,
      peakWaveHeight: 0,
      peakWaveHeightChange: 0,
      bestRating: 0,
      excellentConditionsPercent: 0,
      optimalConditionsHours: 0,
      lowWindHoursPercent: 0,
    };
  }
}
