class SensorManager {
    constructor() {
        this.initializeExistingCards();
        this.setupWebSocket();
        
        setInterval(this.refreshSensorDevices.bind(this), 5000);
        setTimeout(this.getChartDataPoint.bind(this), 150);
    }

    initializeExistingCards() {
        document.querySelectorAll('[data-sensor-name]').forEach(element => {
            const name = element.dataset.sensorName;
            new SensorConfigCard({
                name,
                effects: window.effects,
                config: window.sensors.find(s => s.name === name) || {},
                element
            });
        });
    }

    setupWebSocket() {
        this.socket = new WebSocket(`ws://${window.location.host}/ws`);
        this.socket.onmessage = this.handleSocketMessage.bind(this);
        this.socket.onerror = this.handleSocketError.bind(this);
        this.socket.onclose = this.handleSocketClose.bind(this);
        
    }

    getChartDataPoint() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send('mqttlog');
            setTimeout(this .getChartDataPoint.bind(this), 150);
        } else {    
            setTimeout(this.getChartDataPoint.bind(this), 1000);    
        }   
    }

  
    async refreshSensorDevices() {
        try {
            const response = await fetch('/api/sensor-devices');
            this.updateSensorStates(await response.json());
        } catch (error) {
            console.error('Sensor refresh failed:', error);
        }
    }

    updateSensorStates(devices) {
        devices.forEach(device => {
            const card = SensorConfigCard.registry.get(device.name) || 
                new SensorConfigCard({
                    name: device.name,
                    effects: window.effects,
                    config: window.sensors.find(s => s.name === device.name) || {}
                });
            card.updateConnectionStatus(true);
        });

        SensorConfigCard.registry.forEach((card, name) => {
            if (!devices.some(device => device.name === name)) {
                card.updateConnectionStatus(false);
            }
        });
    }

    handleSocketMessage(event) {
        try {
            const messages = JSON.parse(event.data);
            if (!Array.isArray(messages)) {
                throw new Error('Invalid message format - expected array');
            }
            
            const sensorData = new Map();  // Use Map for better key management
            
            // First process all messages
            messages.forEach(message => {
                const chartSensorName = `stairled-sensor-${message.sensor}`;
                const card = SensorConfigCard.registry.get(chartSensorName);
                
                if (card) {
                    if (!sensorData.has(chartSensorName)) {
                        sensorData.set(chartSensorName, []);
                    }
                    
                    sensorData.get(chartSensorName).push(message);
                }
            });

            // Then update all relevant cards
            sensorData.forEach((dataPoints, sensorName) => {
                const card = SensorConfigCard.registry.get(sensorName);
                if (card) {
                    card.updateChart(dataPoints);
                }
            });
            
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    }

    handleSocketError(error) {
        console.error('WebSocket error:', error);
    }

    handleSocketClose(event) {
        console.log(`WebSocket closed: ${event.reason}`);
        setTimeout(() => this.reconnectSocket(), 5000);
    }

    reconnectSocket() {
        if (this.socket.readyState === WebSocket.CLOSED) {
            this.socket = new WebSocket(this.socket.url);
            this.socket.onmessage = this.handleSocketMessage.bind(this);
            this.socket.onerror = this.handleSocketError.bind(this);
            this.socket.onclose = this.handleSocketClose.bind(this);
        }
    }
}

// Initialize cleanly
document.addEventListener('DOMContentLoaded', () => new SensorManager()); 