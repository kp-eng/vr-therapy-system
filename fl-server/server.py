from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Storage
hospital_models = {}
global_model = None
training_rounds = 0
training_history = []

# Configuration
MIN_HOSPITALS_FOR_AGGREGATION = 2

@app.route('/')
def home():
    return jsonify({
        "status": "Federated Learning Server Running",
        "hospitals_connected": len(hospital_models),
        "training_rounds": training_rounds,
        "global_model_available": global_model is not None,
        "last_update": datetime.now().isoformat()
    })

@app.route('/upload_model', methods=['POST'])
def upload_model():
    global hospital_models, training_rounds
    
    data = request.json
    hospital_id = data.get('hospital_id')
    weights = data.get('weights')
    num_samples = data.get('num_samples', 0)
    
    if not hospital_id or not weights:
        return jsonify({"error": "Missing hospital_id or weights"}), 400
    
    hospital_models[hospital_id] = {
        'weights': weights,
        'timestamp': datetime.now().isoformat(),
        'num_samples': num_samples
    }
    
    print(f"\n✅ Received model from {hospital_id}")
    print(f"   Samples: {num_samples}")
    print(f"   Total hospitals waiting: {len(hospital_models)}")
    
    if len(hospital_models) >= MIN_HOSPITALS_FOR_AGGREGATION:
        aggregate_models()
        training_rounds += 1
    
    return jsonify({
        "status": "success",
        "message": f"Model received from {hospital_id}",
        "hospitals_count": len(hospital_models),
        "ready_for_aggregation": len(hospital_models) >= MIN_HOSPITALS_FOR_AGGREGATION,
        "training_round": training_rounds
    })

def aggregate_models():
    global global_model, hospital_models, training_history
    
    print(f"\n{'='*60}")
    print(f"🔄 FEDERATED AVERAGING - Round {training_rounds + 1}")
    print(f"{'='*60}")
    
    if len(hospital_models) == 0:
        return
    
    all_weights = []
    all_samples = []
    hospital_ids = []
    
    for hospital_id, model_data in hospital_models.items():
        all_weights.append(model_data['weights'])
        all_samples.append(model_data['num_samples'])
        hospital_ids.append(hospital_id)
    
    total_samples = sum(all_samples)
    
    print(f"Hospitals: {', '.join(hospital_ids)}")
    print(f"Total samples: {total_samples}")
    
    if total_samples == 0:
        global_model = average_weights(all_weights)
        print("Method: Simple averaging")
    else:
        global_model = weighted_average(all_weights, all_samples, total_samples)
        print("Method: Weighted averaging")
    
    training_history.append({
        'round': training_rounds + 1,
        'timestamp': datetime.now().isoformat(),
        'hospitals': hospital_ids,
        'total_samples': total_samples
    })
    
    print(f"✅ Global model updated!")
    print(f"{'='*60}\n")
    
    hospital_models.clear()

def average_weights(weights_list):
    averaged = []
    for layer_idx in range(len(weights_list[0])):
        layer_weights = [w[layer_idx] for w in weights_list]
        avg_data = np.mean([np.array(w['data']) for w in layer_weights], axis=0)
        averaged.append({
            'shape': layer_weights[0]['shape'],
            'data': avg_data.tolist()
        })
    return averaged

def weighted_average(weights_list, samples_list, total_samples):
    averaged = []
    for layer_idx in range(len(weights_list[0])):
        layer_weights = [w[layer_idx] for w in weights_list]
        weighted_sum = np.zeros_like(np.array(layer_weights[0]['data']))
        
        for w, num_samples in zip(layer_weights, samples_list):
            weight = num_samples / total_samples
            weighted_sum += weight * np.array(w['data'])
        
        averaged.append({
            'shape': layer_weights[0]['shape'],
            'data': weighted_sum.tolist()
        })
    return averaged

@app.route('/get_global_model', methods=['GET'])
def get_global_model():
    if global_model is None:
        return jsonify({
            "status": "no_model",
            "message": "No global model available yet"
        }), 404
    
    return jsonify({
        "status": "success",
        "weights": global_model,
        "training_round": training_rounds,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/stats', methods=['GET'])
def get_stats():
    return jsonify({
        "training_rounds": training_rounds,
        "hospitals_waiting": len(hospital_models),
        "hospitals_list": list(hospital_models.keys()),
        "global_model_available": global_model is not None,
        "min_hospitals_needed": MIN_HOSPITALS_FOR_AGGREGATION,
        "history": training_history[-10:]
    })

@app.route('/reset', methods=['POST'])
def reset_server():
    global hospital_models, global_model, training_rounds, training_history
    hospital_models.clear()
    global_model = None
    training_rounds = 0
    training_history.clear()
    print("\n🔄 Server reset complete\n")
    return jsonify({"status": "success", "message": "Server reset"})

if __name__ == '__main__':
    print("\n" + "="*70)
    print("🏥 FEDERATED LEARNING SERVER FOR VR PTSD THERAPY")
    print("="*70)
    print(f"Server URL: http://localhost:5000")
    print(f"Min hospitals for aggregation: {MIN_HOSPITALS_FOR_AGGREGATION}")
    print(f"Status: READY")
    print("="*70 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)