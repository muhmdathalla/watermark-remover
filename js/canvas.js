/**
 * AURA // Studio Canvas Controller
 * High-performance 2D Canvas stack with infinite zoom/pan,
 * Smart Brush, Mask Eraser, Polygon Lasso, Rect marquee,
 * and Live cursor HUD.
 */

class CanvasManager {
  constructor(options = {}) {
    this.panContainer = document.getElementById('canvasPanContainer');
    this.layersWrap = document.getElementById('canvasLayers');
    this.imgCanvas = document.getElementById('imageCanvas');
    this.maskCanvas = document.getElementById('maskCanvas');
    this.cursorCanvas = document.getElementById('cursorCanvas');

    this.imgCtx = this.imgCanvas.getContext('2d');
    this.maskCtx = this.maskCanvas.getContext('2d');
    this.cursorCtx = this.cursorCanvas.getContext('2d');

    // Tool state
    this.activeTool = 'brush'; // 'brush' | 'eraser' | 'lasso' | 'rect' | 'wand' | 'pan'
    this.brushSize = 36;
    this.feather = 3;
    this.tolerance = 28;

    // Viewport transform (zoom & pan)
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.spaceBarDown = false;

    // Drawing state
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;

    // Lasso points
    this.lassoPoints = [];

    // Rect drag
    this.rectStartX = 0;
    this.rectStartY = 0;

    // History stack for Undo / Redo
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 20;

    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onZoomChange = options.onZoomChange || (() => {});

    this._bindEvents();
  }

