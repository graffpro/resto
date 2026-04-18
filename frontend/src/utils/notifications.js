// Notification sound utility — works in WebView, APK, all browsers
let audioContext = null;
let htmlAudio = null;

// Create a beep sound as data URI for HTML5 Audio fallback
function createBeepDataUri() {
  const sampleRate = 8000;
  const duration = 0.2;
  const freq = 1400;
  const samples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);
  
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const value = Math.sin(2 * Math.PI * freq * t) * 0.5 * 32767;
    view.setInt16(44 + i * 2, value, true);
  }
  
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export const initAudio = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  } catch (e) {
    console.log('[Audio] WebAudio not available, using HTML5');
  }
  
  // Create HTML5 Audio fallback
  if (!htmlAudio) {
    try {
      htmlAudio = new Audio(createBeepDataUri());
      htmlAudio.volume = 1.0;
    } catch {}
  }
};

// Force resume on ANY interaction
if (typeof document !== 'undefined') {
  const resume = () => {
    if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    if (htmlAudio) htmlAudio.play().catch(() => {});
  };
  document.addEventListener('click', resume, { passive: true });
  document.addEventListener('touchstart', resume, { passive: true });
  document.addEventListener('touchend', resume, { passive: true });
}

function playWebAudioBeep(freq, duration, vol) {
  if (!audioContext || audioContext.state === 'suspended') return false;
  try {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = freq;
    osc.type = 'square';
    const now = audioContext.currentTime;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.start(now);
    osc.stop(now + duration);
    return true;
  } catch { return false; }
}

function playHtmlAudioBeep() {
  if (!htmlAudio) {
    htmlAudio = new Audio(createBeepDataUri());
    htmlAudio.volume = 1.0;
  }
  try {
    htmlAudio.currentTime = 0;
    htmlAudio.play().catch(() => {});
  } catch {}
}

export const playNotificationSound = () => {
  initAudio();
  if (!playWebAudioBeep(800, 0.3, 0.4)) {
    playHtmlAudioBeep();
  }
  setTimeout(() => {
    if (!playWebAudioBeep(600, 0.3, 0.4)) {
      playHtmlAudioBeep();
    }
  }, 150);
};

export const playOrderSound = playNotificationSound;

export const playTimedServiceAlarm = () => {
  initAudio();
  const times = [0, 180, 500, 680, 1000, 1180];
  times.forEach(delay => {
    setTimeout(() => {
      if (!playWebAudioBeep(1200, 0.15, 0.5)) playHtmlAudioBeep();
    }, delay);
  });
};

// Continuous alarm — plays until stopped
export const startContinuousAlarm = (intervalMs = 3000) => {
  initAudio();
  let stopped = false;

  const playAlarm = () => {
    if (stopped) return;
    if (audioContext) {
      try { audioContext.resume(); } catch {}
    }
    // Play urgent pattern: beep-beep-beep-beep-beep-beep
    const delays = [0, 200, 400, 600, 800, 1000];
    const freqs = [1400, 1800, 1400, 1800, 1400, 1800];
    delays.forEach((d, i) => {
      setTimeout(() => {
        if (stopped) return;
        if (!playWebAudioBeep(freqs[i], 0.15, 0.5)) {
          playHtmlAudioBeep();
        }
      }, d);
    });
  };

  playAlarm();
  const id = setInterval(playAlarm, intervalMs);

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
    new Notification(title, { body, icon: '/logo192.png', badge: '/logo192.png' });
  }
};
