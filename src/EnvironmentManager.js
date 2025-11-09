import * as THREE from 'three';
import { DayNightCycle } from './DayNightCycle.js';
import { WeatherSystem } from './WeatherSystem.js';
import { Bird } from './Bird.js';

/**
 * EnvironmentManager - Central manager for all environment systems
 * Provides clean API for accessing environment state (for NPC/LLM integration)
 */
export class EnvironmentManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Core systems
        this.dayNightCycle = new DayNightCycle(scene);
        this.weatherSystem = new WeatherSystem(scene, this.dayNightCycle);
        
        // Moving elements
        this.birds = [];
        this.createBirds();
        
        // Environment state (for NPC/LLM access)
        this.state = {
            timeOfDay: 'day',
            timeProgress: 0, // 0-1 (0 = midnight, 0.5 = noon, 1 = midnight)
            weather: 'sunny',
            temperature: 20, // Celsius
            windSpeed: 0,
            visibility: 1.0, // 0-1
            isRaining: false,
            isFoggy: false,
            isWindy: false
        };
    }
    
    createBirds() {
        // Create 5-8 birds flying around
        const birdCount = 5 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < birdCount; i++) {
            const x = (Math.random() - 0.5) * 100;
            const y = 10 + Math.random() * 20;
            const z = (Math.random() - 0.5) * 100;
            
            const bird = new Bird(this.scene, new THREE.Vector3(x, y, z));
            this.birds.push(bird);
        }
    }
    
    update(delta) {
        // Update day/night cycle
        this.dayNightCycle.update(delta);
        
        // Update weather system
        this.weatherSystem.update(delta);
        
        // Update sky elements based on current weather
        this.dayNightCycle.setWeather(this.weatherSystem.getCurrentWeather());
        
        // Update birds
        this.birds.forEach(bird => bird.update(delta));
        
        // Update environment state
        this.updateState();
    }
    
    updateState() {
        // Sync state with systems
        this.state.timeOfDay = this.dayNightCycle.getTimeOfDay();
        this.state.timeProgress = this.dayNightCycle.getTimeProgress();
        this.state.weather = this.weatherSystem.getCurrentWeather();
        this.state.isRaining = this.weatherSystem.isRaining();
        this.state.isFoggy = this.weatherSystem.isFoggy();
        this.state.isWindy = this.weatherSystem.isWindy();
        this.state.windSpeed = this.weatherSystem.getWindSpeed();
        this.state.visibility = this.weatherSystem.getVisibility();
        
        // Calculate temperature based on time and weather
        this.state.temperature = this.calculateTemperature();
    }
    
    calculateTemperature() {
        // Base temperature varies with time of day
        const timeProgress = this.state.timeProgress;
        let baseTemp = 15 + 10 * Math.sin(timeProgress * Math.PI * 2 - Math.PI / 2);
        
        // Weather adjustments
        if (this.state.weather === 'rainy') {
            baseTemp -= 5;
        } else if (this.state.weather === 'windy+foggy') {
            baseTemp -= 3;
        }
        
        return Math.round(baseTemp * 10) / 10;
    }
    
    /**
     * Get current environment state
     * Used by NPCs/LLM agents to understand surroundings
     */
    getState() {
        return {
            ...this.state,
            // Additional context
            birdCount: this.birds.length,
            isDay: this.state.timeOfDay === 'day',
            isNight: this.state.timeOfDay === 'night',
            isDawn: this.state.timeOfDay === 'dawn',
            isDusk: this.state.timeOfDay === 'dusk',
            // Weather transition info
            nextWeather: this.weatherSystem.getNextWeather(),
            timeRemaining: this.weatherSystem.getTimeRemaining(),
            weatherProgress: this.weatherSystem.getProgress()
        };
    }
    
    /**
     * Set weather (for testing or manual control)
     */
    setWeather(weatherType) {
        this.weatherSystem.setWeather(weatherType);
    }
    
    /**
     * Set time of day (for testing or manual control)
     */
    setTime(timeProgress) {
        this.dayNightCycle.setTime(timeProgress);
    }
    
    /**
     * Get current time
     * Returns object with hour, minute, formatted string, and time of day
     * Used by LLM agents for time context
     */
    getTime() {
        return this.dayNightCycle.getTime();
    }
}

