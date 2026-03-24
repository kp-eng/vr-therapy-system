class FederatedLearningClient {
    constructor(hospitalId, serverUrl = 'http://localhost:5000') {
        this.hospitalId = hospitalId;
        this.serverUrl = serverUrl;
        this.isConnected = false;
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.serverUrl}/`);
            const data = await response.json();
            this.isConnected = true;
            console.log('✅ Connected to FL Server:', data);
            return data;
        } catch (error) {
            this.isConnected = false;
            console.error('❌ FL Server connection failed:', error);
            return null;
        }
    }

    async uploadModel(modelWeights, numSamples) {
        try {
            const response = await fetch(`${this.serverUrl}/upload_model`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    hospital_id: this.hospitalId,
                    weights: modelWeights,
                    num_samples: numSamples
                })
            });

            const data = await response.json();
            console.log(`📤 Model uploaded from ${this.hospitalId}:`, data);
            return data;
        } catch (error) {
            console.error('❌ Model upload failed:', error);
            return null;
        }
    }

    async downloadGlobalModel() {
        try {
            const response = await fetch(`${this.serverUrl}/get_global_model`);
            
            if (response.status === 404) {
                console.log('ℹ️ No global model available yet');
                return null;
            }

            const data = await response.json();
            console.log('📥 Global model downloaded:', data);
            return data.weights;
        } catch (error) {
            console.error('❌ Global model download failed:', error);
            return null;
        }
    }

    async getStats() {
        try {
            const response = await fetch(`${this.serverUrl}/stats`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ Stats fetch failed:', error);
            return null;
        }
    }

    async participateInFLRound(mlModel) {
        console.log(`\n🔄 Starting FL Round for ${this.hospitalId}...`);

        const weights = await mlModel.getModelWeights();
        const numSamples = mlModel.trainingData.length;

        console.log(`   Local samples: ${numSamples}`);

        const uploadResult = await this.uploadModel(weights, numSamples);

        if (!uploadResult) {
            return { success: false, message: 'Upload failed' };
        }

        console.log('   Waiting for aggregation...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const globalWeights = await this.downloadGlobalModel();

        if (globalWeights) {
            await mlModel.setModelWeights(globalWeights);
            console.log('✅ FL Round complete! Local model updated');
            
            return { 
                success: true, 
                message: 'Model updated with federated learning',
                ready_for_aggregation: uploadResult.ready_for_aggregation
            };
        } else {
            return { 
                success: true, 
                message: 'Model uploaded, waiting for more hospitals',
                ready_for_aggregation: false
            };
        }
    }
}

export default FederatedLearningClient;