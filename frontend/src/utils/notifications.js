// Notification sound utility
let audioContext = null;

export const initAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
};

export const playNotificationSound = () => {
  if (!audioContext) initAudio();
  
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    setTimeout(() => {
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      oscillator2.frequency.value = 600;
      oscillator2.type = 'sine';
      
      gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator2.start(audioContext.currentTime);
      oscillator2.stop(audioContext.currentTime + 0.5);
    }, 100);
  } catch (error) {
    console.error('Audio playback failed:', error);
  }
};

// Alias for WebSocket context usage
export const playOrderSound = playNotificationSound;

// Ding-ding alarm for timed services (repeating pattern)
export const playTimedServiceAlarm = () => {
  if (!audioContext) initAudio();
  
  try {
    const playDing = (startTime, freq) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    };

    const now = audioContext.currentTime;
    // ding ding, ding ding, ding ding pattern
    playDing(now, 1200);
    playDing(now + 0.18, 1200);
    playDing(now + 0.5, 1200);
    playDing(now + 0.68, 1200);
    playDing(now + 1.0, 1200);
    playDing(now + 1.18, 1200);
  } catch (error) {
    console.error('Alarm playback failed:', error);
  }
};

// Continuous alarm that plays every N seconds until stopped
// Returns an object with a stop() method
export const startContinuousAlarm = (intervalMs = 3000) => {
  if (!audioContext) initAudio();
  let stopped = false;
  
  const playLoudAlarm = () => {
    if (stopped || !audioContext) return;
    try {
      const now = audioContext.currentTime;
      const playTone = (time, freq, dur) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(freq, time);
        osc.type = 'square';
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
        osc.start(time);
        osc.stop(time + dur);
      };
      playTone(now, 1400, 0.15);
      playTone(now + 0.2, 1600, 0.15);
      playTone(now + 0.4, 1400, 0.15);
      playTone(now + 0.6, 1600, 0.15);
    } catch (e) {
      console.error('Alarm error:', e);
    }
  };

  // Play immediately
  playLoudAlarm();
  const id = setInterval(playLoudAlarm, intervalMs);

  return {
    stop: () => {
      stopped = true;
      clearInterval(id);
    }
  };
};

export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

export const showNotification = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/logo192.png',
      badge: '/logo192.png'
    });
  }
};
