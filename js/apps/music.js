/* ===== MUSIC ===== */

let musicAudio = null;
let musicState = {
  playing: false,
  currentTrack: 0,
  currentTime: 0,
  duration: 0
};

function openMusic() {
  const settings = CloudStorage.get('music', { currentTrack: 0, volume: 0.7 });
  musicState.currentTrack = settings.currentTrack || 0;

  const track = playlist[musicState.currentTrack];

  mkWin('music', 'Music', 360, 550,
    '<div class="mplayer">' +
      '<audio id="music-audio" preload="none"></audio>' +
      '<div class="mart ' + (musicState.playing ? 'playing' : '') + '" id="mart">🎵</div>' +
      '<div class="minfo">' +
        '<div class="mt" id="mtitle">' + track.t + '</div>' +
        '<div class="ma" id="martist">' + track.a + '</div>' +
      '</div>' +
      '<div style="padding:0 28px">' +
        '<div class="mbar" onclick="seekMusic(event)">' +
          '<div class="mfill" id="mfill" style="width:0%"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;opacity:.5">' +
          '<span id="mcurrent">0:00</span>' +
          '<span id="mduration">' + track.d + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="mctrl">' +
        '<button class="mbtn" onclick="prevTrk()">⏮</button>' +
        '<button class="mbtn play" id="playbtn" onclick="togPlay()">▶</button>' +
        '<button class="mbtn" onclick="nextTrk()">⏭</button>' +
      '</div>' +
      '<div class="mvol">' +
        '<span style="opacity:0.6">🔊</span>' +
        '<input type="range" class="mvol-slider" min="0" max="100" value="' + (settings.volume * 100) + '" oninput="setVolume(this.value)">' +
      '</div>' +
      '<div style="flex:1;overflow-y:auto;padding:0 14px 14px">' +
        playlist.map(function(t, i) {
          return '<div class="pli ' + (i === musicState.currentTrack ? 'active' : '') + '" onclick="selTrk(' + i + ')">' +
            '<span style="font-size:11px;opacity:.4;width:18px">' + (i + 1) + '</span>' +
            '<span style="font-size:12px;flex:1">' + t.t + '<br><span style="opacity:.5;font-size:10px">' + t.a + '</span></span>' +
            '<span style="font-size:11px;opacity:.4">' + t.d + '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>',
    { bs: 'padding:0;overflow:hidden' }
  );

  initMusicPlayer();
}

function initMusicPlayer() {
  musicAudio = document.getElementById('music-audio');
  if (!musicAudio) return;

  const settings = CloudStorage.get('music', { volume: 0.7 });
  musicAudio.volume = settings.volume;

  // Load current track (demo: no actual URLs, so we'll simulate)
  // In a real app, playlist would have url property
  // musicAudio.src = playlist[musicState.currentTrack].url;

  // Time update handler
  musicAudio.addEventListener('timeupdate', function() {
    if (musicAudio.duration) {
      const percent = (musicAudio.currentTime / musicAudio.duration) * 100;
      const fill = document.getElementById('mfill');
      if (fill) fill.style.width = percent + '%';

      const current = document.getElementById('mcurrent');
      if (current) current.textContent = formatMusicTime(musicAudio.currentTime);
    }
  });

  // Track ended handler
  musicAudio.addEventListener('ended', function() {
    nextTrk(true); // Auto-advance
  });

  // Duration loaded handler
  musicAudio.addEventListener('loadedmetadata', function() {
    const duration = document.getElementById('mduration');
    if (duration) duration.textContent = formatMusicTime(musicAudio.duration);
  });

  // Error handler
  musicAudio.addEventListener('error', function() {
    console.warn('Music: Audio playback not available (no audio URLs configured)');
    // Continue with visual simulation
  });
}

function togPlay() {
  if (!musicAudio) return;

  musicState.playing = !musicState.playing;

  const btn = document.getElementById('playbtn');
  const art = document.getElementById('mart');

  if (musicState.playing) {
    // Demo: Since we don't have actual audio URLs, simulate playback
    if (!musicAudio.src) {
      simulatePlayback();
    } else {
      musicAudio.play().catch(function(e) {
        console.warn('Audio play failed:', e);
        simulatePlayback();
      });
    }
    if (btn) btn.textContent = '⏸';
    if (art) art.classList.add('playing');
  } else {
    if (musicAudio.src) musicAudio.pause();
    stopSimulation();
    if (btn) btn.textContent = '▶';
    if (art) art.classList.remove('playing');
  }
}

// Simulation for demo (when no audio URLs available)
let simulationInterval = null;
function simulatePlayback() {
  const track = playlist[musicState.currentTrack];
  const duration = parseDuration(track.d);

  musicState.currentTime = 0;
  musicState.duration = duration;

  simulationInterval = setInterval(function() {
    musicState.currentTime += 0.1;

    if (musicState.currentTime >= musicState.duration) {
      stopSimulation();
      nextTrk(true);
      return;
    }

    const percent = (musicState.currentTime / musicState.duration) * 100;
    const fill = document.getElementById('mfill');
    if (fill) fill.style.width = percent + '%';

    const current = document.getElementById('mcurrent');
    if (current) current.textContent = formatMusicTime(musicState.currentTime);
  }, 100);
}

function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

function selTrk(i, autoplay) {
  if (i === musicState.currentTrack && !autoplay) {
    togPlay(); // Toggle if clicking current track
    return;
  }

  musicState.currentTrack = i;
  const track = playlist[i];

  // Update UI
  document.getElementById('mtitle').textContent = track.t;
  document.getElementById('martist').textContent = track.a;
  document.getElementById('mduration').textContent = track.d;
  document.getElementById('mcurrent').textContent = '0:00';
  document.getElementById('mfill').style.width = '0%';

  document.querySelectorAll('.pli').forEach(function(e, j) {
    e.classList.toggle('active', j === i);
  });

  // Save to CloudStorage
  const settings = CloudStorage.get('music', {});
  settings.currentTrack = i;
  CloudStorage.set('music', settings);

  // Load new track
  if (musicAudio && musicAudio.src) {
    musicAudio.currentTime = 0;
    // musicAudio.src = track.url; // Would load new URL
  }

  // Autoplay if requested
  if (autoplay && musicState.playing) {
    if (simulationInterval) {
      stopSimulation();
      simulatePlayback();
    }
  } else if (!autoplay) {
    // Start playing if user clicked
    if (!musicState.playing) togPlay();
  }
}

function nextTrk(autoplay) {
  const next = (musicState.currentTrack + 1) % playlist.length;
  selTrk(next, autoplay);
}

function prevTrk() {
  const prev = (musicState.currentTrack - 1 + playlist.length) % playlist.length;
  selTrk(prev, false);
}

function seekMusic(event) {
  const bar = event.currentTarget;
  const rect = bar.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;

  if (musicAudio && musicAudio.duration) {
    musicAudio.currentTime = musicAudio.duration * percent;
  } else if (musicState.duration) {
    musicState.currentTime = musicState.duration * percent;
    const fill = document.getElementById('mfill');
    if (fill) fill.style.width = (percent * 100) + '%';
    const current = document.getElementById('mcurrent');
    if (current) current.textContent = formatMusicTime(musicState.currentTime);
  }
}

function setVolume(value) {
  const vol = value / 100;
  if (musicAudio) musicAudio.volume = vol;

  const settings = CloudStorage.get('music', {});
  settings.volume = vol;
  CloudStorage.autoSave('music', settings);
}

function formatMusicTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function parseDuration(str) {
  const parts = str.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}
