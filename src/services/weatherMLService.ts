/**
 * Weather ML Service - LSTM-based weather forecasting using TensorFlow.js
 * Trains on historical weather data to predict future temperatures, humidity, and precipitation
 */
import * as tf from '@tensorflow/tfjs';

// Feature configuration
const FEATURES = ['temperature', 'humidity', 'precipitation', 'windSpeed', 'pressure'] as const;
type FeatureKey = typeof FEATURES[number];

// Model configuration
const SEQUENCE_LENGTH = 24; // Use 24 hours of data to predict
const PREDICTION_HOURS = 48; // Predict next 48 hours
const HIDDEN_UNITS = 32;
const EPOCHS = 50;
const BATCH_SIZE = 16;
const LEARNING_RATE = 0.001;

// Interfaces
export interface WeatherDataPoint {
  time: Date;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  pressure: number;
}

export interface MLPrediction {
  time: Date;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  pressure: number;
  confidence: number;
}

export interface ModelMetrics {
  loss: number;
  mse: number;
  trainedAt: Date;
  dataPoints: number;
  epochs: number;
}

// Normalize data to 0-1 range
interface NormalizationParams {
  min: Record<FeatureKey, number>;
  max: Record<FeatureKey, number>;
}

class WeatherMLService {
  private model: tf.LayersModel | null = null;
  private normParams: NormalizationParams | null = null;
  private isTraining = false;
  private metrics: ModelMetrics | null = null;
  private modelReady = false;

  /**
   * Initialize the LSTM model architecture
   */
  private createModel(): tf.LayersModel {
    const model = tf.sequential();
    
    // LSTM layer with return sequences for stacked architecture
    model.add(tf.layers.lstm({
      units: HIDDEN_UNITS,
      inputShape: [SEQUENCE_LENGTH, FEATURES.length],
      returnSequences: true,
      kernelInitializer: 'glorotUniform',
      recurrentInitializer: 'orthogonal',
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    // Second LSTM layer
    model.add(tf.layers.lstm({
      units: HIDDEN_UNITS / 2,
      returnSequences: false,
    }));
    
    model.add(tf.layers.dropout({ rate: 0.1 }));
    
    // Dense layers for output
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu',
    }));
    
    // Output layer - predict all features
    model.add(tf.layers.dense({
      units: FEATURES.length,
      activation: 'linear',
    }));
    
    // Compile with Adam optimizer
    model.compile({
      optimizer: tf.train.adam(LEARNING_RATE),
      loss: 'meanSquaredError',
      metrics: ['mse'],
    });
    
    return model;
  }

  /**
   * Calculate normalization parameters from data
   */
  private calculateNormParams(data: WeatherDataPoint[]): NormalizationParams {
    const params: NormalizationParams = {
      min: {} as Record<FeatureKey, number>,
      max: {} as Record<FeatureKey, number>,
    };
    
    FEATURES.forEach(feature => {
      const values = data.map(d => d[feature]);
      params.min[feature] = Math.min(...values);
      params.max[feature] = Math.max(...values);
      
      // Add small epsilon to avoid division by zero
      if (params.max[feature] === params.min[feature]) {
        params.max[feature] = params.min[feature] + 1;
      }
    });
    
    return params;
  }

  /**
   * Normalize a value to 0-1 range
   */
  private normalize(value: number, feature: FeatureKey): number {
    if (!this.normParams) return value;
    const { min, max } = this.normParams;
    return (value - min[feature]) / (max[feature] - min[feature]);
  }

  /**
   * Denormalize a value back to original range
   */
  private denormalize(value: number, feature: FeatureKey): number {
    if (!this.normParams) return value;
    const { min, max } = this.normParams;
    return value * (max[feature] - min[feature]) + min[feature];
  }

  /**
   * Convert weather data to normalized tensor sequences
   */
  private prepareSequences(data: WeatherDataPoint[]): { X: tf.Tensor3D; y: tf.Tensor2D } {
    const sequences: number[][][] = [];
    const targets: number[][] = [];
    
    // Create sliding window sequences
    for (let i = 0; i < data.length - SEQUENCE_LENGTH; i++) {
      const sequence: number[][] = [];
      
      for (let j = 0; j < SEQUENCE_LENGTH; j++) {
        const point = data[i + j];
        sequence.push(FEATURES.map(f => this.normalize(point[f], f)));
      }
      
      sequences.push(sequence);
      
      // Target is the next time step
      const target = data[i + SEQUENCE_LENGTH];
      targets.push(FEATURES.map(f => this.normalize(target[f], f)));
    }
    
    return {
      X: tf.tensor3d(sequences),
      y: tf.tensor2d(targets),
    };
  }

