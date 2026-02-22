/**
 * Hook for using the Weather ML Service
 * Handles model loading, training, and predictions
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  weatherMLService, 
  convertToMLFormat, 
  type WeatherDataPoint, 
  type MLPrediction, 
  type ModelMetrics 
} from '@/services/weatherMLService';
import { WeatherData } from '@/services/weatherService';

interface UseWeatherMLResult {
  predictions: MLPrediction[];
  isModelReady: boolean;
  isTraining: boolean;
  isLoading: boolean;
  error: string | null;
  metrics: ModelMetrics | null;
  trainModel: () => Promise<void>;
  refreshPredictions: () => Promise<void>;
  clearModel: () => Promise<void>;
  trainingProgress: { epoch: number; loss: number } | null;
}

export function useWeatherML(weatherData: WeatherData | null): UseWeatherMLResult {
  const [predictions, setPredictions] = useState<MLPrediction[]>([]);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [trainingProgress, setTrainingProgress] = useState<{ epoch: number; loss: number } | null>(null);
  
  const hasInitialized = useRef(false);

  // Initialize - try to load saved model
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      setIsLoading(true);
      try {
        const loaded = await weatherMLService.loadModel();
        setIsModelReady(loaded);
        if (loaded) {
          setMetrics(weatherMLService.getMetrics());
        }
      } catch (err) {
        console.log('No saved model found');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Generate predictions when weather data or model changes
  useEffect(() => {
    if (!weatherData || isLoading) return;

    const generatePredictions = async () => {
      try {
        const historicalData = convertToMLFormat(weatherData.hourly);
        
        if (weatherMLService.isReady()) {
          // Use LSTM model
          const preds = await weatherMLService.predict(historicalData, 48);
          setPredictions(preds);
          setError(null);
        } else {
          // Use quick statistical prediction
          const preds = weatherMLService.quickPredict(historicalData, 48);
          setPredictions(preds);
        }
      } catch (err) {
        console.error('Prediction error:', err);
        // Fallback to quick predict
        try {
          const historicalData = convertToMLFormat(weatherData.hourly);
          const preds = weatherMLService.quickPredict(historicalData, 48);
          setPredictions(preds);
        } catch {
          setError('Failed to generate predictions');
        }
      }
    };

    generatePredictions();
  }, [weatherData, isModelReady, isLoading]);

  // Train the model
  const trainModel = useCallback(async () => {
    if (!weatherData || isTraining) return;

    setIsTraining(true);
    setError(null);
    setTrainingProgress(null);

    try {
      const historicalData = convertToMLFormat(weatherData.hourly);
      
      const newMetrics = await weatherMLService.train(
        historicalData,
        (epoch, loss) => {
          setTrainingProgress({ epoch, loss });
        }
      );
      
      setMetrics(newMetrics);
      setIsModelReady(true);
      
      // Generate new predictions
      const preds = await weatherMLService.predict(historicalData, 48);
      setPredictions(preds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Training failed');
    } finally {
      setIsTraining(false);
      setTrainingProgress(null);
    }
  }, [weatherData, isTraining]);

  // Refresh predictions
  const refreshPredictions = useCallback(async () => {
    if (!weatherData) return;

    try {
      const historicalData = convertToMLFormat(weatherData.hourly);
      
      if (weatherMLService.isReady()) {
        const preds = await weatherMLService.predict(historicalData, 48);
        setPredictions(preds);
      } else {
        const preds = weatherMLService.quickPredict(historicalData, 48);
        setPredictions(preds);
      }
      setError(null);
    } catch (err) {
      setError('Failed to refresh predictions');
    }
  }, [weatherData]);

  // Clear the model
  const clearModel = useCallback(async () => {
    await weatherMLService.clearModel();
    setIsModelReady(false);
    setMetrics(null);
    
    // Fall back to quick predictions
    if (weatherData) {
      const historicalData = convertToMLFormat(weatherData.hourly);
      const preds = weatherMLService.quickPredict(historicalData, 48);
      setPredictions(preds);
    }
  }, [weatherData]);

  return {
    predictions,
    isModelReady,
    isTraining,
    isLoading,
    error,
    metrics,
    trainModel,
    refreshPredictions,
    clearModel,
    trainingProgress,
  };
}
