// Dot_it timeline editor: frame holds are keyframe-to-keyframe distances.
const MIN_MS = 20;
const MAX_MS = 3000;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
};

export class TimelineEditor {
  constructor({viewport, track, ruler, frames, playhead, getSnap, onSelect, onChange, onSeek}) {
    Object.assign(this, {viewport, track, ruler, frames, playhead, getSnap, onSelect, onChange, onSeek});
    this.data = null;
    this.scale = 1;
    this.durations = [];
    this.frameNodes = [];
    this.handleNodes = [];
    this.starts = [];
    this.total = 0;
    this.selected = 0;
    this.time = 0;

    // Drag across the time ruler to scrub. Scrubbing pauses the animation in the host.
    this.ruler.addEventListener('pointerdown', event => {
      if (!this.data) return;
      event.preventDefault();
      const seek = e => {
        const x = e.clientX - this.track.getBoundingClientRect().left;
        this.onSeek(clamp(Math.round(x / this.scale), 0, Math.max(0, this.total - 1)));
      };
      seek(event);
      this.ruler.setPointerCapture(event.pointerId);
      const move = e => seek(e);
      const end = () => {
        this.ruler.removeEventListener('pointermove', move);
        this.ruler.removeEventListener('pointerup', end);
        this.ruler.removeEventListener('pointercancel', end);
      };
      this.ruler.addEventListener('pointermove', move);
      this.ruler.addEventListener('pointerup', end);
      this.ruler.addEventListener('pointercancel', end);
    });
  }

  render(data) {
    const previousScroll = this.viewport.scrollLeft;
    this.data = data;
    this.durations = [...data.durations];
    this.selected = clamp(data.selected || 0, 0, data.count - 1);
    this.frameNodes = [];
    this.handleNodes = [];
    this.ruler.replaceChildren();
    this.frames.replaceChildren();

    this.updateScale();
    this.createRuler();
    for (let i = 0; i < data.count; i++) {
      const item = element('button', 'timeline-frame');
      item.type = 'button';
      item.setAttribute('aria-label', '프레임 ' + (data.start + i) + ' · ' + this.durations[i] + '밀리초');
      item.title = '프레임 ' + (data.start + i) + ' 선택';
      const thumb = document.createElement('canvas');
      thumb.width = 40; thumb.height = 40;
      thumb.className = 'timeline-thumb';
      const c = thumb.getContext('2d');
      c.imageSmoothingEnabled = false;
      const zoom = Math.min(40 / data.width, 40 / data.height);
      const dw = Math.max(1, Math.round(data.width * zoom));
      const dh = Math.max(1, Math.round(data.height * zoom));
      const index = data.start + i;
      c.drawImage(data.image,
        (index % data.columns) * data.width,
        Math.floor(index / data.columns) * data.height,
        data.width, data.height,
        (40 - dw) / 2, (40 - dh) / 2, dw, dh);
      const title = element('span', 'timeline-number', '#' + index);
      const duration = element('span', 'timeline-duration', this.durations[i] + 'ms');
      item.append(thumb, title, duration);
      item.addEventListener('click', () => {
        this.onSelect(i);
        this.onSeek(this.starts[i]);
      });
      this.frameNodes.push({item, duration});

      const handle = element('button', 'timeline-keyframe', '◆');
      handle.type = 'button';
      handle.title = '프레임 ' + index + ' 종료점 드래그 · 화살표 키로 이동';
      handle.setAttribute('aria-label','프레임 ' + index + ' 종료 시간 조정');
      handle.setAttribute('aria-valuemin', MIN_MS);
      handle.setAttribute('aria-valuemax', MAX_MS);
      handle.setAttribute('aria-valuenow', this.durations[i]);
      if (!data.editable) {
        handle.disabled = true;
      } else {
        handle.addEventListener('pointerdown', e => this.startDrag(e, i));
        handle.addEventListener('keydown', e => {
          if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
          e.preventDefault();
          const step = this.getSnap() || 10;
          const value = e.key === 'Home' ? MIN_MS :
            e.key === 'End' ? MAX_MS :
            this.durations[i] + (e.key === 'ArrowRight' ? step : -step);
          this.setDuration(i, value, true);
        });
      }
      this.handleNodes.push(handle);
      this.frames.append(item, handle);
    }
    this.applyPositions();
    this.setSelection(this.selected);
    this.setPlayhead(this.time);
    this.viewport.scrollLeft = previousScroll;
  }

