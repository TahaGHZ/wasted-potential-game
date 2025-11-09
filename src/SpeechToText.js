/**
 * SpeechToText - Handles speech recognition and transcription
 * LLM-ready for NPC communication
 */
export class SpeechToText {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentTranscript = '';
        this.finalTranscript = '';
        this.onTranscriptCallback = null;
        this.onFinalCallback = null;
        
        this.initializeRecognition();
    }
    
    initializeRecognition() {
        // Check if browser supports speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true; // Keep listening while active
        this.recognition.interimResults = true; // Get interim results for real-time display
        this.recognition.lang = 'en-US'; // Language (can be made configurable)
        
        // Handle results
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let newFinalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    newFinalTranscript += transcript + ' ';
                    // Add to final transcript
                    this.finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update current transcript (final + interim)
            this.currentTranscript = this.finalTranscript + interimTranscript;
            
            // Call callback for real-time updates
            if (this.onTranscriptCallback) {
                this.onTranscriptCallback(this.currentTranscript, interimTranscript);
            }
        };
        
        // Handle errors
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            
            // Handle specific errors
            if (event.error === 'no-speech') {
                // No speech detected, but this is normal
            } else if (event.error === 'audio-capture') {
                console.error('No microphone found or microphone not accessible');
            } else if (event.error === 'not-allowed') {
                console.error('Microphone permission denied');
            }
        };
        
        // Handle end of recognition
        this.recognition.onend = () => {
            this.isListening = false;
            
            // If we have a final transcript, call the callback
            if (this.finalTranscript && this.onFinalCallback) {
                this.onFinalCallback(this.finalTranscript.trim());
            }
            
            // Reset for next session
            this.finalTranscript = '';
        };
    }
    
    /**
     * Start listening for speech
     */
    startListening() {
        if (!this.recognition) {
            console.warn('Speech recognition not available');
            return false;
        }
        
        if (this.isListening) {
            return false; // Already listening
        }
        
        try {
            this.isListening = true;
            this.currentTranscript = '';
            this.finalTranscript = '';
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            this.isListening = false;
            return false;
        }
    }
    
    /**
     * Stop listening for speech
     */
    stopListening() {
        if (!this.recognition || !this.isListening) {
            return;
        }
        
        try {
            this.recognition.stop();
            this.isListening = false;
            
            // Finalize the transcript
            this.finalTranscript = this.currentTranscript;
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
            this.isListening = false;
        }
    }
    
    /**
     * Set callback for real-time transcript updates
     */
    onTranscript(callback) {
        this.onTranscriptCallback = callback;
    }
    
    /**
     * Set callback for final transcript
     */
    onFinal(callback) {
        this.onFinalCallback = callback;
    }
    
    /**
     * Get current transcript
     */
    getCurrentTranscript() {
        return this.currentTranscript;
    }
    
    /**
     * Get final transcript
     */
    getFinalTranscript() {
        return this.finalTranscript;
    }
    
    /**
     * Check if currently listening
     */
    getIsListening() {
        return this.isListening;
    }
}

