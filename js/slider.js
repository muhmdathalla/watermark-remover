/**
 * AURA // Interactive Comparison Slider Controller
 * Provides:
 * 1. Split Drag Slider with 60fps clip-path updating
 * 2. Touch & Mouse support
 * 3. Side-by-side synchronized comparison
 * 4. Hold-to-compare peek functionality
 */

class SliderController {
  constructor() {
    this.container = document.getElementById('sliderContainer');
    this.divider = document.getElementById('sliderDivider');
    this.processedClip = document.getElementById('sliderProcessedClip');

    this.origCanvas = document.getElementById('sliderOriginalCanvas');
    this.procCanvas = document.getElementById('sliderProcessedCanvas');

    this.origCtx = this.origCanvas.getContext('2d');
    this.procCtx = this.procCanvas.getContext('2d');

    // Side by side elements
    this.sideLeftCanvas = document.getElementById('sideLeftCanvas');
    this.sideRightCanvas = document.getElementById('sideRightCanvas');
    this.sideLeftCtx = this.sideLeftCanvas.getContext('2d');
    this.sideRightCtx = this.sideRightCanvas.getContext('2d');

    this.sliderPosition = 50.0; // percentage (0 - 100)
    this.isDragging = false;

    this._bindSliderEvents();
  }

  /**
   * Updates comparison images
   */
  setComparisonData(originalImageData, processedImageData) {
    this.width = originalImageData.width;
    this.height = originalImageData.height;

    // Setup Slider Canvases
    this.origCanvas.width = this.width;
    this.origCanvas.height = this.height;
    this.procCanvas.width = this.width;
    this.procCanvas.height = this.height;

    this.origCtx.putImageData(originalImageData, 0, 0);
    this.procCtx.putImageData(processedImageData, 0, 0);

    // Setup Side-by-Side Canvases
    this.sideLeftCanvas.width = this.width;
    this.sideLeftCanvas.height = this.height;
    this.sideRightCanvas.width = this.width;
    this.sideRightCanvas.height = this.height;

    this.sideLeftCtx.putImageData(originalImageData, 0, 0);
    this.sideRightCtx.putImageData(processedImageData, 0, 0);

    this.updateLayout();
    this.setSliderPosition(50.0);
  }

  updateLayout() {
    if (!this.width || !this.height) return;
    const viewport = document.getElementById('sliderViewport');
    const vw = viewport.clientWidth - 48;
    const vh = viewport.clientHeight - 48;

    const scale = Math.min(vw / this.width, vh / this.height, 1.0);
    const displayW = Math.round(this.width * scale);
    const displayH = Math.round(this.height * scale);

    this.container.style.width = displayW + 'px';
    this.container.style.height = displayH + 'px';
  }

  setSliderPosition(pct) {
    this.sliderPosition = Math.max(0, Math.min(100, pct));
    this.divider.style.left = `${this.sliderPosition}%`;
    // Clip the processed layer from the left to sliderPosition%
    this.processedClip.style.clipPath = `polygon(${this.sliderPosition}% 0%, 100% 0%, 100% 100%, ${this.sliderPosition}% 100%)`;
  }

  _bindSliderEvents() {
    const handleMove = (clientX) => {
      if (!this.isDragging) return;
      const rect = this.container.getBoundingClientRect();
      const pos = ((clientX - rect.left) / rect.width) * 100;
      this.setSliderPosition(pos);
    };

    this.divider.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.divider.classList.add('active');
      e.preventDefault();
    });

    this.container.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.divider.classList.add('active');
      handleMove(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        handleMove(e.clientX);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.divider.classList.remove('active');
      }
    });

    // Touch Support
    this.divider.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      this.divider.classList.add('active');
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.divider.classList.remove('active');
      }
    });

    window.addEventListener('resize', () => {
      this.updateLayout();
    });
  }

  /**
   * Peek mode: temporary show 100% original
   */
  peekOriginal(active) {
    if (active) {
      this.divider.style.display = 'none';
      this.processedClip.style.opacity = '0';
    } else {
      this.divider.style.display = 'block';
      this.processedClip.style.opacity = '1';
      this.setSliderPosition(this.sliderPosition);
    }
  }
}

window.SliderController = SliderController;
