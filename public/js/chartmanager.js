class ChartManager {
    constructor(sensorData, canvasElement) {
        this.sensorData = [];  // Rolling buffer of data
        this.chart = null;
        this.ctx = canvasElement.getContext('2d');
        this.granularity = 75; 
        this.lastUpdate = 0;    // Track last update time
        this.updateInterval = 1000/60; 
        this.triggerValue = null;
        
        // Set up input listener
        const inputId = 'triggerValue-' + canvasElement.id.replace('canvas-', '');
        const input = document.getElementById(inputId);
        console.log("Looking for input:", inputId, input);
        if (input) {
            input.addEventListener('change', (e) => {
                console.log("Input changed:", e.target.value);
                this.setTriggerValue(parseInt(e.target.value));
            });
        }
        
        this.config = {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Sensor Value',
                    data: [],
                    borderColor: '#61dafb',
                    backgroundColor: 'rgba(97, 218, 251, 0.1)',
                    tension: 0,
                    borderWidth: 2,
                    pointRadius: 0,
                    cubicInterpolationMode: 'monotone',
                    segment: {
                        borderColor: ctx => ctx.p0.parsed.y < this.triggerValue ? '#ff6b6b' : '#61dafb'
                    }
                },
                {
                    label: 'Trigger Level',
                    data: [],
                    borderColor: 'rgba(255, 0, 0, 0.8)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        type: 'linear',
                        display: true,
                        title: {
                            display: true,
                            text: 'Time (s)',
                            color: '#e0e0e0'
                        },
                        ticks: {
                            color: '#e0e0e0',
                            stepSize: 1.0
                        },
                        grid: {
                            color: '#444444'
                        },
                        min: -15,
                        max: 0
                    },
                    y: {
                        beginAtZero: true,
                        display: true,
                        title: {
                            display: true,
                            text: 'Sensor Value',
                            color: '#e0e0e0'
                        },
                        ticks: {
                            color: '#e0e0e0'
                        },
                        grid: {
                            color: '#444444'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0'
                        }
                    }
                },
                onClick: (e, elements, chart) => {
                    console.log("Chart clicked!", e);
                    const rect = e.native.target.getBoundingClientRect();
                    const y = e.native.clientY - rect.top;
                    const value = Math.round(this.chart.scales.y.getValueForPixel(y));
                    console.log("Click value:", value);
                    
                    // Update input field
                    const inputId = 'triggerValue-' + this.ctx.canvas.id.replace('canvas-', '');
                    const input = document.getElementById(inputId);
                    console.log("Found input for update:", inputId, input);
                    if (input) input.value = value;
                    
                    this.setTriggerValue(value);
                }
            }
        };
    }

    initChart() {
        if (this.chart) {
            this.chart.destroy();
        }
        this.chart = new Chart(this.ctx, this.config);
    }

    setTriggerValue(value) {
        console.log("Setting trigger value:", value);
        if (isNaN(value)) {
            console.log("Invalid value, skipping");
            return;
        }
        
        this.triggerValue = value;
        
        // Update input field again to be sure
        const inputId = 'triggerValue-' + this.ctx.canvas.id.replace('canvas-', '');
        const input = document.getElementById(inputId);
        console.log("Found input in setTriggerValue:", inputId, input);
        if (input) input.value = value;
        
        // Update trigger line
        this.chart.data.datasets[1].data = [
            { x: -15, y: value },
            { x: 0, y: value }
        ];
        console.log("Updated trigger line data:", this.chart.data.datasets[1].data);
        this.chart.update('none');
    }

    updateChart(newData) {
        if (!this.chart) {
            this.initChart();
        }

        // Add new data to our rolling buffer
        this.sensorData = [...this.sensorData, ...newData];
        
        // Check if enough time has passed since last update
        const now = performance.now();
        if (now - this.lastUpdate < this.updateInterval) {
            return;  // Skip update if too soon
        }
        this.lastUpdate = now;

        // Keep only last 15 seconds of data
        const latestTime = Math.max(...this.sensorData.map(d => d.timestamp));
        this.sensorData = this.sensorData.filter(d => d.timestamp >= latestTime - 15000);

        // Convert timestamps and reduce granularity
        const validData = this.sensorData
            .filter(point => point.value !== null && !isNaN(point.value))
            .reduce((acc, point) => {
                const roundedTime = Math.round((point.timestamp - latestTime) / this.granularity) * this.granularity;
                if (!acc.some(p => Math.round((p.x * 1000)) === roundedTime)) {
                    acc.push({
                        x: roundedTime / 1000,
                        y: point.value
                    });
                }
                return acc;
            }, [])
            .sort((a, b) => a.x - b.x);

        if (validData.length > 0) {
            this.chart.data.datasets[0].data = validData;
            
            // Update trigger line
            if (this.triggerValue !== null) {
                this.chart.data.datasets[1].data = [
                    { x: -15, y: this.triggerValue },
                    { x: 0, y: this.triggerValue }
                ];
            }
            
            this.chart.update('none');
        }
    }
}