  /**
   * Train the LSTM model on historical weather data
   */
  async train(historicalData: WeatherDataPoint[], onProgress?: (epoch: number, loss: number) => void): Promise<ModelMetrics> {
    if (this.isTraining) {
      throw new Error('Model is already training');
    }
    
    if (historicalData.length < SEQUENCE_LENGTH + 10) {
      throw new Error(`Insufficient data. Need at least ${SEQUENCE_LENGTH + 10} data points.`);
    }
    
    this.isTraining = true;
    
    try {
      // Calculate normalization parameters
      this.normParams = this.calculateNormParams(historicalData);
      
      // Create model
      this.model = this.createModel();
      
      // Prepare training data
      const { X, y } = this.prepareSequences(historicalData);
      
      // Train model
      let finalLoss = 0;
      let finalMse = 0;
      
      await this.model.fit(X, y, {
        epochs: EPOCHS,
        batchSize: BATCH_SIZE,
        validationSplit: 0.1,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            finalLoss = logs?.loss || 0;
            finalMse = logs?.mse || 0;
            onProgress?.(epoch + 1, finalLoss);
          },
        },
      });
      
      // Clean up tensors
      X.dispose();
      y.dispose();
      
      this.metrics = {
        loss: finalLoss,
        mse: finalMse,
        trainedAt: new Date(),
        dataPoints: historicalData.length,
        epochs: EPOCHS,
      };
      
      this.modelReady = true;
      
      // Save model to localStorage
      await this.saveModel();
      
      return this.metrics;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Generate weather predictions for the next N hours
   */
  async predict(recentData: WeatherDataPoint[], hoursAhead: number = PREDICTION_HOURS): Promise<MLPrediction[]> {
    if (!this.model || !this.normParams) {
      throw new Error('Model not trained. Call train() first or load a saved model.');
    }
    
    if (recentData.length < SEQUENCE_LENGTH) {
      throw new Error(`Need at least ${SEQUENCE_LENGTH} data points for prediction.`);
    }
    
    const predictions: MLPrediction[] = [];
    
    // Use the most recent sequence
    let currentSequence = recentData.slice(-SEQUENCE_LENGTH).map(point => 
      FEATURES.map(f => this.normalize(point[f], f))
    );
    
    const lastTime = recentData[recentData.length - 1].time;
    
    for (let hour = 1; hour <= hoursAhead; hour++) {
      // Create input tensor
      const inputTensor = tf.tensor3d([currentSequence]);
      
      // Get prediction
      const predictionTensor = this.model.predict(inputTensor) as tf.Tensor;
      const predictionData = await predictionTensor.data();
      
      // Clean up
      inputTensor.dispose();
      predictionTensor.dispose();
      
      // Denormalize predictions
      const predictionTime = new Date(lastTime.getTime() + hour * 60 * 60 * 1000);
      
      const prediction: MLPrediction = {
        time: predictionTime,
        temperature: this.denormalize(predictionData[0], 'temperature'),
        humidity: Math.max(0, Math.min(100, this.denormalize(predictionData[1], 'humidity'))),
        precipitation: Math.max(0, this.denormalize(predictionData[2], 'precipitation')),
        windSpeed: Math.max(0, this.denormalize(predictionData[3], 'windSpeed')),
        pressure: this.denormalize(predictionData[4], 'pressure'),
        confidence: Math.max(0.3, 1 - (hour / hoursAhead) * 0.5), // Confidence decreases over time
      };
      
      predictions.push(prediction);
      
      // Update sequence for next prediction (auto-regressive)
      const normalizedPred = FEATURES.map((_, i) => predictionData[i]);
      currentSequence = [...currentSequence.slice(1), normalizedPred];
    }
    
    return predictions;
  }

