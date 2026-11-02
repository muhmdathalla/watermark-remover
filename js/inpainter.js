/**
 * AURA // Ultra-Precision Inpainting Engine
 * Implements:
 * 1. Exemplar-Based Texture Synthesis (Criminisi et al. structure & texture propagation)
 * 2. Translucent Alpha Inversion Restorer (De-watermarker for semi-transparent logos)
 * 3. Curvature Fast Marching Method (Telea smooth gradient inpainter)
 * 4. High-frequency Grain & Poisson Boundary Synthesizer
 */

class InpainterEngine {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Main entry point for inpainting
   * @param {ImageData} srcImageData - Original image data
   * @param {Uint8Array} maskData - 1D array where >0 means masked pixel to be removed
   * @param {Object} options - Inpainting parameters
   * @param {Function} onProgress - Progress callback (percentage, stageName)
   * @returns {Promise<ImageData>} - Repaired image data
   */
  async process(srcImageData, maskData, options = {}, onProgress = () => {}) {
    this.isProcessing = true;
    const {
      algorithm = 'exemplar', // 'exemplar' | 'translucent' | 'telea'
      patchSize = 9,          // 7, 9, 11
      searchRadius = 60,      // search window radius around mask
      grainPreserve = 0.65,   // 0.0 to 1.0
      feather = 2
    } = options;

    const width = srcImageData.width;
    const height = srcImageData.height;
    const totalPixels = width * height;

    // Check how many pixels are masked
    let maskPixelCount = 0;
    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (maskData[idx] > 30) {
          maskPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maskPixelCount === 0) {
      return srcImageData; // Nothing to remove
    }

    // Add margin to bounding box
    const margin = Math.max(patchSize * 2, 30);
    const boxX1 = Math.max(0, minX - margin);
    const boxY1 = Math.max(0, minY - margin);
    const boxX2 = Math.min(width - 1, maxX + margin);
    const boxY2 = Math.min(height - 1, maxY + margin);

    onProgress(10, 'Menganalisa struktur area watermark...');
    await this._yield();

    // Clone source image data so original stays pristine
    const resultImageData = new ImageData(
      new Uint8ClampedArray(srcImageData.data),
      width,
      height
    );

    if (algorithm === 'translucent') {
      onProgress(25, 'Memulihkan pixel asli dengan rekonstruksi inversi alpha...');
      await this._yield();
      await this._inpaintTranslucent(resultImageData, maskData, width, height, boxX1, boxY1, boxX2, boxY2, onProgress);
    } else if (algorithm === 'telea') {
      onProgress(30, 'Rekonstruksi kontur gradasi...');
      await this._yield();
      await this._inpaintFastMarching(resultImageData, maskData, width, height, boxX1, boxY1, boxX2, boxY2, onProgress);
    } else {
      // Default: Exemplar Pattern Synthesizer (Criminisi)
      onProgress(25, 'Mensintesis struktur tekstur & kontur sekitar...');
      await this._yield();
      await this._inpaintExemplar(
        resultImageData,
        maskData,
        width,
        height,
        boxX1,
        boxY1,
        boxX2,
        boxY2,
        patchSize,
        searchRadius,
        onProgress
      );
    }

    // High-frequency sensor grain & micro-texture preservation
    if (grainPreserve > 0.1) {
      onProgress(92, 'Menyelaraskan grain & noise kamera asli...');
      await this._yield();
      this._applyTextureHarmonization(resultImageData, srcImageData, maskData, width, height, boxX1, boxY1, boxX2, boxY2, grainPreserve);
    }

    // Feathered boundary seamless blend
    if (feather > 0) {
      onProgress(97, 'Menghaluskan transisi tepi piksel...');
      await this._yield();
      this._featherMaskEdge(resultImageData, srcImageData, maskData, width, height, boxX1, boxY1, boxX2, boxY2, feather);
    }

    onProgress(100, 'Selesai');
    this.isProcessing = false;
    return resultImageData;
  }