  updateScale() {
    this.total = this.durations.reduce((a, b) => a + b, 0);
    const width = Math.max(300, this.viewport.clientWidth - 24, this.durations.length * 64);
    const minimum = Math.min(...this.durations);
    // Keep short frames graspable, at the expense of horizontal scrolling.
    this.scale = Math.max(width / Math.max(1, this.total), Math.min(1.25, 25 / Math.max(1, minimum)));
  }

  createRuler() {
    this.ruler.replaceChildren();
    const unit = Math.max(80 / this.scale, this.total / 36);
    const steps = [50,100,200,250,500,1000,2000,5000,10000,20000,50000];
    const step = steps.find(x => x >= unit) || 50000;
    for (let ms = 0; ms < this.total; ms += step) {
      const tick = element('span','timeline-tick', ms >= 1000 ? (ms/1000).toFixed(ms % 1000 ? 1 : 0) + 's' : ms + 'ms');
      tick.style.left = (ms * this.scale) + 'px';
      this.ruler.append(tick);
    }
    const last = element('span','timeline-ruler-end', (this.total / 1000).toFixed(2) + 's');
    last.style.left = (this.total * this.scale) + 'px';
    this.ruler.append(last);
  }

  applyPositions() {
    this.total = this.durations.reduce((a, b) => a + b, 0);
    this.starts = [];
    let time = 0;
    for (let i = 0; i < this.durations.length; i++) {
      const {item, duration} = this.frameNodes[i];
      const handle = this.handleNodes[i];
      this.starts.push(time);
      item.style.left = (time * this.scale) + 'px';
      item.style.width = (this.durations[i] * this.scale) + 'px';
      item.classList.toggle('timeline-frame-small', this.durations[i] * this.scale < 58);
      item.setAttribute('aria-label','프레임 ' + (this.data.start+i) + ' · ' + this.durations[i] + '밀리초');
      duration.textContent = this.durations[i] + 'ms';
      handle.style.left = ((time + this.durations[i]) * this.scale) + 'px';
      handle.setAttribute('aria-valuenow', this.durations[i]);
      time += this.durations[i];
    }
    const pixels = Math.ceil(this.total * this.scale);
    this.track.style.width = pixels + 'px';
    this.ruler.style.width = pixels + 'px';
    this.frames.style.width = pixels + 'px';
    this.setPlayhead(this.time);
  }

  setDuration(index, value, finished = false, useSnap = true) {
    if (!this.data?.editable || index < 0 || index >= this.durations.length || !Number.isFinite(value)) return;
    const step = this.getSnap();
    let number = clamp(Math.round(value), MIN_MS, MAX_MS);
    if (step && useSnap) number = clamp(Math.round(number / step) * step, MIN_MS, MAX_MS);
    if (this.durations[index] !== number) {
      this.durations[index] = number;
      this.applyPositions();
      this.onChange(index, number, false);
    }
    if (finished) {
      this.createRuler();
      this.onChange(index, number, true);
    }
  }

  startDrag(event, index) {
    if (!this.data?.editable || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.onSelect(index);
    const firstX = event.clientX;
    const initialDuration = this.durations[index];
    const move = e => {
      const next = initialDuration + (e.clientX - firstX) / this.scale;
      this.setDuration(index, next);
    };
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      document.body.classList.remove('timeline-dragging');
      this.setDuration(index, this.durations[index], true);
    };
    document.body.classList.add('timeline-dragging');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, {once:true});
    window.addEventListener('pointercancel', finish, {once:true});
  }

  setSelection(index) {
    this.selected = clamp(index, 0, this.durations.length - 1);
    this.frameNodes.forEach((node, i) => {
      node.item.classList.toggle('selected', i === this.selected);
      node.item.setAttribute('aria-pressed', i === this.selected ? 'true':'false');
    });
  }

  setPlayhead(ms) {
    this.time = clamp(ms || 0, 0, Math.max(0, this.total - 1));
    this.playhead.style.left = (this.time * this.scale) + 'px';
  }

  getStart(index) { return this.starts[index] ?? 0; }
  getTotal() { return this.total; }
}