  /**
   * Quick predict using simple statistical model (fallback when LSTM not trained)
   */
  quickPredict(recentData: WeatherDataPoint[], hoursAhead: number = 24): MLPrediction[] {
    if (recentData.length < 3) {
      return [];
    }
    
    const predictions: MLPrediction[] = [];
    const lastPoint = recentData[recentData.length - 1];
    
    // Calculate trends from recent data
    const recent = recentData.slice(-24);
    const trends = {
      temperature: this.calculateTrend(recent.map(d => d.temperature)),
      humidity: this.calculateTrend(recent.map(d => d.humidity)),
      precipitation: this.calculateTrend(recent.map(d => d.precipitation)),
      windSpeed: this.calculateTrend(recent.map(d => d.windSpeed)),
      pressure: this.calculateTrend(recent.map(d => d.pressure)),
    };
    
    // Daily temperature cycle (simplified sinusoidal pattern)
    const currentHour = lastPoint.time.getHours();
    
    for (let hour = 1; hour <= hoursAhead; hour++) {
      const predHour = (currentHour + hour) % 24;
      const predictionTime = new Date(lastPoint.time.getTime() + hour * 60 * 60 * 1000);
      
      // Temperature follows diurnal cycle
      const diurnalFactor = Math.sin((predHour - 6) * Math.PI / 12); // Peak at 2 PM
      const tempVariation = diurnalFactor * 4; // ±4°C variation
      
      const prediction: MLPrediction = {
        time: predictionTime,
        temperature: lastPoint.temperature + trends.temperature * hour * 0.1 + tempVariation,
        humidity: Math.max(20, Math.min(100, lastPoint.humidity + trends.humidity * hour * 0.05 - diurnalFactor * 10)),
        precipitation: Math.max(0, lastPoint.precipitation + trends.precipitation * hour * 0.01),
        windSpeed: Math.max(0, lastPoint.windSpeed + trends.windSpeed * hour * 0.02 + Math.random() * 2 - 1),
        pressure: lastPoint.pressure + trends.pressure * hour * 0.01,
        confidence: Math.max(0.4, 0.9 - hour * 0.02),
      };
      
      predictions.push(prediction);
    }
    
    return predictions;
  }

  /**
   * Calculate trend (slope) from data points
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  /**
   * Save model to IndexedDB
   */
  async saveModel(): Promise<void> {
    if (!this.model) return;
    
    try {
      await this.model.save('indexeddb://weather-lstm-model');
      
      // Save normalization params to localStorage
      if (this.normParams) {
        localStorage.setItem('weather-lstm-params', JSON.stringify(this.normParams));
      }
      if (this.metrics) {
        localStorage.setItem('weather-lstm-metrics', JSON.stringify(this.metrics));
      }
      
      console.log('✅ Weather ML model saved');
    } catch (error) {
      console.error('Failed to save model:', error);
    }
  }

  /**
   * Load model from IndexedDB
   */
  async loadModel(): Promise<boolean> {
    try {
      this.model = await tf.loadLayersModel('indexeddb://weather-lstm-model');
      
      // Load normalization params
      const paramsStr = localStorage.getItem('weather-lstm-params');
      if (paramsStr) {
        this.normParams = JSON.parse(paramsStr);
      }
      
      const metricsStr = localStorage.getItem('weather-lstm-metrics');
      if (metricsStr) {
        this.metrics = JSON.parse(metricsStr);
        this.metrics!.trainedAt = new Date(this.metrics!.trainedAt);
      }
      
      this.modelReady = true;
      console.log('✅ Weather ML model loaded');
      return true;
    } catch (error) {
      console.log('No saved model found, will need training');
      return false;
    }
  }

  /**
   * Check if model is ready for predictions
   */
  isReady(): boolean {
    return this.modelReady && this.model !== null && this.normParams !== null;
  }

  /**
   * Get model training metrics
   */
  getMetrics(): ModelMetrics | null {
    return this.metrics;
  }

  /**
   * Check if model is currently training
   */
  isModelTraining(): boolean {
    return this.isTraining;
  }

  /**
   * Clear saved model
   */
  async clearModel(): Promise<void> {
    try {
      await tf.io.removeModel('indexeddb://weather-lstm-model');
      localStorage.removeItem('weather-lstm-params');
      localStorage.removeItem('weather-lstm-metrics');
      this.model = null;
      this.normParams = null;
      this.metrics = null;
      this.modelReady = false;
      console.log('🗑️ Weather ML model cleared');
    } catch (error) {
      console.error('Failed to clear model:', error);
    }
  }
}

// Export singleton instance
export const weatherMLService = new WeatherMLService();

// Helper to convert OpenMeteo data to WeatherDataPoint format
export function convertToMLFormat(hourlyData: {
  time: Date[];
  temperature_2m: Float32Array;
  relative_humidity_2m: Float32Array;
  precipitation: Float32Array;
  wind_speed_10m: Float32Array;
  pressure_msl: Float32Array;
}): WeatherDataPoint[] {
  const points: WeatherDataPoint[] = [];
  
  for (let i = 0; i < hourlyData.time.length; i++) {
    points.push({
      time: hourlyData.time[i],
      temperature: hourlyData.temperature_2m[i],
      humidity: hourlyData.relative_humidity_2m[i],
      precipitation: hourlyData.precipitation[i] || 0,
      windSpeed: hourlyData.wind_speed_10m[i],
      pressure: hourlyData.pressure_msl[i],
    });
  }
  
  return points;
}