  /**
   * Loads an image into the editor
   */
  loadImage(source) {
    let img;
    if (source instanceof HTMLCanvasElement) {
      this._setupDimensions(source.width, source.height);
      this.imgCtx.drawImage(source, 0, 0);
      this.resetViewport();
      this.saveHistoryState('Load Image');
      return;
    }

    if (source instanceof Image) {
      img = source;
      this._setupDimensions(img.width, img.height);
      this.imgCtx.drawImage(img, 0, 0);
      this.resetViewport();
      this.saveHistoryState('Load Image');
      return;
    }

    img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this._setupDimensions(img.naturalWidth, img.naturalHeight);
      this.imgCtx.drawImage(img, 0, 0);
      this.resetViewport();
      this.saveHistoryState('Load Image');
    };
    img.src = source;
  }

  _setupDimensions(width, height) {
    this.width = width;
    this.height = height;

    this.imgCanvas.width = width;
    this.imgCanvas.height = height;

    this.maskCanvas.width = width;
    this.maskCanvas.height = height;

    this.cursorCanvas.width = width;
    this.cursorCanvas.height = height;

    this.layersWrap.style.width = width + 'px';
    this.layersWrap.style.height = height + 'px';

    this.clearMask(false);
  }

  /**
   * Resets viewport transform to fit available workspace
   */
  resetViewport() {
    if (!this.width || !this.height) return;
    const containerRect = this.panContainer.getBoundingClientRect();
    const margin = 40;
    const availW = Math.max(100, containerRect.width - margin * 2);
    const availH = Math.max(100, containerRect.height - margin * 2);

    const fitScale = Math.min(availW / this.width, availH / this.height, 1.0);
    this.scale = Math.max(0.1, Math.min(fitScale, 4.0));
    this.panX = 0;
    this.panY = 0;

    this._applyTransform();
    this.onZoomChange(this.scale);
  }

  setZoom(newScale) {
    this.scale = Math.max(0.1, Math.min(newScale, 8.0));
    this._applyTransform();
    this.onZoomChange(this.scale);
  }

  _applyTransform() {
    this.layersWrap.style.transform = `translate(calc(-50% + ${this.panX}px), calc(-50% + ${this.panY}px)) scale(${this.scale})`;
  }

  /**
   * Convert client viewport coordinates to image pixel coordinates
   */
  viewportToImageCoords(clientX, clientY) {
    const rect = this.imgCanvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) * (this.width / rect.width));
    const y = Math.floor((clientY - rect.top) * (this.height / rect.height));
    return {
      x: Math.max(0, Math.min(this.width - 1, x)),
      y: Math.max(0, Math.min(this.height - 1, y))
    };
  }

  _bindEvents() {
    // Mouse wheel zoom
    this.panContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      this.setZoom(this.scale * zoomFactor);
    }, { passive: false });

    // Pointer down
    this.panContainer.addEventListener('mousedown', (e) => {
      // Pan check: space pressed or middle button or pan tool
      if (this.spaceBarDown || e.button === 1 || this.activeTool === 'pan') {
        this.isPanning = true;
        this.panStartX = e.clientX - this.panX;
        this.panStartY = e.clientY - this.panY;
        this.panContainer.classList.add('is-panning');
        return;
      }

      if (e.button !== 0) return; // Only left button for tools
      const coords = this.viewportToImageCoords(e.clientX, e.clientY);
      this.isDrawing = true;
      this.lastX = coords.x;
      this.lastY = coords.y;

      if (this.activeTool === 'brush') {
        this._drawBrushDot(coords.x, coords.y);
      } else if (this.activeTool === 'eraser') {
        this._drawEraserDot(coords.x, coords.y);
      } else if (this.activeTool === 'lasso') {
        this.lassoPoints = [{ x: coords.x, y: coords.y }];
      } else if (this.activeTool === 'rect' || this.activeTool === 'wand') {
        this.rectStartX = coords.x;
        this.rectStartY = coords.y;
      }
    });

    // Pointer move
    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.panX = e.clientX - this.panStartX;
        this.panY = e.clientY - this.panStartY;
        this._applyTransform();
        return;
      }

      const coords = this.viewportToImageCoords(e.clientX, e.clientY);

      // Update brush cursor overlay
      this._drawCursorOverlay(coords.x, coords.y);

      if (!this.isDrawing) return;

      if (this.activeTool === 'brush') {
        this._drawBrushLine(this.lastX, this.lastY, coords.x, coords.y);
        this.lastX = coords.x;
        this.lastY = coords.y;
      } else if (this.activeTool === 'eraser') {
        this._drawEraserLine(this.lastX, this.lastY, coords.x, coords.y);
        this.lastX = coords.x;
        this.lastY = coords.y;
      } else if (this.activeTool === 'lasso') {
        this.lassoPoints.push({ x: coords.x, y: coords.y });
        this._renderLassoPreview();
      } else if (this.activeTool === 'rect' || this.activeTool === 'wand') {
        this._renderRectPreview(this.rectStartX, this.rectStartY, coords.x, coords.y);
      }
    });

    // Pointer up
    window.addEventListener('mouseup', (e) => {
      if (this.isPanning) {
        this.isPanning = false;
        this.panContainer.classList.remove('is-panning');
      }

      if (this.isDrawing) {
        this.isDrawing = false;
        const coords = this.viewportToImageCoords(e.clientX, e.clientY);

        if (this.activeTool === 'lasso' && this.lassoPoints.length > 2) {
          this._fillLassoMask();
        } else if (this.activeTool === 'rect') {
          this._fillRectMask(this.rectStartX, this.rectStartY, coords.x, coords.y);
        } else if (this.activeTool === 'wand') {
          this._executeWandKeyer(this.rectStartX, this.rectStartY, coords.x, coords.y);
        }

        this._clearCursorPreview();
        this.saveHistoryState('Mask Edit');
        this.onStateChange();
      }
    });

    // Keyboard shortcuts for pan and tool switches
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' && !this.spaceBarDown) {
        this.spaceBarDown = true;
        this.panContainer.classList.add('is-panning');
      } else if (e.key === '[' || e.key === '{') {
        this.brushSize = Math.max(4, this.brushSize - 4);
        this.onStateChange();
      } else if (e.key === ']' || e.key === '}') {
        this.brushSize = Math.min(180, this.brushSize + 4);
        this.onStateChange();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spaceBarDown = false;
        if (!this.isPanning && this.activeTool !== 'pan') {
          this.panContainer.classList.remove('is-panning');
        }
      }
    });
  }

  /* ---------------- Brush & Mask Drawing ---------------- */

  _setupBrushContext(isEraser = false) {
    const ctx = this.maskCtx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.brushSize;

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(244, 63, 94, 0.7)';
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
    }
  }

  _drawBrushDot(x, y) {
    this._setupBrushContext(false);
    this.maskCtx.beginPath();
    this.maskCtx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
    this.maskCtx.fill();
  }

  _drawBrushLine(x1, y1, x2, y2) {
    this._setupBrushContext(false);
    this.maskCtx.beginPath();
    this.maskCtx.moveTo(x1, y1);
    this.maskCtx.lineTo(x2, y2);
    this.maskCtx.stroke();
  }

  _drawEraserDot(x, y) {
    this._setupBrushContext(true);
    this.maskCtx.beginPath();
    this.maskCtx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
    this.maskCtx.fill();
    this.maskCtx.globalCompositeOperation = 'source-over';
  }

  _drawEraserLine(x1, y1, x2, y2) {
    this._setupBrushContext(true);
    this.maskCtx.beginPath();
    this.maskCtx.moveTo(x1, y1);
    this.maskCtx.lineTo(x2, y2);
    this.maskCtx.stroke();
    this.maskCtx.globalCompositeOperation = 'source-over';
  }

  _renderLassoPreview() {
    this.cursorCtx.clearRect(0, 0, this.width, this.height);
    if (this.lassoPoints.length < 2) return;

    this.cursorCtx.strokeStyle = '#f43f5e';
    this.cursorCtx.lineWidth = 2;
    this.cursorCtx.setLineDash([6, 3]);
    this.cursorCtx.beginPath();
    this.cursorCtx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
    for (let i = 1; i < this.lassoPoints.length; i++) {
      this.cursorCtx.lineTo(this.lassoPoints[i].x, this.lassoPoints[i].y);
    }
    this.cursorCtx.stroke();
    this.cursorCtx.setLineDash([]);
  }

  _fillLassoMask() {
    this.maskCtx.globalCompositeOperation = 'source-over';
    this.maskCtx.fillStyle = 'rgba(244, 63, 94, 0.7)';
    this.maskCtx.beginPath();
    this.maskCtx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
    for (let i = 1; i < this.lassoPoints.length; i++) {
      this.maskCtx.lineTo(this.lassoPoints[i].x, this.lassoPoints[i].y);
    }
    this.maskCtx.closePath();
    this.maskCtx.fill();
    this.lassoPoints = [];
  }

  _renderRectPreview(x1, y1, x2, y2) {
    this.cursorCtx.clearRect(0, 0, this.width, this.height);
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    this.cursorCtx.strokeStyle = '#f43f5e';
    this.cursorCtx.fillStyle = 'rgba(244, 63, 94, 0.2)';
    this.cursorCtx.lineWidth = 2;
    this.cursorCtx.setLineDash([5, 3]);
    this.cursorCtx.fillRect(rx, ry, rw, rh);
    this.cursorCtx.strokeRect(rx, ry, rw, rh);
    this.cursorCtx.setLineDash([]);
  }

  _fillRectMask(x1, y1, x2, y2) {
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    this.maskCtx.globalCompositeOperation = 'source-over';
    this.maskCtx.fillStyle = 'rgba(244, 63, 94, 0.7)';
    this.maskCtx.fillRect(rx, ry, rw, rh);
  }

  _executeWandKeyer(x1, y1, x2, y2) {
    const rx1 = Math.min(x1, x2);
    const ry1 = Math.min(y1, y2);
    const rx2 = Math.max(x1, x2);
    const ry2 = Math.max(y1, y2);

    if (rx2 - rx1 < 3 || ry2 - ry1 < 3) return;

    const imgData = this.imgCtx.getImageData(0, 0, this.width, this.height);
    const textMask = InpainterEngine.extractTextContourMask(imgData, rx1, ry1, rx2, ry2, this.tolerance);

    const maskImgData = this.maskCtx.getImageData(0, 0, this.width, this.height);
    for (let y = ry1; y <= ry2; y++) {
      for (let x = rx1; x <= rx2; x++) {
        const idx = y * this.width + x;
        if (textMask[idx] === 255) {
          const p = idx * 4;
          maskImgData.data[p] = 244;
          maskImgData.data[p + 1] = 63;
          maskImgData.data[p + 2] = 94;
          maskImgData.data[p + 3] = 180;
        }
      }
    }
    this.maskCtx.putImageData(maskImgData, 0, 0);
  }

  _drawCursorOverlay(x, y) {
    if (this.isDrawing && (this.activeTool === 'lasso' || this.activeTool === 'rect' || this.activeTool === 'wand')) {
      return;
    }
    this.cursorCtx.clearRect(0, 0, this.width, this.height);

    if (this.activeTool === 'brush' || this.activeTool === 'eraser') {
      this.cursorCtx.strokeStyle = this.activeTool === 'eraser' ? '#ffffff' : '#f43f5e';
      this.cursorCtx.lineWidth = 1.5;
      this.cursorCtx.beginPath();
      this.cursorCtx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
      this.cursorCtx.stroke();

      // Center crosshair dot
      this.cursorCtx.fillStyle = '#ffffff';
      this.cursorCtx.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  _clearCursorPreview() {
    this.cursorCtx.clearRect(0, 0, this.width, this.height);
  }

  /* ---------------- Mask Inspection & Extraction ---------------- */

  getMaskData() {
    const maskImgData = this.maskCtx.getImageData(0, 0, this.width, this.height);
    const data = maskImgData.data;
    const len = this.width * this.height;
    const alphaArray = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      alphaArray[i] = data[i * 4 + 3];
    }
    return alphaArray;
  }

  getMaskPixelCount() {
    if (!this.width || !this.height) return 0;
    const data = this.maskCtx.getImageData(0, 0, this.width, this.height).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 30) count++;
    }
    return count;
  }

  clearMask(recordHistory = true) {
    if (!this.width || !this.height) return;
    this.maskCtx.clearRect(0, 0, this.width, this.height);
    if (recordHistory) {
      this.saveHistoryState('Clear Mask');
      this.onStateChange();
    }
  }

  getImageData() {
    return this.imgCtx.getImageData(0, 0, this.width, this.height);
  }

  putImageData(imageData) {
    this.imgCtx.putImageData(imageData, 0, 0);
    this.clearMask(false);
    this.saveHistoryState('Inpainted Result');
    this.onStateChange();
  }

  /* ---------------- Undo / Redo History Stack ---------------- */

  saveHistoryState(label = 'Action') {
    if (!this.width || !this.height) return;

    // Drop redo branch
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    const state = {
      label,
      image: this.imgCtx.getImageData(0, 0, this.width, this.height),
      mask: this.maskCtx.getImageData(0, 0, this.width, this.height)
    };

    this.history.push(state);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
    this.onStateChange();
  }

  canUndo() {
    return this.historyIndex > 0;
  }

  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  undo() {
    if (!this.canUndo()) return;
    this.historyIndex--;
    const state = this.history[this.historyIndex];
    this.imgCtx.putImageData(state.image, 0, 0);
    this.maskCtx.putImageData(state.mask, 0, 0);
    this.onStateChange();
  }

  redo() {
    if (!this.canRedo()) return;
    this.historyIndex++;
    const state = this.history[this.historyIndex];
    this.imgCtx.putImageData(state.image, 0, 0);
    this.maskCtx.putImageData(state.mask, 0, 0);
    this.onStateChange();
  }

  resetToInitial() {
    if (this.history.length === 0) return;
    const initial = this.history[0];
    this.imgCtx.putImageData(initial.image, 0, 0);
    this.maskCtx.putImageData(initial.mask, 0, 0);
    this.historyIndex = 0;
    this.onStateChange();
  }
}

window.CanvasManager = CanvasManager;
