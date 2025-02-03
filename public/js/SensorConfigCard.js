class SensorConfigCard {
    static registry = new Map();
    
    constructor({name, effects, config = {}, element}) {
        this.name = name;
        this.effects = effects;
        this.config = config;
        
        this.element = element || this.findExistingElement() || this.createNewElement();
        
        if (this.element.__initialized) return;
        this.element.__initialized = true;
        
        this.initializeChart();
        this.bindSaveHandler();
        SensorConfigCard.registry.set(name, this);
    }
    
    findExistingElement() {
        return document.querySelector(`.sensor-card[data-sensor-name="${this.name}"]`);
    }
    
    createNewElement() {
        const template = Handlebars.partials['sensor-config-card'];
        const div = document.createElement('div');
        div.innerHTML = template(this.config);
        return div.firstElementChild;
    }
    
    render() {
        const context = {
            name: this.name,
            channel: this.config.channel || '',
            triggerThreshold: this.config.triggerThreshold || 0,
            triggerType: this.config.triggerType || '>=',
            triggerEffect: this.config.triggerEffect || '',
            effects: this.effects,
            connected: this.config.connected || false
        };
        
        const html = this.template(context);
        this.element.innerHTML = html;
        
        this.updateConnectionStatus(this.config.connected || false);
    }
    
    initializeChart() {
        if (!this.element.querySelector('canvas.__chart')) {
            this.chart = new ChartManager(
                [],
                this.element.querySelector('canvas'),
                { xMin: -15, xMax: 0, fixedScale: true }
            );
            this.chart.initChart();
            
            if (this.config.triggerThreshold) {
                this.chart.setTriggerValue(this.config.triggerThreshold);
            }
        }
    }
    
    bindSaveHandler() {
        $(document).on('submit', `.sensor-card-wrapper[data-sensor-name="${this.name}"] form`, (e) => {
            e.preventDefault();
            e.stopPropagation();

            this.saveConfig(new FormData(e.target));
            
            if (this.chart) {
                const newThreshold = parseFloat(e.target.elements[`sensor_${this.name}_triggerThreshold`].value);
                if (!isNaN(newThreshold)) {
                    this.chart.setTriggerValue(newThreshold);
                }
            }
        });
    }
    
    saveConfig(formData) {
        const configUpdate = {
            channel: parseInt(formData.get(`sensor_${this.name}_channel`)),
            triggerThreshold: parseFloat(formData.get(`sensor_${this.name}_triggerThreshold`)),
            triggerType: formData.get(`sensor_${this.name}_triggerType`),
            triggerEffect: formData.get(`sensor_${this.name}_triggerEffect`)
        };
        
        Object.assign(this.config, configUpdate);
        
        fetch('/sensors', {
            method: 'POST',
            body: new URLSearchParams({
                name: this.name,
                ...configUpdate
            }),
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).then(response => {
            if (response.ok) {
                console.log(`${this.name} config saved`);
            }
        }).catch(error => {
            console.error('Save failed:', error);
        });
    }
    
    updateChart(data) {
        this.chart.updateChart(data);
    }
    
    updateConnectionStatus(connected) {
        const badge = this.element.querySelector('.badge');
        badge.className = `badge bg-${connected ? 'success' : 'danger'}`;
        badge.textContent = connected ? 'Connected' : 'Disconnected';
    }
}