import * as THREE from 'three';

/**
 * DayNightCycle - Manages day/night cycle with dynamic lighting
 */
export class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        
        // Time settings (24 hour cycle in seconds)
        this.dayDuration = 300; // 5 minutes for full day cycle
        this.currentTime = 0.25; // Start at 6 AM (0.25 of 24h cycle)
        this.timeSpeed = 1.0; // Speed multiplier
        
        // Lighting references
        this.ambientLight = null;
        this.directionalLight = null;
        this.hemisphereLight = null;
        
        // Sky color
        this.skyColor = new THREE.Color();
        
        // Sky elements (sun, moon, stars, clouds)
        this.sun = null;
        this.moon = null;
        this.stars = [];
        this.clouds = [];
        this.cloudGroup = null;
        
        this.setupLighting();
        this.setupSkyElements();
    }
    
    setupLighting() {
        // Ambient light (will change intensity based on time)
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);
        
        // Directional light (sun/moon)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(50, 100, 50);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        this.scene.add(this.directionalLight);
        
        // Hemisphere light for more natural lighting
        this.hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362d1f, 0.3);
        this.scene.add(this.hemisphereLight);
    }
    
    update(delta) {
        // Advance time
        this.currentTime += (delta * this.timeSpeed) / this.dayDuration;
        
        // Wrap around 24 hour cycle
        if (this.currentTime >= 1.0) {
            this.currentTime -= 1.0;
        }
        
        // Update lighting based on time
        this.updateLighting();
        this.updateSkyColor();
        // Sky elements will be updated by WeatherSystem with current weather
    }
    
    updateLighting() {
        const timeProgress = this.currentTime;
        
        // Calculate sun/moon position (0 = midnight, 0.5 = noon)
        const sunAngle = (timeProgress - 0.25) * Math.PI * 2; // Offset to start at dawn
        
        // Sun/moon height (0 = horizon, 1 = zenith)
        const sunHeight = Math.sin(sunAngle);
        
        // Sun/moon position
        const sunDistance = 100;
        const sunX = Math.cos(sunAngle) * sunDistance;
        const sunY = Math.max(0, sunHeight) * sunDistance;
        const sunZ = Math.sin(sunAngle) * sunDistance;
        
        this.directionalLight.position.set(sunX, sunY, sunZ);
        
        // Determine if it's day or night
        const isDay = sunHeight > 0;
        
        // Adjust light intensity and color
        if (isDay) {
            // Daytime
            const intensity = Math.max(0.3, sunHeight * 0.8);
            this.directionalLight.intensity = intensity;
            this.directionalLight.color.setHex(0xffffff);
            
            this.ambientLight.intensity = 0.4 + sunHeight * 0.3;
            this.ambientLight.color.setHex(0xffffff);
            
            this.hemisphereLight.intensity = 0.2 + sunHeight * 0.2;
        } else {
            // Nighttime
            const moonIntensity = Math.max(0.1, -sunHeight * 0.3);
            this.directionalLight.intensity = moonIntensity;
            this.directionalLight.color.setHex(0x9bb3ff); // Blue moonlight
            
            this.ambientLight.intensity = 0.1;
            this.ambientLight.color.setHex(0x4a5a7f);
            
            this.hemisphereLight.intensity = 0.1;
        }
        
        // Dawn/Dusk transition
        const dawnDuskFactor = this.getDawnDuskFactor();
        if (dawnDuskFactor > 0) {
            // Blend between day and night colors
            this.directionalLight.color.lerpColors(
                new THREE.Color(0xff6b35), // Orange/red for dawn/dusk
                isDay ? new THREE.Color(0xffffff) : new THREE.Color(0x9bb3ff),
                1 - dawnDuskFactor
            );
        }
    }
    
    updateSkyColor() {
        const timeProgress = this.currentTime;
        const sunAngle = (timeProgress - 0.25) * Math.PI * 2;
        const sunHeight = Math.sin(sunAngle);
        
        if (sunHeight > 0) {
            // Daytime - blue sky
            const intensity = Math.max(0.3, sunHeight);
            this.skyColor.setRGB(0.53 * intensity, 0.81 * intensity, 0.92 * intensity);
        } else {
            // Nighttime - dark blue/purple
            const intensity = Math.max(0.1, -sunHeight * 0.3);
            this.skyColor.setRGB(0.1 * intensity, 0.1 * intensity, 0.2 * intensity);
        }
        
        // Dawn/Dusk colors
        const dawnDuskFactor = this.getDawnDuskFactor();
        if (dawnDuskFactor > 0) {
            const dawnColor = new THREE.Color(1.0, 0.6, 0.4);
            this.skyColor.lerp(dawnColor, dawnDuskFactor * 0.5);
        }
        
        this.scene.background.copy(this.skyColor);
    }
    
    getDawnDuskFactor() {
        // Returns 0-1 factor for dawn/dusk transition
        const timeProgress = this.currentTime;
        const dawnStart = 0.2; // 4:48 AM
        const dawnEnd = 0.3;   // 7:12 AM
        const duskStart = 0.7; // 4:48 PM
        const duskEnd = 0.8;   // 7:12 PM
        
        if (timeProgress >= dawnStart && timeProgress <= dawnEnd) {
            return 1 - (timeProgress - dawnStart) / (dawnEnd - dawnStart);
        } else if (timeProgress >= duskStart && timeProgress <= duskEnd) {
            return (timeProgress - duskStart) / (duskEnd - duskStart);
        }
        
        return 0;
    }
    
    getTimeOfDay() {
        const timeProgress = this.currentTime;
        
        if (timeProgress >= 0.2 && timeProgress < 0.3) {
            return 'dawn';
        } else if (timeProgress >= 0.3 && timeProgress < 0.7) {
            return 'day';
        } else if (timeProgress >= 0.7 && timeProgress < 0.8) {
            return 'dusk';
        } else {
            return 'night';
        }
    }
    
    getTimeProgress() {
        return this.currentTime;
    }
    
    setTime(timeProgress) {
        this.currentTime = Math.max(0, Math.min(1, timeProgress));
    }
    
    setTimeSpeed(speed) {
        this.timeSpeed = speed;
    }
    
    setupSkyElements() {
        // Create sun
        const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffeb3b,
            emissive: 0xffeb3b,
            emissiveIntensity: 1.0
        });
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sun.visible = false;
        this.scene.add(this.sun);
        
        // Create moon
        const moonGeometry = new THREE.SphereGeometry(2.5, 32, 32);
        const moonMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.8
        });
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.visible = false;
        this.scene.add(this.moon);
        
        // Create stars
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 200;
        const starPositions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            // Random position on a sphere
            const radius = 150;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            
            starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
            starPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            starPositions[i + 2] = radius * Math.cos(phi);
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            emissive: 0xffffff,
            emissiveIntensity: 1.0
        });
        
        const stars = new THREE.Points(starGeometry, starMaterial);
        stars.visible = false;
        this.stars = stars;
        this.scene.add(stars);
        
        // Create cloud group
        this.cloudGroup = new THREE.Group();
        this.createClouds();
        this.cloudGroup.visible = false;
        this.scene.add(this.cloudGroup);
    }
    
    createClouds() {
        // Create multiple clouds
        const cloudCount = 8;
        
        for (let i = 0; i < cloudCount; i++) {
            const cloud = this.createCloud();
            cloud.position.set(
                (Math.random() - 0.5) * 150,
                30 + Math.random() * 20,
                (Math.random() - 0.5) * 150
            );
            this.cloudGroup.add(cloud);
        }
    }
    
    createCloud() {
        const cloudGroup = new THREE.Group();
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.8
        });
        
        // Create cloud from multiple spheres
        const sphereCount = 5;
        for (let i = 0; i < sphereCount; i++) {
            const size = 3 + Math.random() * 4;
            const sphereGeometry = new THREE.SphereGeometry(size, 16, 16);
            const sphere = new THREE.Mesh(sphereGeometry, cloudMaterial);
            sphere.position.set(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 8
            );
            cloudGroup.add(sphere);
        }
        
        return cloudGroup;
    }
    
    updateSkyElements(weather = 'sunny') {
        const timeProgress = this.currentTime;
        const sunAngle = (timeProgress - 0.25) * Math.PI * 2;
        const sunHeight = Math.sin(sunAngle);
        const isDay = sunHeight > 0;
        
        // Calculate sun/moon position
        const sunDistance = 100;
        const sunX = Math.cos(sunAngle) * sunDistance;
        const sunY = Math.max(0, sunHeight) * sunDistance;
        const sunZ = Math.sin(sunAngle) * sunDistance;
        
        // Update sun position and visibility (only during day and clear weather)
        if (isDay && sunHeight > 0.1 && weather === 'sunny') {
            this.sun.position.set(sunX, sunY, sunZ);
            this.sun.visible = true;
        } else {
            this.sun.visible = false;
        }
        
        // Update moon position and visibility (opposite side, only at night)
        if (!isDay || sunHeight < 0.1) {
            const moonAngle = sunAngle + Math.PI;
            const moonX = Math.cos(moonAngle) * sunDistance;
            const moonY = Math.max(0, -Math.sin(moonAngle)) * sunDistance;
            const moonZ = Math.sin(moonAngle) * sunDistance;
            this.moon.position.set(moonX, moonY, moonZ);
            this.moon.visible = true;
        } else {
            this.moon.visible = false;
        }
        
        // Update stars visibility (only at night)
        if (this.stars) {
            this.stars.visible = !isDay || sunHeight < 0.1;
        }
        
        // Clouds visibility depends on weather (controlled by WeatherSystem)
    }
    
    setWeather(weather) {
        // Update sky elements based on weather
        this.updateSkyElements(weather);
    }
    
    /**
     * Get current time in hours and minutes format
     * Returns object with hour, minute, and formatted string
     */
    getTime() {
        const timeProgress = this.currentTime;
        const totalMinutes = timeProgress * 24 * 60;
        const hour = Math.floor(totalMinutes / 60) % 24;
        const minute = Math.floor(totalMinutes % 60);
        
        const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        const ampm = hour < 12 ? 'AM' : 'PM';
        const formattedTime = `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
        
        return {
            hour: hour,
            minute: minute,
            hour12: hour12,
            ampm: ampm,
            formatted: formattedTime,
            progress: timeProgress,
            timeOfDay: this.getTimeOfDay()
        };
    }
    
    setCloudsVisible(visible) {
        if (this.cloudGroup) {
            this.cloudGroup.visible = visible;
        }
    }
}

