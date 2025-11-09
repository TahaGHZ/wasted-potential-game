import * as THREE from 'three';

/**
 * WeatherSystem - Manages weather variations (sunny, rainy, windy+foggy)
 */
export class WeatherSystem {
    constructor(scene, dayNightCycle = null) {
        this.scene = scene;
        this.dayNightCycle = dayNightCycle;
        
        // Weather states
        this.WEATHER_TYPES = {
            SUNNY: 'sunny',
            RAINY: 'rainy',
            WINDY_FOGGY: 'windy+foggy'
        };
        
        this.currentWeather = this.WEATHER_TYPES.SUNNY;
        this.nextWeather = null;
        this.weatherTransitionTime = 0;
        this.weatherDuration = 30; // Weather lasts 30 seconds
        this.timeInCurrentWeather = 0;
        
        // Weather effects
        this.fog = null;
        this.rainParticles = null;
        this.windStrength = 0;
        
        // Initialize
        this.setupFog();
        this.setupRain();
        
        // Start with random weather
        this.transitionToRandomWeather();
        // Set initial next weather
        this.getNextWeather();
    }
    
    setupFog() {
        // Fog will be added/removed based on weather
        this.fog = null;
    }
    
    setupRain() {
        // Rain particle system
        const rainGeometry = new THREE.BufferGeometry();
        const rainCount = 5000; // Increased from 1000 to 5000 for more visible rain
        const positions = new Float32Array(rainCount * 3);
        
        for (let i = 0; i < rainCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 200;     // x
            positions[i + 1] = Math.random() * 50 + 20;       // y
            positions[i + 2] = (Math.random() - 0.5) * 200; // z
        }
        
        rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const rainMaterial = new THREE.PointsMaterial({
            color: 0x4a90e2, // Blue color for rain
            size: 0.15, // Slightly larger for better visibility
            transparent: true,
            opacity: 0.8 // Higher opacity for better visibility
        });
        
        this.rainParticles = new THREE.Points(rainGeometry, rainMaterial);
        this.rainParticles.visible = false;
        this.scene.add(this.rainParticles);
    }
    
    update(delta) {
        this.timeInCurrentWeather += delta;
        
        // Transition to new weather after duration
        if (this.timeInCurrentWeather >= this.weatherDuration) {
            this.transitionToRandomWeather();
            this.timeInCurrentWeather = 0;
            // Calculate next weather for the new current weather
            this.getNextWeather();
        }
        
        // Update weather effects
        this.updateWeatherEffects(delta);
    }
    
    updateWeatherEffects(delta) {
        switch (this.currentWeather) {
            case this.WEATHER_TYPES.SUNNY:
                this.updateSunny(delta);
                break;
            case this.WEATHER_TYPES.RAINY:
                this.updateRainy(delta);
                break;
            case this.WEATHER_TYPES.WINDY_FOGGY:
                this.updateWindyFoggy(delta);
                break;
        }
    }
    
    updateSunny(delta) {
        // Clear weather - remove fog and rain
        if (this.fog) {
            this.scene.fog = null;
            this.fog = null;
        }
        
        if (this.rainParticles) {
            this.rainParticles.visible = false;
        }
        
        // Hide clouds for sunny weather
        if (this.dayNightCycle) {
            this.dayNightCycle.setCloudsVisible(false);
        }
        
        this.windStrength = 0;
    }
    
    updateRainy(delta) {
        // Rainy weather
        if (this.rainParticles) {
            this.rainParticles.visible = true;
            
            // Animate rain falling
            const positions = this.rainParticles.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] -= 30 * delta; // Fall speed
                
                // Reset if below ground
                if (positions[i] < 0) {
                    positions[i] = 30 + Math.random() * 20;
                    positions[i - 1] = (Math.random() - 0.5) * 200;
                    positions[i + 1] = (Math.random() - 0.5) * 200;
                }
            }
            
            this.rainParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Light fog during rain
        if (!this.fog) {
            this.fog = new THREE.Fog(0x7a7a7a, 30, 100);
            this.scene.fog = this.fog;
        }
        
        // Show clouds for rainy weather
        if (this.dayNightCycle) {
            this.dayNightCycle.setCloudsVisible(true);
        }
        
        this.windStrength = 0.3;
    }
    
    updateWindyFoggy(delta) {
        // Windy and foggy weather
        if (!this.fog) {
            this.fog = new THREE.Fog(0x8a8a8a, 10, 50); // Dense fog
            this.scene.fog = this.fog;
        }
        
        if (this.rainParticles) {
            this.rainParticles.visible = false;
        }
        
        // Show clouds for windy+foggy weather
        if (this.dayNightCycle) {
            this.dayNightCycle.setCloudsVisible(true);
        }
        
        // Wind effect (oscillating)
        this.windStrength = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
    }
    
    transitionToRandomWeather() {
        const weathers = Object.values(this.WEATHER_TYPES);
        // Pick a random weather that's different from current
        let randomWeather;
        do {
            randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
        } while (randomWeather === this.currentWeather && weathers.length > 1);
        
        // Set the new current weather
        this.setWeather(randomWeather);
        // Next weather will be calculated after this transition
        this.nextWeather = null;
    }
    
    getNextWeather() {
        // If next weather not set, calculate it now
        if (!this.nextWeather) {
            const weathers = Object.values(this.WEATHER_TYPES);
            let randomWeather;
            do {
                randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
            } while (randomWeather === this.currentWeather && weathers.length > 1);
            this.nextWeather = randomWeather;
        }
        return this.nextWeather;
    }
    
    getTimeRemaining() {
        return Math.max(0, this.weatherDuration - this.timeInCurrentWeather);
    }
    
    getProgress() {
        return Math.min(1, this.timeInCurrentWeather / this.weatherDuration);
    }
    
    setWeather(weatherType) {
        if (Object.values(this.WEATHER_TYPES).includes(weatherType)) {
            this.currentWeather = weatherType;
            this.timeInCurrentWeather = 0;
        }
    }
    
    getCurrentWeather() {
        return this.currentWeather;
    }
    
    isRaining() {
        return this.currentWeather === this.WEATHER_TYPES.RAINY;
    }
    
    isFoggy() {
        return this.currentWeather === this.WEATHER_TYPES.WINDY_FOGGY;
    }
    
    isWindy() {
        return this.currentWeather === this.WEATHER_TYPES.WINDY_FOGGY || 
               this.currentWeather === this.WEATHER_TYPES.RAINY;
    }
    
    getWindSpeed() {
        return this.windStrength;
    }
    
    getVisibility() {
        if (this.currentWeather === this.WEATHER_TYPES.WINDY_FOGGY) {
            return 0.3; // Low visibility
        } else if (this.currentWeather === this.WEATHER_TYPES.RAINY) {
            return 0.7; // Medium visibility
        } else {
            return 1.0; // Full visibility
        }
    }
}

