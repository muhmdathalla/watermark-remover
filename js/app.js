/**
 * AURA // Studio Master Application Controller
 * Orchestrates tools, viewport modes, inpainting execution,
 * history stacks, export generation, and sample images.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const emptyDropzone = document.getElementById('emptyDropzone');
  const canvasWorkspace = document.getElementById('canvasWorkspace');
  const canvasPanContainer = document.getElementById('canvasPanContainer');
  const sliderViewport = document.getElementById('sliderViewport');
  const sideBySideViewport = document.getElementById('sideBySideViewport');

  const fileInput = document.getElementById('fileInput');
  const btnChooseFile = document.getElementById('btnChooseFile');
  const btnUploadNew = document.getElementById('btnUploadNew');
  const btnSampleGallery = document.getElementById('btnSampleGallery');

  // View Switcher
  const btnViewEditor = document.getElementById('btnViewEditor');
  const btnViewSlider = document.getElementById('btnViewSlider');
  const btnViewSideBySide = document.getElementById('btnViewSideBySide');

  // History & Actions
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  const btnClearMask = document.getElementById('btnClearMask');
  const btnResetImage = document.getElementById('btnResetImage');
  const btnProcess = document.getElementById('btnProcess');
  const btnExport = document.getElementById('btnExport');

  // HUD
  const hudZoomVal = document.getElementById('hudZoomVal');
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnZoomFit = document.getElementById('btnZoomFit');
  const btnPeekOriginal = document.getElementById('btnPeekOriginal');

  // Tool Controls
  const toolButtons = document.querySelectorAll('.tool-card');
  const inputBrushSize = document.getElementById('inputBrushSize');
  const valBrushSize = document.getElementById('valBrushSize');
  const inputFeather = document.getElementById('inputFeather');
  const valFeather = document.getElementById('valFeather');
  const inputGrain = document.getElementById('inputGrain');
  const valGrain = document.getElementById('valGrain');
  const inputTolerance = document.getElementById('inputTolerance');
  const valTolerance = document.getElementById('valTolerance');

  // Status Bar
  const statusDim = document.getElementById('statusDim');
  const statusMaskCount = document.getElementById('statusMaskCount');
  const statusZoom = document.getElementById('statusZoom');
  const statusNotice = document.getElementById('statusNotice');

  // Modals & Dialogs
  const shortcutsModal = document.getElementById('shortcutsModal');
  const btnShortcuts = document.getElementById('btnShortcuts');
  const btnCloseShortcuts = document.getElementById('btnCloseShortcuts');

  const sampleModal = document.getElementById('sampleModal');
  const btnCloseSamples = document.getElementById('btnCloseSamples');
  const sampleGalleryModalGrid = document.getElementById('sampleGalleryModalGrid');
  const emptySampleCards = document.getElementById('emptySampleCards');

  const exportModal = document.getElementById('exportModal');
  const btnCloseExport = document.getElementById('btnCloseExport');
  const btnCancelExport = document.getElementById('btnCancelExport');
  const btnConfirmDownload = document.getElementById('btnConfirmDownload');
  const exportDimVal = document.getElementById('exportDimVal');
  const formatChips = document.querySelectorAll('.format-chip');
  const groupJpegQuality = document.getElementById('groupJpegQuality');
  const inputJpegQuality = document.getElementById('inputJpegQuality');
  const valJpegQuality = document.getElementById('valJpegQuality');

  // Processing Overlay
  const processingOverlay = document.getElementById('processingOverlay');
  const processingStageTitle = document.getElementById('processingStageTitle');
  const processingStageSub = document.getElementById('processingStageSub');
  const processingProgressFill = document.getElementById('processingProgressFill');

  // Engines
  const inpainter = new InpainterEngine();
  const slider = new SliderController();
  let currentOriginalImageData = null;
  let currentProcessedImageData = null;
  let activeViewMode = 'editor'; // 'editor' | 'slider' | 'sidebyside'
  let exportFormat = 'png';

  // Initialize Canvas Manager
  const canvasMgr = new CanvasManager({
    onStateChange: () => updateUIState(),
    onZoomChange: (scale) => {
      const pct = Math.round(scale * 100);
      hudZoomVal.textContent = pct + '%';
      statusZoom.textContent = `Zoom: ${pct}%`;
    }
  });

  /* ---------------- UI State Synchronization ---------------- */

  function updateUIState() {
    const hasImage = !!canvasMgr.width && !!canvasMgr.height;
    const maskPixels = canvasMgr.getMaskPixelCount();

    btnUndo.disabled = !canvasMgr.canUndo();
    btnRedo.disabled = !canvasMgr.canRedo();
    btnClearMask.disabled = maskPixels === 0;
    btnResetImage.disabled = !canvasMgr.canUndo();
    btnProcess.disabled = !hasImage || maskPixels === 0 || inpainter.isProcessing;

    const hasProcessed = !!currentProcessedImageData;
    btnViewSlider.disabled = !hasProcessed;
    btnViewSideBySide.disabled = !hasProcessed;
    btnExport.disabled = !hasImage;

    // Status bar
    if (hasImage) {
      statusDim.textContent = `Resolusi: ${canvasMgr.width} × ${canvasMgr.height} px`;
      statusMaskCount.textContent = `Area Mask: ${maskPixels.toLocaleString()} px²`;
      if (maskPixels > 0) {
        statusNotice.textContent = `Watermark ditandai (${maskPixels.toLocaleString()} px). Tekan 'Hapus Watermark' atau Enter untuk eksekusi.`;
      } else {
        statusNotice.textContent = `Gunakan kuas atau lasso untuk menandai watermark yang ingin dihilangkan.`;
      }
    } else {
      statusDim.textContent = 'Resolusi: —';
      statusMaskCount.textContent = 'Area Mask: 0 px²';
    }

    valBrushSize.textContent = `${canvasMgr.brushSize} px`;
    inputBrushSize.value = canvasMgr.brushSize;
  }

  /* ---------------- View Mode Switcher ---------------- */

  function switchView(mode) {
    activeViewMode = mode;
    btnViewEditor.classList.toggle('active', mode === 'editor');
    btnViewSlider.classList.toggle('active', mode === 'slider');
    btnViewSideBySide.classList.toggle('active', mode === 'sidebyside');

    canvasPanContainer.style.display = mode === 'editor' ? 'block' : 'none';
    sliderViewport.style.display = mode === 'slider' ? 'flex' : 'none';
    sideBySideViewport.style.display = mode === 'sidebyside' ? 'flex' : 'none';

    if (mode === 'slider') {
      slider.updateLayout();
      statusNotice.textContent = 'Geser pembatas garis untuk melihat perbandingan Sebelum & Sesudah watermark dihilangkan.';
    } else if (mode === 'sidebyside') {
      statusNotice.textContent = 'Perbandingan berdampingan: Kiri gambar asli ber-watermark, Kanan hasil inpainting bersih.';
    } else {
      updateUIState();
    }
  }

  btnViewEditor.addEventListener('click', () => switchView('editor'));
  btnViewSlider.addEventListener('click', () => switchView('slider'));
  btnViewSideBySide.addEventListener('click', () => switchView('sidebyside'));

  /* ---------------- Tool Palette Binding ---------------- */

  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toolButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tool = btn.dataset.tool;
      canvasMgr.activeTool = tool;

      if (tool === 'pan') {
        canvasPanContainer.classList.add('is-panning');
      } else {
        canvasPanContainer.classList.remove('is-panning');
      }
    });
  });

  inputBrushSize.addEventListener('input', (e) => {
    canvasMgr.brushSize = parseInt(e.target.value, 10);
    valBrushSize.textContent = `${canvasMgr.brushSize} px`;
  });

  inputFeather.addEventListener('input', (e) => {
    canvasMgr.feather = parseInt(e.target.value, 10);
    valFeather.textContent = `${canvasMgr.feather} px`;
  });

  inputGrain.addEventListener('input', (e) => {
    valGrain.textContent = `${e.target.value}%`;
  });

  inputTolerance.addEventListener('input', (e) => {
    canvasMgr.tolerance = parseInt(e.target.value, 10);
    valTolerance.textContent = e.target.value;
  });

  // Algorithm radios
  document.querySelectorAll('input[name="inpaintingAlgo"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.querySelectorAll('.algo-radio').forEach(r => r.classList.remove('active'));
      e.target.closest('.algo-radio').classList.add('active');
    });
  });

  /* ---------------- History & Actions ---------------- */

  btnUndo.addEventListener('click', () => canvasMgr.undo());
  btnRedo.addEventListener('click', () => canvasMgr.redo());
  btnClearMask.addEventListener('click', () => canvasMgr.clearMask(true));
  btnResetImage.addEventListener('click', () => {
    if (confirm('Kembalikan ke gambar asli awal?')) {
      canvasMgr.resetToInitial();
    }
  });

  /* ---------------- Zoom & Pan HUD ---------------- */

  btnZoomIn.addEventListener('click', () => canvasMgr.setZoom(canvasMgr.scale * 1.25));
  btnZoomOut.addEventListener('click', () => canvasMgr.setZoom(canvasMgr.scale * 0.8));
  btnZoomFit.addEventListener('click', () => canvasMgr.resetViewport());

  // Peek original
  btnPeekOriginal.addEventListener('mousedown', () => slider.peekOriginal(true));
  btnPeekOriginal.addEventListener('mouseup', () => slider.peekOriginal(false));
  btnPeekOriginal.addEventListener('mouseleave', () => slider.peekOriginal(false));

  /* ---------------- Inpainting Execution ---------------- */

  async function executeInpainting() {
    if (!canvasMgr.width || !canvasMgr.height) return;
    const maskData = canvasMgr.getMaskData();
    const maskPixels = canvasMgr.getMaskPixelCount();
    if (maskPixels === 0) return;

    // Check selected algorithm
    const selectedAlgo = document.querySelector('input[name="inpaintingAlgo"]:checked').value;
    const grainPreserve = parseInt(inputGrain.value, 10) / 100.0;
    const feather = canvasMgr.feather;

    // Show processing modal
    processingOverlay.style.display = 'flex';
    btnProcess.classList.add('loading');
    btnProcess.disabled = true;

    // Cache current state as original if first time
    if (!currentOriginalImageData) {
      currentOriginalImageData = canvasMgr.getImageData();
    }

    try {
      const srcImageData = canvasMgr.getImageData();

      const resultImageData = await inpainter.process(
        srcImageData,
        maskData,
        {
          algorithm: selectedAlgo,
          grainPreserve,
          feather,
          patchSize: selectedAlgo === 'exemplar' ? 9 : 7
        },
        (progress, message) => {
          processingProgressFill.style.width = `${progress}%`;
          processingStageTitle.textContent = message;
        }
      );

      // Store result
      currentProcessedImageData = resultImageData;

      // Update Canvas editor
      canvasMgr.putImageData(resultImageData);

      // Update Slider comparison
      slider.setComparisonData(currentOriginalImageData, currentProcessedImageData);

      // Automatically offer slider preview
      switchView('slider');
    } catch (err) {
      console.error('Inpainting error:', err);
      alert('Terjadi kendala saat inpainting: ' + err.message);
    } finally {
      processingOverlay.style.display = 'none';
      btnProcess.classList.remove('loading');
      updateUIState();
    }
  }

  btnProcess.addEventListener('click', executeInpainting);

  /* ---------------- Image Loading & Drag-and-Drop ---------------- */

  function handleLoadedImage(imageSource) {
    emptyDropzone.style.display = 'none';
    canvasWorkspace.style.display = 'flex';

    canvasMgr.loadImage(imageSource);

    // Save as original baseline
    setTimeout(() => {
      currentOriginalImageData = canvasMgr.getImageData();
      currentProcessedImageData = null;
      switchView('editor');
      updateUIState();
    }, 100);
  }

  btnChooseFile.addEventListener('click', () => fileInput.click());
  btnUploadNew.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => handleLoadedImage(event.target.result);
      reader.readAsDataURL(file);
    }
    fileInput.value = '';
  });

  // Drag and drop support
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    const card = document.querySelector('.empty-card');
    if (card) card.classList.add('drag-over');
  });

  window.addEventListener('dragleave', (e) => {
    const card = document.querySelector('.empty-card');
    if (card) card.classList.remove('drag-over');
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const card = document.querySelector('.empty-card');
    if (card) card.classList.remove('drag-over');

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => handleLoadedImage(event.target.result);
        reader.readAsDataURL(file);
      }
    }
  });

  // Clipboard Paste support (Ctrl+V / Cmd+V)
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => handleLoadedImage(event.target.result);
        reader.readAsDataURL(blob);
        break;
      }
    }
  });

  /* ---------------- Built-in Sample Gallery Setup ---------------- */

  function renderSampleCards() {
    emptySampleCards.innerHTML = '';
    sampleGalleryModalGrid.innerHTML = '';

    SampleImages.list.forEach(sample => {
      // Empty dropzone card
      const miniCard = document.createElement('div');
      miniCard.className = 'sample-mini-card';
      miniCard.innerHTML = `
        <div class="sample-thumb-wrap">
          <canvas width="160" height="90" id="thumb_${sample.id}"></canvas>
        </div>
        <span class="sample-card-title">${sample.title.split(':')[0]}</span>
      `;
      miniCard.addEventListener('click', () => loadSample(sample.id));
      emptySampleCards.appendChild(miniCard);

      // Render thumbnail
      setTimeout(() => {
        const thumbCanvas = document.getElementById(`thumb_${sample.id}`);
        if (thumbCanvas) {
          const tCtx = thumbCanvas.getContext('2d');
          sample.render(tCtx, 160, 90);
        }
      }, 50);

      // Modal gallery item
      const galleryItem = document.createElement('div');
      galleryItem.className = 'sample-gallery-item';
      galleryItem.innerHTML = `
        <div class="sample-preview-box">
          <canvas width="320" height="180" id="modal_thumb_${sample.id}"></canvas>
        </div>
        <div class="sample-meta">
          <h4>${sample.title}</h4>
          <p>${sample.desc}</p>
        </div>
      `;
      galleryItem.addEventListener('click', () => {
        sampleModal.close();
        loadSample(sample.id);
      });
      sampleGalleryModalGrid.appendChild(galleryItem);

      setTimeout(() => {
        const mThumb = document.getElementById(`modal_thumb_${sample.id}`);
        if (mThumb) {
          const mCtx = mThumb.getContext('2d');
          sample.render(mCtx, 320, 180);
        }
      }, 60);
    });
  }

  function loadSample(sampleId) {
    const { canvas, sample } = SampleImages.createSampleCanvas(sampleId);
    handleLoadedImage(canvas);

    // Auto switch algorithm based on sample type recommendation
    if (sample.type === 'multiple') {
      const radio = document.getElementById('algoTranslucent');
      if (radio) {
        radio.checked = true;
        document.querySelectorAll('.algo-radio').forEach(r => r.classList.remove('active'));
        radio.closest('.algo-radio').classList.add('active');
      }
    } else if (sample.type === 'small') {
      const radio = document.getElementById('algoFastMarching');
      if (radio) {
        radio.checked = true;
        document.querySelectorAll('.algo-radio').forEach(r => r.classList.remove('active'));
        radio.closest('.algo-radio').classList.add('active');
      }
    } else {
      const radio = document.getElementById('algoSynthesis');
      if (radio) {
        radio.checked = true;
        document.querySelectorAll('.algo-radio').forEach(r => r.classList.remove('active'));
        radio.closest('.algo-radio').classList.add('active');
      }
    }
  }

  btnSampleGallery.addEventListener('click', () => sampleModal.showModal());
  btnCloseSamples.addEventListener('click', () => sampleModal.close());

  renderSampleCards();

  /* ---------------- Export Modal & Image Download ---------------- */

  btnExport.addEventListener('click', () => {
    exportDimVal.textContent = `${canvasMgr.width} × ${canvasMgr.height} px`;
    exportModal.showModal();
  });

  btnCloseExport.addEventListener('click', () => exportModal.close());
  btnCancelExport.addEventListener('click', () => exportModal.close());

  formatChips.forEach(chip => {
    chip.addEventListener('click', () => {
      formatChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      exportFormat = chip.dataset.format;
      groupJpegQuality.style.display = (exportFormat === 'jpeg' || exportFormat === 'webp') ? 'flex' : 'none';
    });
  });

  inputJpegQuality.addEventListener('input', (e) => {
    valJpegQuality.textContent = `${e.target.value}%`;
  });

  btnConfirmDownload.addEventListener('click', () => {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = canvasMgr.width;
    outCanvas.height = canvasMgr.height;
    const outCtx = outCanvas.getContext('2d');

    // Use processed image if available, else current canvas
    const imgData = currentProcessedImageData || canvasMgr.getImageData();
    outCtx.putImageData(imgData, 0, 0);

    let mimeType = 'image/png';
    let ext = 'png';
    let quality = 0.95;

    if (exportFormat === 'jpeg') {
      mimeType = 'image/jpeg';
      ext = 'jpg';
      quality = parseInt(inputJpegQuality.value, 10) / 100.0;
    } else if (exportFormat === 'webp') {
      mimeType = 'image/webp';
      ext = 'webp';
      quality = parseInt(inputJpegQuality.value, 10) / 100.0;
    }

    outCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AURA_Inpainted_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      exportModal.close();
    }, mimeType, quality);
  });

  /* ---------------- Keyboard Shortcuts HUD ---------------- */

  btnShortcuts.addEventListener('click', () => shortcutsModal.showModal());
  btnCloseShortcuts.addEventListener('click', () => shortcutsModal.close());

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'b' || e.key === 'B') {
      document.getElementById('toolBrush').click();
    } else if (e.key === 'e' || e.key === 'E') {
      document.getElementById('toolEraser').click();
    } else if (e.key === 'l' || e.key === 'L') {
      document.getElementById('toolLasso').click();
    } else if (e.key === 'r' || e.key === 'R') {
      document.getElementById('toolRect').click();
    } else if (e.key === 'w' || e.key === 'W') {
      document.getElementById('toolWand').click();
    } else if (e.key === 'h' || e.key === 'H') {
      document.getElementById('toolPan').click();
    } else if (e.key === 'c' || e.key === 'C') {
      canvasMgr.clearMask(true);
    } else if (e.key === 'Enter') {
      if (!btnProcess.disabled) executeInpainting();
    } else if (e.key === 'v' || e.key === 'V') {
      if (!btnViewSlider.disabled) switchView('slider');
    } else if (e.key === 's' || e.key === 'S') {
      if (!btnViewSideBySide.disabled) switchView('sidebyside');
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) {
        canvasMgr.redo();
      } else {
        canvasMgr.undo();
      }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      canvasMgr.redo();
    }
  });

  // Initial State
  updateUIState();
});
