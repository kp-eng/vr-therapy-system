import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Heart, Activity, AlertTriangle, Play, Square, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import './Dashboard.css';
import mlModel from './MLModel';
import FederatedLearningClient from './FederatedLearning';

function Dashboard() {
    const [isConnected, setIsConnected] = useState(false);
    const [heartRate, setHeartRate] = useState(72);
    const [exposureLevel, setExposureLevel] = useState(0);
    const [hrHistory, setHrHistory] = useState([]);
    const [sessionActive, setSessionActive] = useState(false);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [sessionDuration, setSessionDuration] = useState(0);
    const [notes, setNotes] = useState('');
    const [savedNotes, setSavedNotes] = useState([]);
    const [mlPrediction, setMlPrediction] = useState(null);
    const [mlRecommendation, setMlRecommendation] = useState(null);
    const [modelTrained, setModelTrained] = useState(false);
    const [trainingProgress, setTrainingProgress] = useState('');
    const [flClient] = useState(() => new FederatedLearningClient(`Hospital-${Math.floor(Math.random() * 1000)}`));
    const [flConnected, setFlConnected] = useState(false);
    const [flStats, setFlStats] = useState(null);
    const [flLastUpdate, setFlLastUpdate] = useState(null);
    
    const patientInfo = {
        id: 'P-2025-001',
        name: 'Test Patient',
        baseline: 72,
        currentSession: 1,
        traumaType: 'Motor Vehicle Accident'
    };

    // Initialize ML Model
useEffect(() => {
    const initializeML = async () => {
        const loaded = await mlModel.loadModel();
        
        if (!loaded) {
            setTrainingProgress('Generating training data...');
            mlModel.generateSyntheticData(200);
            
            setTrainingProgress('Training model...');
            await mlModel.trainModel(30);
            
            await mlModel.saveModel();
            setTrainingProgress('Model ready!');
        }
        
        setModelTrained(true);
        setTimeout(() => setTrainingProgress(''), 2000);
    };

    initializeML();

    setTimeout(() => {
        setIsConnected(true);
        console.log('Dashboard ready');
    }, 500);

   
}, []);

// Initialize Federated Learning
// Initialize Federated Learning
useEffect(() => {
    const initFL = async () => {
        const connection = await flClient.testConnection();
        if (connection) {
            setFlConnected(true);
            const stats = await flClient.getStats();
            setFlStats(stats);
        }
    };

    initFL();

    const interval = setInterval(async () => {
        if (flConnected) {
            const stats = await flClient.getStats();
            setFlStats(stats);
        }
    }, 10000);

    return () => clearInterval(interval);
}, [flClient, flConnected]);

    useEffect(() => {
        let interval;
        if (sessionActive && sessionStartTime) {
            interval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
                setSessionDuration(elapsed);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [sessionActive, sessionStartTime]);

    useEffect(() => {
        if (sessionActive) {
            const interval = setInterval(() => {
                const baseVariation = Math.random() * 6 - 3;
                const levelEffect = exposureLevel * 1.5;
                const newHR = Math.round(patientInfo.baseline + levelEffect + baseVariation);
                
                setHeartRate(newHR);
                // Get ML prediction
if (modelTrained) {
    mlModel.predictStressLevel(
        newHR,
        exposureLevel,
        sessionDuration,
        patientInfo.baseline,
        30
    ).then(async (stressLevel) => {
        setMlPrediction(stressLevel);
        
        const recommendation = await mlModel.recommendExposureAdjustment(
            stressLevel,
            exposureLevel
        );
        setMlRecommendation(recommendation);
        
        const stressed = (newHR - patientInfo.baseline) > 20 ? 1 : 0;
        mlModel.collectTrainingData(
            newHR,
            exposureLevel,
            sessionDuration,
            patientInfo.baseline,
            30,
            stressed
        );
    });
}
                
                const timestamp = new Date().toLocaleTimeString();
                setHrHistory(prev => {
                    const newHistory = [...prev, { time: timestamp, hr: newHR, level: exposureLevel }];
                    return newHistory.slice(-50);
                });
            }, 2000);
            
            return () => clearInterval(interval);
        }
    }, [sessionActive, exposureLevel, patientInfo.baseline]);

    const getHRStatus = () => {
        const change = heartRate - patientInfo.baseline;
        if (change < 10) return { status: 'Normal', color: '#4CAF50', bgColor: '#E8F5E9' };
        if (change < 20) return { status: 'Elevated', color: '#FF9800', bgColor: '#FFF3E0' };
        if (change < 35) return { status: 'High', color: '#FF5722', bgColor: '#FBE9E7' };
        return { status: 'CRITICAL', color: '#F44336', bgColor: '#FFEBEE' };
    };

    const hrStatus = getHRStatus();

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startSession = () => {
        setSessionActive(true);
        setSessionStartTime(Date.now());
        setExposureLevel(0);
        setHrHistory([]);
        setSavedNotes([]);
        setMlPrediction(null);
setMlRecommendation(null);
    };

    const endSession = () => {
        if (window.confirm('Are you sure you want to end this session?')) {
            setSessionActive(false);
            setSessionStartTime(null);
        }
    };

    const emergencyStop = () => {
        if (window.confirm('⚠️ EMERGENCY STOP - Are you sure?')) {
            setSessionActive(false);
            setSessionStartTime(null);
            setExposureLevel(0);
        }
    };

    const updateExposureLevel = (newLevel) => {
        const level = Math.max(0, Math.min(10, parseInt(newLevel)));
        setExposureLevel(level);
    };

    const increaseLevel = () => updateExposureLevel(exposureLevel + 1);
    const decreaseLevel = () => updateExposureLevel(exposureLevel - 1);
    const resetToSafe = () => updateExposureLevel(0);

    const saveNote = () => {
        if (notes.trim()) {
            const newNote = {
                timestamp: new Date().toLocaleTimeString(),
                exposureLevel: exposureLevel,
                heartRate: heartRate,
                content: notes
            };
            setSavedNotes([...savedNotes, newNote]);
            setNotes('');
        }
    };
    // Participate in Federated Learning
const participateInFL = async () => {
    if (!modelTrained) {
        alert('Please wait for local model to finish training');
        return;
    }

    if (!flConnected) {
        alert('FL Server not connected. Make sure server is running on port 5000.');
        return;
    }

    setTrainingProgress('Participating in federated learning...');
    const result = await flClient.participateInFLRound(mlModel);
    
    if (result.success) {
        setFlLastUpdate(new Date().toLocaleTimeString());
        setTrainingProgress('');
        
        const stats = await flClient.getStats();
        setFlStats(stats);
        
        alert('✅ ' + result.message);
    } else {
        setTrainingProgress('');
        alert('❌ Federated learning failed. Check console for details.');
    }
};

    const getExposureDescription = () => {
        if (exposureLevel === 0) return "Safe Environment - No Triggers";
        if (exposureLevel <= 3) return "Minimal Exposure - Introduction Phase";
        if (exposureLevel <= 6) return "Moderate Exposure - Active Processing";
        if (exposureLevel <= 8) return "Significant Exposure - Deep Processing";
        return "High Intensity - Maximum Therapeutic Exposure";
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>🧠 VR PTSD Therapy Monitor</h1>
                    <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                        {isConnected ? '● Connected' : '○ Disconnected'}
                    </span>
                </div>
                <div className="patient-info">
                    <div className="info-item">
                        <span className="label">Patient ID:</span>
                        <span className="value">{patientInfo.id}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Session:</span>
                        <span className="value">#{patientInfo.currentSession}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Trauma Type:</span>
                        <span className="value">{patientInfo.traumaType}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Status:</span>
                        <span className={`session-status ${sessionActive ? 'active' : 'inactive'}`}>
                            {sessionActive ? '🔴 ACTIVE' : '⚪ Inactive'}
                        </span>
                    </div>
                </div>
            </header>

            <div className="dashboard-content">
                <div className="top-row">
                    <div className="card vitals-card">
                        <div className="card-header">
                            <Heart className="icon" size={24} />
                            <h2>Heart Rate Monitor</h2>
                        </div>
                        
                        <div className="hr-main">
                            <div className="hr-display" style={{ borderColor: hrStatus.color }}>
                                <div className="hr-number" style={{ color: hrStatus.color }}>
                                    {heartRate}
                                </div>
                                <div className="hr-unit">BPM</div>
                            </div>
                            
                            <div className="hr-status-badge" style={{ 
                                backgroundColor: hrStatus.bgColor,
                                color: hrStatus.color,
                                border: `2px solid ${hrStatus.color}`
                            }}>
                                {hrStatus.status}
                            </div>
                        </div>

                        <div className="hr-stats">
                            <div className="stat">
                                <span className="stat-label">Baseline</span>
                                <span className="stat-value">{patientInfo.baseline} BPM</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Change</span>
                                <span className="stat-value" style={{ 
                                    color: heartRate > patientInfo.baseline + 20 ? '#F44336' : '#4CAF50' 
                                }}>
                                    {heartRate > patientInfo.baseline ? '+' : ''}
                                    {heartRate - patientInfo.baseline} BPM
                                </span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Session Duration</span>
                                <span className="stat-value">{formatDuration(sessionDuration)}</span>
                            </div>
                        </div>

                        <div className="hr-chart">
                            <h3>Real-Time Monitoring</h3>
                            {hrHistory.length > 0 ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <LineChart data={hrHistory}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                        <XAxis 
                                            dataKey="time" 
                                            tick={{ fontSize: 10 }}
                                            interval={Math.floor(hrHistory.length / 6)}
                                        />
                                        <YAxis 
                                            domain={[60, 120]} 
                                            tick={{ fontSize: 10 }}
                                        />
                                        <Tooltip />
                                        <Line 
                                            type="monotone" 
                                            dataKey="hr" 
                                            stroke="#2196F3" 
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="no-data">
                                    <Activity size={48} color="#ccc" />
                                    <p>Start session to begin monitoring</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card exposure-card">
                        <div className="card-header">
                            <Activity className="icon" size={24} />
                            <h2>Exposure Level Control</h2>
                        </div>

                        <div className="exposure-display">
                            <div className="level-circle">
                                <div className="level-number">{exposureLevel}</div>
                                <div className="level-max">/ 10</div>
                            </div>
                            <div className="level-description">
                                {getExposureDescription()}
                            </div>
                        </div>

                        <div className="level-slider-container">
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={exposureLevel}
                                onChange={(e) => updateExposureLevel(e.target.value)}
                                disabled={!sessionActive}
                                className="level-slider"
                            />
                            <div className="level-markers">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                    <span key={num} className="marker">{num}</span>
                                ))}
                            </div>
                        </div>

                        <div className="quick-actions">
                            <button 
                                onClick={resetToSafe} 
                                disabled={!sessionActive}
                                className="btn btn-safe"
                            >
                                <RotateCcw size={16} />
                                Safe Zone
                            </button>
                            <button 
                                onClick={decreaseLevel} 
                                disabled={!sessionActive || exposureLevel === 0}
                                className="btn btn-secondary"
                            >
                                <ArrowDown size={16} />
                                Decrease
                            </button>
                            <button 
                                onClick={increaseLevel} 
                                disabled={!sessionActive || exposureLevel === 10}
                                className="btn btn-secondary"
                            >
                                <ArrowUp size={16} />
                                Increase
                            </button>
                        </div>

                        <div className="intensity-bar">
                            <div 
                                className="intensity-fill"
                                style={{
                                    width: `${exposureLevel * 10}%`,
                                    backgroundColor: exposureLevel <= 3 ? '#4CAF50' : 
                                                    exposureLevel <= 6 ? '#FF9800' : '#F44336'
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="bottom-row">
                    <div className="card session-card">
                        <div className="card-header">
                            <AlertTriangle className="icon" size={24} />
                            <h2>Session Control</h2>
                        </div>

                        {!sessionActive ? (
                            <div className="session-start">
                                <p className="session-info">Ready to begin therapy session</p>
                                <button onClick={startSession} className="btn btn-start">
                                    <Play size={20} />
                                    Start Session
                                </button>
                            </div>
                        ) : (
                            <div className="session-active">
                                <div className="session-timer">
                                    <div className="timer-display">
                                        {formatDuration(sessionDuration)}
                                    </div>
                                    <div className="timer-label">Session Duration</div>
                                </div>

                                <div className="session-controls">
                                    <button onClick={endSession} className="btn btn-end">
                                        <Square size={20} />
                                        End Session
                                    </button>
                                    <button onClick={emergencyStop} className="btn btn-emergency">
                                        <AlertTriangle size={20} />
                                        EMERGENCY STOP
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="card notes-card">
                        <div className="card-header">
                            <h2>Session Notes</h2>
                         {/* AI Insights Card */}
<div className="card ml-card">
    <div className="card-header">
        <Activity className="icon" size={24} />
        <h2>AI Insights</h2>
        {trainingProgress && (
            <span className="training-badge">{trainingProgress}</span>
        )}
    </div>

    {!modelTrained ? (
        <div className="ml-loading">
            <p>Initializing AI model...</p>
        </div>
    ) : (
        <>
            {/* Stress Prediction */}
            <div className="ml-section">
                <h3>Predicted Stress Level</h3>
                {mlPrediction !== null ? (
                    <div className="stress-meter">
                        <div className="stress-bar">
                            <div 
                                className="stress-fill"
                                style={{
                                    width: `${mlPrediction * 100}%`,
                                    backgroundColor: 
                                        mlPrediction < 0.3 ? '#4CAF50' :
                                        mlPrediction < 0.7 ? '#FF9800' : '#F44336'
                                }}
                            />
                        </div>
                        <div className="stress-label">
                            {mlPrediction < 0.3 ? '😊 Low Stress' :
                             mlPrediction < 0.5 ? '😐 Moderate Stress' :
                             mlPrediction < 0.7 ? '😰 High Stress' : '🚨 Critical Stress'}
                            <span className="stress-value">
                                {(mlPrediction * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                ) : (
                    <p className="no-prediction">Start session for AI predictions</p>
                )}
            </div>

            {/* AI Recommendation */}
            {mlRecommendation && sessionActive && (
                <div className="ml-section">
                    <h3>AI Recommendation</h3>
                    <div className={`recommendation-box ${mlRecommendation.action}`}>
                        <div className="recommendation-action">
                            {mlRecommendation.action === 'increase' && '⬆️ Increase Exposure'}
                            {mlRecommendation.action === 'decrease' && '⬇️ Decrease Exposure'}
                            {mlRecommendation.action === 'maintain' && '➡️ Maintain Level'}
                        </div>
                        <div className="recommendation-level">
                            Suggested Level: <strong>{mlRecommendation.suggestedLevel}</strong>
                        </div>
                        <div className="recommendation-reason">
                            {mlRecommendation.reason}
                        </div>
                        <button 
                            onClick={() => updateExposureLevel(mlRecommendation.suggestedLevel)}
                            className="btn btn-apply-recommendation"
                        >
                            Apply Recommendation
                        </button>
                    </div>
                </div>
            )}

            {/* Model Stats */}
            <div className="ml-section">
                <h3>Model Information</h3>
                <div className="model-stats">
                    <div className="model-stat">
                        <span className="stat-label">Training Samples</span>
                        <span className="stat-value">{mlModel.trainingData.length}</span>
                    </div>
                    <div className="model-stat">
                        <span className="stat-label">Model Status</span>
                        <span className="stat-value status-active">Active</span>
                    </div>
                </div>
            </div>

            {/* Federated Learning Section */}
            <div className="ml-section">
                <h3>Federated Learning</h3>
                
                <div className="fl-status">
                    <div className="fl-connection">
                        <span className={`fl-indicator ${flConnected ? 'connected' : 'disconnected'}`}>
                            {flConnected ? '● Connected to FL Server' : '○ FL Server Offline'}
                        </span>
                    </div>

                    {flConnected && flStats && (
                        <div className="fl-stats">
                            <div className="fl-stat">
                                <span className="stat-label">Training Rounds</span>
                                <span className="stat-value">{flStats.training_rounds}</span>
                            </div>
                            <div className="fl-stat">
                                <span className="stat-label">Hospitals Waiting</span>
                                <span className="stat-value">{flStats.hospitals_waiting}</span>
                            </div>
                            <div className="fl-stat">
                                <span className="stat-label">Global Model</span>
                                <span className="stat-value">
                                    {flStats.global_model_available ? '✅ Available' : '⏳ Pending'}
                                </span>
                            </div>
                        </div>
                    )}

                    {flLastUpdate && (
                        <div className="fl-last-update">
                            Last FL update: {flLastUpdate}
                        </div>
                    )}

                    <button 
                        onClick={participateInFL}
                        disabled={!modelTrained || !flConnected}
                        className="btn btn-primary btn-fl"
                    >
                        🌐 Participate in Federated Learning
                    </button>

                    <p className="fl-note">
                        ℹ️ Your local model will be shared (weights only, no patient data) 
                        and updated with global knowledge from other hospitals
                    </p>
                </div>
            </div>
        </>
    )}
</div>   
                        </div>

                        <div className="notes-input">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Record observations, patient reactions, clinical decisions..."
                                rows="4"
                                disabled={!sessionActive}
                            />
                            <button 
                                onClick={saveNote} 
                                disabled={!sessionActive || !notes.trim()}
                                className="btn btn-primary"
                            >
                                Save Note
                            </button>
                        </div>

                        {savedNotes.length > 0 && (
                            <div className="saved-notes">
                                <h3>Recorded Notes</h3>
                                {savedNotes.map((note, index) => (
                                    <div key={index} className="note-item">
                                        <div className="note-header">
                                            <span className="note-time">{note.timestamp}</span>
                                            <span className="note-meta">
                                                Level {note.exposureLevel} | HR {note.heartRate}
                                            </span>
                                        </div>
                                        <div className="note-content">{note.content}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;