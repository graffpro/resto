// Notification sound — works in WebView/APK/Browser
let audioContext = null;

// Create alarm beep as WAV data URI
function createAlarmWav() {
  const sampleRate = 8000;
  const duration = 0.15;
  const freq = 1500;
  const samples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  w(0,'RIFF'); view.setUint32(4,36+samples*2,true); w(8,'WAVE'); w(12,'fmt ');
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
  view.setUint32(24,sampleRate,true); view.setUint32(28,sampleRate*2,true);
  view.setUint16(32,2,true); view.setUint16(34,16,true); w(36,'data');
  view.setUint32(40,samples*2,true);
  for (let i = 0; i < samples; i++) {
    view.setInt16(44+i*2, Math.sin(2*Math.PI*freq*i/sampleRate)*0.7*32767, true);
  }
  return URL.createObjectURL(new Blob([buffer], {type:'audio/wav'}));
}

let alarmSoundUrl = null;

export const initAudio = () => {
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
  } catch {}
  if (!alarmSoundUrl) alarmSoundUrl = createAlarmWav();
};

// Resume AudioContext on user touch — NO sound, just resume
if (typeof document !== 'undefined') {
  const silentResume = () => {
    if (audioContext && audioContext.state === 'suspended') audioContext.resume();
  };
  document.addEventListener('click', silentResume, { passive: true });
  document.addEventListener('touchstart', silentResume, { passive: true });
}

// Play one beep using HTML5 Audio (works in APK without user gesture)
function playBeep() {
  if (!alarmSoundUrl) alarmSoundUrl = createAlarmWav();
  try {
    const audio = new Audio(alarmSoundUrl);
    audio.volume = 1.0;
    audio.play().catch(() => {});
  } catch {}
}

// Try WebAudio, fallback to HTML5
function playTone(freq, dur, vol) {
  if (audioContext && audioContext.state === 'running') {
    try {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain); gain.connect(audioContext.destination);
      osc.frequency.value = freq; osc.type = 'square';
      const now = audioContext.currentTime;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
      osc.start(now); osc.stop(now + dur);
      return;
    } catch {}
  }
  playBeep();
}

export const playNotificationSound = () => {
  initAudio();
  playBeep();
  setTimeout(playBeep, 200);
};

export const playOrderSound = playNotificationSound;

export const playTimedServiceAlarm = () => {
  initAudio();
  [0, 200, 500, 700, 1000, 1200].forEach(d => setTimeout(playBeep, d));
};

// Continuous alarm — plays until stopped. Uses HTML5 Audio for reliability
export const startContinuousAlarm = (intervalMs = 3000) => {
  initAudio();
  let stopped = false;

  const playAlarm = () => {
    if (stopped) return;
    // Play 6 rapid beeps
    [0, 200, 400, 600, 800, 1000].forEach(d => {
      setTimeout(() => { if (!stopped) playBeep(); }, d);
    });
  };

  playAlarm();
  const id = setInterval(playAlarm, intervalMs);
  return { stop: () => { stopped = true; clearInterval(id); } };
};

export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

export const showNotification = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/logo192.png' });
  }
};
