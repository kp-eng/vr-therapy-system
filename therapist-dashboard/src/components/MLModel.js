import * as tf from '@tensorflow/tfjs';

class PTSDTherapyModel {
    constructor() {
        this.model = null;
        this.isTraining = false;
        this.trainingData = [];
    }

    createModel() {
        const model = tf.sequential({
            layers: [
                tf.layers.dense({ 
                    inputShape: [5], 
                    units: 16, 
                    activation: 'relu',
                    kernelInitializer: 'heNormal'
                }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ 
                    units: 8, 
                    activation: 'relu' 
                }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ 
                    units: 1, 
                    activation: 'sigmoid' 
                })
            ]
        });

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });

        this.model = model;
        console.log('✅ ML Model created');
        return model;
    }

    async predictStressLevel(heartRate, exposureLevel, sessionDuration, baseline, age = 30) {
        if (!this.model) {
            this.createModel();
        }

        const normalizedInputs = [
            (heartRate - 60) / 80,
            exposureLevel / 10,
            sessionDuration / 3600,
            (baseline - 60) / 80,
            (age - 18) / 62
        ];

        const inputTensor = tf.tensor2d([normalizedInputs]);
        const prediction = this.model.predict(inputTensor);
        const stressLevel = (await prediction.data())[0];

        inputTensor.dispose();
        prediction.dispose();

        return stressLevel;
    }

    async recommendExposureAdjustment(currentStress, currentLevel) {
        if (currentStress > 0.7) {
            return {
                action: 'decrease',
                suggestedLevel: Math.max(0, currentLevel - 2),
                reason: 'High stress detected - reducing exposure'
            };
        } else if (currentStress >= 0.3 && currentStress <= 0.5) {
            return {
                action: 'increase',
                suggestedLevel: Math.min(10, currentLevel + 1),
                reason: 'Patient handling well - gradual increase'
            };
        } else if (currentStress < 0.3) {
            return {
                action: 'increase',
                suggestedLevel: Math.min(10, currentLevel + 2),
                reason: 'Low stress - safe to increase exposure'
            };
        } else {
            return {
                action: 'maintain',
                suggestedLevel: currentLevel,
                reason: 'Current level is optimal'
            };
        }
    }

    collectTrainingData(heartRate, exposureLevel, sessionDuration, baseline, age, stressLabel) {
        const dataPoint = {
            inputs: [
                (heartRate - 60) / 80,
                exposureLevel / 10,
                sessionDuration / 3600,
                (baseline - 60) / 80,
                (age - 18) / 62
            ],
            output: stressLabel
        };

        this.trainingData.push(dataPoint);
        console.log(`📊 Training data collected: ${this.trainingData.length} samples`);
    }

    async trainModel(epochs = 50) {
        if (this.trainingData.length < 10) {
            console.warn('⚠️ Not enough training data. Need at least 10 samples.');
            return null;
        }

        if (!this.model) {
            this.createModel();
        }

        this.isTraining = true;

        const inputs = this.trainingData.map(d => d.inputs);
        const outputs = this.trainingData.map(d => d.output);

        const xs = tf.tensor2d(inputs);
        const ys = tf.tensor2d(outputs, [outputs.length, 1]);

        console.log('🎓 Starting model training...');

        const history = await this.model.fit(xs, ys, {
            epochs: epochs,
            batchSize: 8,
            validationSplit: 0.2,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if (epoch % 10 === 0) {
                        console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
                    }
                }
            }
        });

        xs.dispose();
        ys.dispose();

        this.isTraining = false;
        console.log('✅ Model training complete!');

        return history;
    }

    async getModelWeights() {
        if (!this.model) {
            return null;
        }

        const weights = this.model.getWeights();
        const weightData = await Promise.all(
            weights.map(async (w) => {
                const data = await w.data();
                return {
                    shape: w.shape,
                    data: Array.from(data)
                };
            })
        );

        return weightData;
    }

    async setModelWeights(weightData) {
        if (!this.model) {
            this.createModel();
        }

        const weights = weightData.map(w => 
            tf.tensor(w.data, w.shape)
        );

        this.model.setWeights(weights);
        console.log('✅ Model weights updated from federated learning');
    }

    async saveModel() {
        if (!this.model) {
            console.error('❌ No model to save');
            return;
        }

        await this.model.save('localstorage://ptsd-therapy-model');
        console.log('✅ Model saved to browser storage');
    }

    async loadModel() {
        try {
            this.model = await tf.loadLayersModel('localstorage://ptsd-therapy-model');
            console.log('✅ Model loaded from browser storage');
            return true;
        } catch (error) {
            console.log('ℹ️ No saved model found, creating new one');
            this.createModel();
            return false;
        }
    }

    generateSyntheticData(numSamples = 100) {
        console.log(`🔄 Generating ${numSamples} synthetic training samples...`);

        for (let i = 0; i < numSamples; i++) {
            const baseline = 65 + Math.random() * 15;
            const exposureLevel = Math.floor(Math.random() * 11);
            const age = 20 + Math.floor(Math.random() * 50);
            
            const stressIncrease = exposureLevel * 3 + (Math.random() * 10 - 5);
            const heartRate = baseline + stressIncrease;
            const sessionDuration = 300 + Math.random() * 2700;

            const stressLabel = (heartRate - baseline) > 20 ? 1 : 0;

            this.collectTrainingData(
                heartRate,
                exposureLevel,
                sessionDuration,
                baseline,
                age,
                stressLabel
            );
        }

        console.log('✅ Synthetic data generation complete');
    }
}

const mlModel = new PTSDTherapyModel();
export default mlModel;