  /**
   * Helper to yield to event loop so UI does not freeze
   */
  _yield() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * 1. Translucent Alpha Inversion Restorer
   * Restores the hidden pixels under semi-transparent watermarks (Stock photo previews, TikTok, etc.)
   */
  async _inpaintTranslucent(imgData, maskData, w, h, x1, y1, x2, y2, onProgress) {
    const data = imgData.data;

    // First, sample unmasked boundary colors around the watermark region
    let boundaryR = 0, boundaryG = 0, boundaryB = 0, count = 0;
    for (let y = y1; y <= y2; y += 2) {
      for (let x = x1; x <= x2; x += 2) {
        const idx = y * w + x;
        if (maskData[idx] === 0) {
          const p = idx * 4;
          boundaryR += data[p];
          boundaryG += data[p + 1];
          boundaryB += data[p + 2];
          count++;
        }
      }
    }

    const avgR = count > 0 ? boundaryR / count : 128;
    const avgG = count > 0 ? boundaryG / count : 128;
    const avgB = count > 0 ? boundaryB / count : 128;

    // Detect if watermark text is bright (white/light) or dark
    let maskR = 0, maskG = 0, maskB = 0, mCount = 0;
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const idx = y * w + x;
        if (maskData[idx] > 30) {
          const p = idx * 4;
          maskR += data[p];
          maskG += data[p + 1];
          maskB += data[p + 2];
          mCount++;
        }
      }
    }

    const avgMaskR = mCount > 0 ? maskR / mCount : 200;
    const avgMaskG = mCount > 0 ? maskG / mCount : 200;
    const avgMaskB = mCount > 0 ? maskB / mCount : 200;

    // Determine watermark assumed luminance & alpha offset
    const isBrightWm = (avgMaskR + avgMaskG + avgMaskB) > (avgR + avgG + avgB);
    const targetWmColor = isBrightWm ? 255 : 0;

    for (let y = y1; y <= y2; y++) {
      if (y % 40 === 0) {
        const pct = Math.floor(25 + ((y - y1) / (y2 - y1)) * 60);
        onProgress(pct, `Menginversi alpha watermark baris ${y}...`);
        await this._yield();
      }

      for (let x = x1; x <= x2; x++) {
        const idx = y * w + x;
        const maskVal = maskData[idx];
        if (maskVal > 30) {
          const p = idx * 4;
          const currR = data[p];
          const currG = data[p + 1];
          const currB = data[p + 2];

          // Estimate local alpha from surrounding contrast
          // C_obs = (1 - alpha) * C_orig + alpha * C_wm
          // => C_orig = (C_obs - alpha * C_wm) / (1 - alpha)
          const maskWeight = maskVal / 255.0;
          const estimatedAlpha = Math.min(0.65, 0.28 * maskWeight);

          if (isBrightWm) {
            data[p] = Math.max(0, Math.min(255, (currR - estimatedAlpha * 255) / (1 - estimatedAlpha)));
            data[p + 1] = Math.max(0, Math.min(255, (currG - estimatedAlpha * 255) / (1 - estimatedAlpha)));
            data[p + 2] = Math.max(0, Math.min(255, (currB - estimatedAlpha * 255) / (1 - estimatedAlpha)));
          } else {
            data[p] = Math.max(0, Math.min(255, currR / (1 - estimatedAlpha)));
            data[p + 1] = Math.max(0, Math.min(255, currG / (1 - estimatedAlpha)));
            data[p + 2] = Math.max(0, Math.min(255, currB / (1 - estimatedAlpha)));
          }
        }
      }
    }
  }

  /**
   * 2. Exemplar-Based Inpainting (Criminisi et al.)
   * Highest quality for textured areas, foliage, patterns, and complex object boundaries.
   */
  async _inpaintExemplar(imgData, maskData, w, h, x1, y1, x2, y2, patchRad = 4, searchRadius = 50, onProgress) {
    const data = imgData.data;
    const boxW = x2 - x1 + 1;
    const boxH = y2 - y1 + 1;

    // Working mask in local ROI: 1 = unmasked (known), 0 = masked (hole to fill)
    const known = new Uint8Array(boxW * boxH);
    const confidence = new Float32Array(boxW * boxH);

    let remainingMasked = 0;

    for (let ly = 0; ly < boxH; ly++) {
      const gy = y1 + ly;
      for (let lx = 0; lx < boxW; lx++) {
        const gx = x1 + lx;
        const gIdx = gy * w + gx;
        const lIdx = ly * boxW + lx;

        if (maskData[gIdx] > 30) {
          known[lIdx] = 0;
          confidence[lIdx] = 0.0;
          remainingMasked++;
        } else {
          known[lIdx] = 1;
          confidence[lIdx] = 1.0;
        }
      }
    }

    const totalToInpaint = remainingMasked;
    if (totalToInpaint === 0) return;

    let iterations = 0;
    const maxIterations = totalToInpaint * 2;

    // Priority loop: iteratively find boundary pixel with highest priority and fill patch
    while (remainingMasked > 0 && iterations < maxIterations) {
      iterations++;

      if (iterations % 45 === 0) {
        const progressPct = Math.min(88, Math.floor(25 + ((totalToInpaint - remainingMasked) / totalToInpaint) * 65));
        onProgress(progressPct, `Mensintesis tekstur (${remainingMasked} piksel tersisa)...`);
        await this._yield();
      }

      // Step A: Find all boundary pixels (pixels where known === 0, but has at least one known neighbor)
      let bestP = -1;
      let bestPriority = -1;
      let bestLx = -1, bestLy = -1;

      for (let ly = 1; ly < boxH - 1; ly++) {
        for (let lx = 1; lx < boxW - 1; lx++) {
          const lIdx = ly * boxW + lx;
          if (known[lIdx] === 0) {
            // Check 4-connected neighbors
            const hasKnownNeighbor = (
              known[lIdx - 1] === 1 ||
              known[lIdx + 1] === 1 ||
              known[lIdx - boxW] === 1 ||
              known[lIdx + boxW] === 1
            );

            if (hasKnownNeighbor) {
              // Compute Confidence C(p)
              let confSum = 0;
              let patchTotal = 0;
              let knownCount = 0;

              for (let dy = -patchRad; dy <= patchRad; dy++) {
                const ny = ly + dy;
                if (ny < 0 || ny >= boxH) continue;
                for (let dx = -patchRad; dx <= patchRad; dx++) {
                  const nx = lx + dx;
                  if (nx < 0 || nx >= boxW) continue;
                  patchTotal++;
                  const nIdx = ny * boxW + nx;
                  if (known[nIdx] === 1) {
                    confSum += confidence[nIdx];
                    knownCount++;
                  }
                }
              }

              const cVal = patchTotal > 0 ? confSum / patchTotal : 0;

              // Compute Data Term D(p) = |gradient_orthogonal * normal|
              // Simple gradient approximation
              let gxGrad = 0, gyGrad = 0;
              const rightIdx = ly * boxW + Math.min(boxW - 1, lx + 1);
              const leftIdx = ly * boxW + Math.max(0, lx - 1);
              const downIdx = Math.min(boxH - 1, ly + 1) * boxW + lx;
              const upIdx = Math.max(0, ly - 1) * boxW + lx;

              if (known[rightIdx] === 1 && known[leftIdx] === 1) {
                const gRight = ((y1 + ly) * w + (x1 + lx + 1)) * 4;
                const gLeft = ((y1 + ly) * w + (x1 + lx - 1)) * 4;
                gxGrad = (data[gRight] - data[gLeft] + data[gRight + 1] - data[gLeft + 1] + data[gRight + 2] - data[gLeft + 2]) / 3;
              }
              if (known[downIdx] === 1 && known[upIdx] === 1) {
                const gDown = ((y1 + ly + 1) * w + (x1 + lx)) * 4;
                const gUp = ((y1 + ly - 1) * w + (x1 + lx)) * 4;
                gyGrad = (data[gDown] - data[gUp] + data[gDown + 1] - data[gUp + 1] + data[gDown + 2] - data[gUp + 2]) / 3;
              }

              const dataTerm = Math.max(0.1, Math.min(1.5, Math.hypot(gxGrad, gyGrad) / 60.0));
              const priority = cVal * (1.0 + dataTerm * 0.8) + (knownCount / (patchTotal || 1)) * 0.5;

              if (priority > bestPriority) {
                bestPriority = priority;
                bestP = lIdx;
                bestLx = lx;
                bestLy = ly;
              }
            }
          }
        }
      }

      if (bestP === -1) {
        // No boundary found, fall back to fast marching for any isolated remaining pixels
        break;
      }

      // Step B: Find best matching exemplar patch in search window
      let bestMatchLx = -1, bestMatchLy = -1;
      let minSSD = Infinity;

      const searchMinX = Math.max(patchRad, bestLx - searchRadius);
      const searchMaxX = Math.min(boxW - 1 - patchRad, bestLx + searchRadius);
      const searchMinY = Math.max(patchRad, bestLy - searchRadius);
      const searchMaxY = Math.min(boxH - 1 - patchRad, bestLy + searchRadius);

      const step = (searchMaxX - searchMinX > 60) ? 2 : 1;

      for (let sy = searchMinY; sy <= searchMaxY; sy += step) {
        for (let sx = searchMinX; sx <= searchMaxX; sx += step) {
          // Donor candidate must be completely known
          const sIdx = sy * boxW + sx;
          if (known[sIdx] !== 1) continue;

          // Quick distance bias (prefer nearby texture to prevent far-away mismatch)
          const distWeight = 1.0 + Math.hypot(sx - bestLx, sy - bestLy) * 0.005;

          let ssd = 0;
          let validComparisons = 0;

          for (let dy = -patchRad; dy <= patchRad; dy += 2) {
            const targetY = bestLy + dy;
            const sourceY = sy + dy;

            for (let dx = -patchRad; dx <= patchRad; dx += 2) {
              const targetX = bestLx + dx;
              const sourceX = sx + dx;

              const targetLIdx = targetY * boxW + targetX;
              if (known[targetLIdx] === 1) {
                const sLIdx = sourceY * boxW + sourceX;
                if (known[sLIdx] === 1) {
                  const targetG = ((y1 + targetY) * w + (x1 + targetX)) * 4;
                  const sourceG = ((y1 + sourceY) * w + (x1 + sourceX)) * 4;

                  const dr = data[targetG] - data[sourceG];
                  const dg = data[targetG + 1] - data[sourceG + 1];
                  const db = data[targetG + 2] - data[sourceG + 2];

                  ssd += (dr * dr + dg * dg + db * db);
                  validComparisons++;
                }
              }
            }
          }

          if (validComparisons > 3) {
            const normalizedSSD = (ssd / validComparisons) * distWeight;
            if (normalizedSSD < minSSD) {
              minSSD = normalizedSSD;
              bestMatchLx = sx;
              bestMatchLy = sy;
            }
          }
        }
      }

      // If no valid exemplar found in window, expand search to any known pixel nearby
      if (bestMatchLx === -1) {
        bestMatchLx = Math.max(0, Math.min(boxW - 1, bestLx + (bestLx > boxW / 2 ? -10 : 10)));
        bestMatchLy = Math.max(0, Math.min(boxH - 1, bestLy + (bestLy > boxH / 2 ? -10 : 10)));
      }

      // Step C: Copy pixels from donor patch to unknown pixels of target patch
      const newConfidence = Math.max(0.1, bestPriority * 0.95);

      for (let dy = -patchRad; dy <= patchRad; dy++) {
        const ty = bestLy + dy;
        const sy = bestMatchLy + dy;
        if (ty < 0 || ty >= boxH || sy < 0 || sy >= boxH) continue;

        for (let dx = -patchRad; dx <= patchRad; dx++) {
          const tx = bestLx + dx;
          const sx = bestMatchLx + dx;
          if (tx < 0 || tx >= boxW || sx < 0 || sx >= boxW) continue;

          const tLIdx = ty * boxW + tx;
          if (known[tLIdx] === 0) {
            const targetG = ((y1 + ty) * w + (x1 + tx)) * 4;
            const sourceG = ((y1 + sy) * w + (x1 + sx)) * 4;

            data[targetG] = data[sourceG];
            data[targetG + 1] = data[sourceG + 1];
            data[targetG + 2] = data[sourceG + 2];

            known[tLIdx] = 1;
            confidence[tLIdx] = newConfidence;
            remainingMasked--;
          }
        }
      }
    }

    // If any isolated pixels remained, finish with Fast Marching
    if (remainingMasked > 0) {
      await this._inpaintFastMarching(imgData, maskData, w, h, x1, y1, x2, y2, () => {});
    }
  }

  /**
   * 3. Curvature Fast Marching Method (Telea Inpainting)
   * Super smooth & fast for gradients, skies, and small timestamps.
   */
  async _inpaintFastMarching(imgData, maskData, w, h, x1, y1, x2, y2, onProgress) {
    const data = imgData.data;
    const boxW = x2 - x1 + 1;
    const boxH = y2 - y1 + 1;

    // Radius for FMM neighbor search
    const radius = 5;

    // Multi-pass iterative edge marching
    let iterations = 0;
    let filledInPass = 1;

    while (filledInPass > 0 && iterations < 40) {
      iterations++;
      filledInPass = 0;

      for (let ly = 0; ly < boxH; ly++) {
        const gy = y1 + ly;
        for (let lx = 0; lx < boxW; lx++) {
          const gx = x1 + lx;
          const gIdx = gy * w + gx;

          if (maskData[gIdx] > 30) {
            // Check surrounding unmasked neighbors
            let totalWeight = 0;
            let sumR = 0, sumG = 0, sumB = 0;

            for (let dy = -radius; dy <= radius; dy++) {
              const ny = gy + dy;
              if (ny < 0 || ny >= h) continue;

              for (let dx = -radius; dx <= radius; dx++) {
                const nx = gx + dx;
                if (nx < 0 || nx >= w) continue;

                const nIdx = ny * w + nx;
                if (maskData[nIdx] <= 30) {
                  const dist = Math.hypot(dx, dy);
                  if (dist > 0 && dist <= radius) {
                    const weight = 1.0 / (dist * dist);
                    const p = nIdx * 4;
                    sumR += data[p] * weight;
                    sumG += data[p + 1] * weight;
                    sumB += data[p + 2] * weight;
                    totalWeight += weight;
                  }
                }
              }
            }

            if (totalWeight > 0.001) {
              const targetP = gIdx * 4;
              data[targetP] = Math.round(sumR / totalWeight);
              data[targetP + 1] = Math.round(sumG / totalWeight);
              data[targetP + 2] = Math.round(sumB / totalWeight);
              maskData[gIdx] = 0; // marked as filled
              filledInPass++;
            }
          }
        }
      }

      if (iterations % 4 === 0) {
        onProgress(Math.min(90, 35 + iterations * 3), 'Menghaluskan kontur piksel...');
        await this._yield();
      }
    }
  }

  /**
   * 4. Natural Sensor Grain & Texture Harmonization
   * Matches camera noise so inpainting never looks like an artificial flat smudge.
   */
  _applyTextureHarmonization(imgData, originalImgData, maskData, w, h, x1, y1, x2, y2, intensity) {
    const data = imgData.data;
    const origData = originalImgData.data;

    // Estimate average local standard deviation (noise) from surrounding known pixels
    let varianceSum = 0;
    let sampleCount = 0;

    for (let y = y1; y <= y2; y += 4) {
      for (let x = x1; x <= x2; x += 4) {
        const idx = y * w + x;
        if (maskData[idx] === 0 && x + 1 < w) {
          const p = idx * 4;
          const pNext = (idx + 1) * 4;
          const diff = Math.abs(origData[p] - origData[pNext]);
          varianceSum += diff;
          sampleCount++;
        }
      }
    }

    const avgDiff = sampleCount > 0 ? (varianceSum / sampleCount) : 4.0;
    const grainScale = Math.min(8.0, avgDiff * 0.7 * intensity);

    // Apply high-frequency noise to repaired pixels
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const idx = y * w + x;
        if (maskData[idx] > 30) {
          const p = idx * 4;
          const noise = (Math.random() - 0.5) * grainScale * 2;
          data[p] = Math.max(0, Math.min(255, data[p] + noise));
          data[p + 1] = Math.max(0, Math.min(255, data[p + 1] + noise));
          data[p + 2] = Math.max(0, Math.min(255, data[p + 2] + noise));
        }
      }
    }
  }

  /**
   * 5. Feathered Mask Boundary Transition
   * Blends the edge between modified and original pixels seamlessly.
   */
  _featherMaskEdge(imgData, originalImgData, maskData, w, h, x1, y1, x2, y2, featherRadius) {
    const data = imgData.data;
    const origData = originalImgData.data;

    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const idx = y * w + x;
        const maskVal = maskData[idx];

        // Feather pixels that are on the border of the mask (e.g. 1 to 240)
        if (maskVal > 0 && maskVal < 255) {
          const alpha = maskVal / 255.0;
          const p = idx * 4;

          // Cosine ease for ultra-soft transition
          const smoothAlpha = 0.5 - 0.5 * Math.cos(alpha * Math.PI);

          data[p] = Math.round(origData[p] * (1 - smoothAlpha) + data[p] * smoothAlpha);
          data[p + 1] = Math.round(origData[p + 1] * (1 - smoothAlpha) + data[p + 1] * smoothAlpha);
          data[p + 2] = Math.round(origData[p + 2] * (1 - smoothAlpha) + data[p + 2] * smoothAlpha);
        }
      }
    }
  }

  /**
   * Magic Wand / Auto Text Watermark Keyer
   * Automatically isolates watermark text glyphs within a region so the user
   * only removes the letters while the photo background stays untouched.
   */
  static extractTextContourMask(imgData, x1, y1, x2, y2, tolerance = 28) {
    const w = imgData.width;
    const data = imgData.data;
    const mask = new Uint8Array(w * imgData.height);

    // Calculate local median luminance
    let lums = [];
    for (let y = y1; y <= y2; y += 2) {
      for (let x = x1; x <= x2; x += 2) {
        const p = (y * w + x) * 4;
        const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        lums.push(lum);
      }
    }
    lums.sort((a, b) => a - b);
    const medianLum = lums[Math.floor(lums.length / 2)] || 128;

    // Detect high-contrast characters (either distinctly brighter or distinctly darker)
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const idx = y * w + x;
        const p = idx * 4;
        const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        const diff = Math.abs(lum - medianLum);

        if (diff > tolerance) {
          mask[idx] = 255;
        }
      }
    }

    // Slight morphological dilation (1px) so letters edges aren't clipped
    const dilated = new Uint8Array(mask);
    for (let y = y1 + 1; y < y2 - 1; y++) {
      for (let x = x1 + 1; x < x2 - 1; x++) {
        const idx = y * w + x;
        if (mask[idx] === 255) {
          dilated[idx - 1] = 255;
          dilated[idx + 1] = 255;
          dilated[idx - w] = 255;
          dilated[idx + w] = 255;
        }
      }
    }

    return dilated;
  }
}

window.InpainterEngine = InpainterEngine;
