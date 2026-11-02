/**
 * AURA // Realistic Built-in Sample Generator
 * Generates crisp, high-resolution test photos with various realistic watermark types:
 * 1. Small digital camera date stamp (Sunset beach)
 * 2. Diagonal repeated translucent stock photo watermark grid (Modern architecture)
 * 3. Large solid studio badge / emblem watermark (Pine forest landscape)
 * 4. Social media creator handle & icon (Neon city night street)
 *
 * Each sample includes:
 * - render(): Renders photo WITH watermark
 * - renderClean(): Renders pristine clean photo WITHOUT watermark (for instant slider comparison)
 * - drawDefaultMask(): Pre-defines mask area for instant inpaint test in editor
 */

const SampleImages = {
  list: [
    {
      id: 'user-photo',
      title: 'Foto Anda: IVE Fancall Collage (Grid @ive.verse & Sticker)',
      tag: 'Foto Upload Anda',
      desc: 'Foto kolase IVE fancall yang Anda unggah. Menghapus sticker "love u baee", watermark berulang "@ive.verse", dan stempel platform kecil dengan menjaga wajah & objek tetap sempurna.',
      width: 1072,
      height: 1948,
      type: 'complex',
      recommendedAlgo: 'exemplar',
      imageBefore: 'assets/user_photo.png',
      imageAfter: 'assets/user_photo_cleaned.png'
    },
    {
      id: 'date-stamp',
      title: 'Watermark Kecil: Stempel Tanggal Kamera',
      tag: 'Watermark Kecil',
      desc: 'Sunset pantai dengan stempel tanggal digital orange (2024.10.15 18:32:41) di sudut bawah. Menguji restorasi gradasi langit & ombak halus.',
      width: 1280,
      height: 800,
      type: 'small',
      recommendedAlgo: 'telea',

      renderClean: function(ctx, w, h) {
        // Vibrant coastal sunset scene
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
        skyGrad.addColorStop(0, '#1a103c');
        skyGrad.addColorStop(0.3, '#4a154b');
        skyGrad.addColorStop(0.55, '#c84b31');
        skyGrad.addColorStop(0.75, '#f49d37');
        skyGrad.addColorStop(1, '#ffdf9e');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.65);

        // Sun disc
        ctx.save();
        ctx.shadowColor = '#fff3d1';
        ctx.shadowBlur = 40;
        ctx.fillStyle = '#fffdf7';
        ctx.beginPath();
        ctx.arc(w * 0.55, h * 0.52, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Mountains / Islands in distance
        ctx.fillStyle = '#2d132c';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.62);
        ctx.bezierCurveTo(w * 0.2, h * 0.54, w * 0.35, h * 0.59, w * 0.5, h * 0.57);
        ctx.bezierCurveTo(w * 0.65, h * 0.55, w * 0.8, h * 0.52, w, h * 0.6);
        ctx.lineTo(w, h * 0.65);
        ctx.lineTo(0, h * 0.65);
        ctx.closePath();
        ctx.fill();

        // Sea with water reflection
        const seaGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
        seaGrad.addColorStop(0, '#e87a38');
        seaGrad.addColorStop(0.2, '#aa3838');
        seaGrad.addColorStop(0.6, '#3a183d');
        seaGrad.addColorStop(1, '#130d24');
        ctx.fillStyle = seaGrad;
        ctx.fillRect(0, h * 0.65, w, h * 0.35);

        // Water ripple highlights
        ctx.strokeStyle = 'rgba(255, 230, 180, 0.35)';
        for (let i = 0; i < 45; i++) {
          const y = h * 0.65 + ((i * 19) % (h * 0.35));
          const xCenter = w * 0.55 + Math.sin(i * 3.7) * (w * 0.25);
          const len = 35 + ((i * 13) % 90);
          ctx.lineWidth = 1 + (y - h * 0.65) / 100;
          ctx.beginPath();
          ctx.moveTo(xCenter - len / 2, y);
          ctx.lineTo(xCenter + len / 2, y);
          ctx.stroke();
        }
      },

      render: function(ctx, w, h) {
        this.renderClean(ctx, w, h);

        // Realistic Digital Camera Timestamp watermark in bottom-right corner
        ctx.save();
        ctx.font = 'bold 26px "Courier New", Courier, monospace';
        ctx.fillStyle = '#ff7b00';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText("'24  10  15   18:32:41", w - 380, h - 45);
        ctx.restore();
      },

      drawDefaultMask: function(maskCtx, w, h) {
        maskCtx.fillStyle = 'rgba(244, 63, 94, 0.7)';
        maskCtx.fillRect(w - 395, h - 80, 370, 50);
      }
    },
    {
      id: 'translucent-grid',
      title: 'Watermark Banyak: Grid Stock Transparan',
      tag: 'Banyak / Berulang',
      desc: 'Foto arsitektur modern bertekstur dengan watermark diagonal semi-transparan berulang (Copyright Stock Photo). Menguji pemulihan tekstur kaca & baja tanpa blur.',
      width: 1280,
      height: 800,
      type: 'multiple',
      recommendedAlgo: 'translucent',

      renderClean: function(ctx, w, h) {
        // Modern architectural facade with glass & steel patterns
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
        skyGrad.addColorStop(0, '#102a43');
        skyGrad.addColorStop(1, '#486581');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Angled skyscraper building
        ctx.save();
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(w * 0.15, h);
        ctx.lineTo(w * 0.4, h * 0.1);
        ctx.lineTo(w * 0.88, h * 0.25);
        ctx.lineTo(w * 0.95, h);
        ctx.closePath();
        ctx.fill();

        // Architectural window grid pattern
        const stepX = 35;
        const stepY = 22;
        for (let y = h * 0.15; y < h; y += stepY) {
          for (let x = w * 0.18; x < w * 0.9; x += stepX) {
            if (x > w * 0.4 - (y - h * 0.1) * 0.35 && x < w * 0.88 + (y - h * 0.25) * 0.1) {
              const lum = 40 + Math.floor(Math.sin(x * 0.05 + y * 0.03) * 20);
              const isLit = (Math.sin(x * 7 + y * 13) > 0.6);
              ctx.fillStyle = isLit ? '#fef08a' : `rgb(${lum}, ${lum + 10}, ${lum + 25})`;
              ctx.fillRect(x, y, stepX - 4, stepY - 3);
            }
          }
        }
        ctx.restore();
      },

      render: function(ctx, w, h) {
        this.renderClean(ctx, w, h);

        ctx.save();
        ctx.rotate(-22 * Math.PI / 180);
        ctx.font = '600 36px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;

        for (let row = -5; row < 12; row++) {
          for (let col = -3; col < 8; col++) {
            const posX = col * 340 + (row % 2) * 170;
            const posY = row * 160;
            ctx.strokeText('© AURA STOCK PREVIEW', posX, posY);
            ctx.fillText('© AURA STOCK PREVIEW', posX, posY);
          }
        }
        ctx.restore();
      },

      drawDefaultMask: function(maskCtx, w, h) {
        maskCtx.fillStyle = 'rgba(244, 63, 94, 0.65)';
        maskCtx.save();
        maskCtx.rotate(-22 * Math.PI / 180);
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 4; col++) {
            const posX = col * 340 + (row % 2) * 170 - 10;
            const posY = row * 160 - 36;
            maskCtx.fillRect(posX, posY, 420, 48);
          }
        }
        maskCtx.restore();
      }
    },
    {
      id: 'large-logo',
      title: 'Watermark Besar: Logo / Badge Tengah',
      tag: 'Watermark Besar',
      desc: 'Pemandangan alam hutan pinus dengan logo stempel bulat besar dan pita teks di tengah. Menguji algoritma Exemplar Synthesizer merekonstruksi detail pohon & dedaunan.',
      width: 1280,
      height: 800,
      type: 'large',
      recommendedAlgo: 'exemplar',

      renderClean: function(ctx, w, h) {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#bfdbfe');
        bgGrad.addColorStop(0.35, '#93c5fd');
        bgGrad.addColorStop(1, '#1e3a5f');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        function drawPineLayer(count, startY, height, color) {
          ctx.fillStyle = color;
          for (let i = 0; i < count; i++) {
            const tx = (i / count) * w + ((i * 37) % 30) - 15;
            const th = height + ((i * 23) % 60) - 30;
            const ty = startY;
            ctx.beginPath();
            ctx.moveTo(tx, ty - th);
            ctx.lineTo(tx + 22, ty);
            ctx.lineTo(tx - 22, ty);
            ctx.closePath();
            ctx.fill();
          }
        }

        drawPineLayer(45, h * 0.55, 120, '#334155');
        drawPineLayer(40, h * 0.70, 180, '#1e293b');
        drawPineLayer(30, h * 0.90, 240, '#0f172a');

        ctx.fillStyle = '#091e13';
        ctx.fillRect(0, h * 0.82, w, h * 0.18);

        for (let i = 0; i < 600; i++) {
          const fx = ((i * 73) % w);
          const fy = h * 0.6 + ((i * 47) % (h * 0.4));
          ctx.fillStyle = `rgba(34, 197, 94, ${0.1 + ((i % 10) / 30)})`;
          ctx.fillRect(fx, fy, 2, 2);
        }
      },

      render: function(ctx, w, h) {
        this.renderClean(ctx, w, h);

        ctx.save();
        const cx = w * 0.5;
        const cy = h * 0.48;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, 110, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0369a1';
        ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NATURE ARCHIVE', cx, cy - 25);

        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 70, cy - 12);
        ctx.lineTo(cx + 70, cy - 12);
        ctx.stroke();

        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillStyle = '#475569';
        ctx.fillText('DO NOT COPY', cx, cy + 12);
        ctx.fillText('PROPERTY OF GEO MEDIA', cx, cy + 34);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx - 90, cy + 50, 180, 26);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('PROTECTED CONTENT', cx, cy + 67);

        ctx.restore();
      },

      drawDefaultMask: function(maskCtx, w, h) {
        const cx = w * 0.5;
        const cy = h * 0.48;
        maskCtx.fillStyle = 'rgba(244, 63, 94, 0.7)';
        maskCtx.beginPath();
        maskCtx.arc(cx, cy, 120, 0, Math.PI * 2);
        maskCtx.fill();
      }
    },
    {
      id: 'social-watermark',
      title: 'Watermark Video / Sosmed: ID Handle & Ikon',
      tag: 'Sosial Media / Video',
      desc: 'Foto potret malam dengan watermark TikTok/Reels di sudut atas & bawah (@creative_motion_id). Menguji seleksi teks rapat & preservasi pantulan aspal basah.',
      width: 1280,
      height: 800,
      type: 'social',
      recommendedAlgo: 'exemplar',

      renderClean: function(ctx, w, h) {
        const nightGrad = ctx.createLinearGradient(0, 0, w, h);
        nightGrad.addColorStop(0, '#030712');
        nightGrad.addColorStop(0.5, '#1e1b4b');
        nightGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = nightGrad;
        ctx.fillRect(0, 0, w, h);

        const bokeh = [
          { x: 300, y: 250, r: 80, c: 'rgba(236, 72, 153, 0.4)' },
          { x: 800, y: 320, r: 120, c: 'rgba(6, 182, 212, 0.35)' },
          { x: 500, y: 480, r: 90, c: 'rgba(245, 158, 11, 0.3)' },
          { x: 1000, y: 200, r: 60, c: 'rgba(139, 92, 246, 0.4)' },
          { x: 200, y: 600, r: 110, c: 'rgba(16, 185, 129, 0.25)' }
        ];

        bokeh.forEach(b => {
          ctx.save();
          ctx.fillStyle = b.c;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(0, h * 0.65, w, h * 0.35);

        for (let i = 0; i < 30; i++) {
          const rx = ((i * 97) % w);
          const ry = h * 0.68 + ((i * 31) % (h * 0.28));
          ctx.fillStyle = (i % 2 === 0) ? 'rgba(236, 72, 153, 0.25)' : 'rgba(6, 182, 212, 0.25)';
          ctx.fillRect(rx, ry, 60 + (i % 8) * 10, 3);
        }
      },

      render: function(ctx, w, h) {
        this.renderClean(ctx, w, h);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;

        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(70, 70, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(73, 68, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(71, 69, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('@creative_motion_id', 98, 77);

        ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText('ID: 88492048291', w - 240, h - 50);

        ctx.restore();
      },

      drawDefaultMask: function(maskCtx, w, h) {
        maskCtx.fillStyle = 'rgba(244, 63, 94, 0.7)';
        maskCtx.fillRect(45, 45, 340, 48);
        maskCtx.fillRect(w - 255, h - 75, 220, 40);
      }
    }
  ],

  createSampleCanvas: function(sampleId) {
    const sample = this.list.find(s => s.id === sampleId) || this.list[0];
    const canvas = document.createElement('canvas');
    canvas.width = sample.width;
    canvas.height = sample.height;
    const ctx = canvas.getContext('2d');

    if (sample.imageBefore) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          resolve({ canvas, sample });
        };
        img.onerror = () => {
          if (sample.render) sample.render(ctx, sample.width, sample.height);
          resolve({ canvas, sample });
        };
        img.src = sample.imageBefore;
      });
    }

    if (sample.render) sample.render(ctx, sample.width, sample.height);
    return Promise.resolve({ canvas, sample });
  },

  createComparisonPair: function(sampleId) {
    const sample = this.list.find(s => s.id === sampleId) || this.list[0];

    const origCanvas = document.createElement('canvas');
    origCanvas.width = sample.width;
    origCanvas.height = sample.height;
    const origCtx = origCanvas.getContext('2d');

    const cleanCanvas = document.createElement('canvas');
    cleanCanvas.width = sample.width;
    cleanCanvas.height = sample.height;
    const cleanCtx = cleanCanvas.getContext('2d');

    if (sample.imageBefore && sample.imageAfter) {
      return new Promise((resolve) => {
        const imgBefore = new Image();
        const imgAfter = new Image();
        let loaded = 0;
        const onDone = () => {
          loaded++;
          if (loaded === 2) {
            origCtx.drawImage(imgBefore, 0, 0);
            cleanCtx.drawImage(imgAfter, 0, 0);
            resolve({
              sample,
              canvas: origCanvas,
              originalImageData: origCtx.getImageData(0, 0, sample.width, sample.height),
              cleanImageData: cleanCtx.getImageData(0, 0, sample.width, sample.height)
            });
          }
        };
        imgBefore.onload = onDone;
        imgAfter.onload = onDone;
        imgBefore.onerror = () => {
          if (sample.render) sample.render(origCtx, sample.width, sample.height);
          if (sample.renderClean) sample.renderClean(cleanCtx, sample.width, sample.height);
          resolve({
            sample,
            canvas: origCanvas,
            originalImageData: origCtx.getImageData(0, 0, sample.width, sample.height),
            cleanImageData: cleanCtx.getImageData(0, 0, sample.width, sample.height)
          });
        };
        imgAfter.onerror = imgBefore.onerror;
        imgBefore.src = sample.imageBefore;
        imgAfter.src = sample.imageAfter;
      });
    }

    if (sample.render) sample.render(origCtx, sample.width, sample.height);
    if (sample.renderClean) sample.renderClean(cleanCtx, sample.width, sample.height);

    return Promise.resolve({
      sample,
      canvas: origCanvas,
      originalImageData: origCtx.getImageData(0, 0, sample.width, sample.height),
      cleanImageData: cleanCtx.getImageData(0, 0, sample.width, sample.height)
    });
  }
};
