/**
 * Reproductor de audio/video sincronizado con la transcripción de clase
 */

class ClassroomPlayer {
  constructor(audioElementId, scrubberId, timeDisplayId) {
    this.audio = document.getElementById(audioElementId);
    this.scrubber = document.getElementById(scrubberId);
    this.timeDisplay = document.getElementById(timeDisplayId);
    this.onTimeUpdateCallback = null;

    if (this.audio) {
      this.audio.addEventListener('timeupdate', () => this.handleTimeUpdate());
      this.audio.addEventListener('loadedmetadata', () => this.handleLoadedMetadata());
    }

    if (this.scrubber) {
      this.scrubber.addEventListener('input', (e) => {
        if (this.audio && this.audio.duration) {
          const seekTime = (e.target.value / 100) * this.audio.duration;
          this.audio.currentTime = seekTime;
        }
      });
    }
  }

  loadSource(srcUrl) {
    if (!this.audio) return;
    this.audio.src = srcUrl;
    this.audio.load();
  }

  play() {
    if (this.audio) this.audio.play();
  }

  pause() {
    if (this.audio) this.audio.pause();
  }

  seekTo(seconds) {
    if (this.audio) {
      this.audio.currentTime = seconds;
      this.play();
    }
  }

  seekToTimestamp(timeStr) {
    // "02:15" -> 135 segundos
    const parts = timeStr.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    this.seekTo(seconds);
  }

  handleTimeUpdate() {
    if (!this.audio) return;
    const current = this.audio.currentTime;
    const duration = this.audio.duration || 0;

    if (this.scrubber && duration > 0) {
      this.scrubber.value = (current / duration) * 100;
    }

    if (this.timeDisplay) {
      this.timeDisplay.textContent = `${this.formatTime(current)} / ${this.formatTime(duration)}`;
    }

    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(current);
    }
  }

  handleLoadedMetadata() {
    if (this.timeDisplay && this.audio) {
      this.timeDisplay.textContent = `00:00 / ${this.formatTime(this.audio.duration || 0)}`;
    }
  }

  formatTime(sec) {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const remS = s % 60;
    return `${String(m).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;
  }

  onTime(callback) {
    this.onTimeUpdateCallback = callback;
  }
}

window.ClassroomPlayer = ClassroomPlayer;
