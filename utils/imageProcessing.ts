import { loadOpenCv } from './opencvLoader';

// Utility to crop specific corners from a base64 or Image source
export const cropImageCorners = async (base64Image: string): Promise<{ leftCorner: string, rightCorner: string }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            // We want roughly the bottom 15-20% height and 25-30% width for corners
            const width = img.width;
            const height = img.height;
            const cropWidth = Math.floor(width * 0.35);
            const cropHeight = Math.floor(height * 0.20);

            // 1. Bottom Left Crop
            canvas.width = cropWidth;
            canvas.height = cropHeight;
            // Draw the bottom-left portion: source x=0, y=height-cropHeight
            ctx.drawImage(img, 0, height - cropHeight, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            const leftCorner = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

            // 2. Bottom Right Crop
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Draw bottom-right portion: source x=width-cropWidth, y=height-cropHeight
            ctx.drawImage(img, width - cropWidth, height - cropHeight, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            const rightCorner = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

            resolve({ leftCorner, rightCorner });
        };
        img.onerror = reject;
        img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    });
};

// Helper to order points as TL, TR, BR, BL
function orderPoints(pts: {x:number, y:number}[]) {
    // Sort by Y to find top 2 and bottom 2
    pts.sort((a,b) => a.y - b.y);
    
    // Grab top 2 and sort by X to get TL, TR
    const top = pts.slice(0, 2).sort((a,b) => a.x - b.x); 
    const tl = top[0];
    const tr = top[1];
    
    // Grab bottom 2 and sort by X to get BL, BR
    // Note: Standard perspective transform expects TL, TR, BR, BL order
    const bottom = pts.slice(2, 4).sort((a,b) => a.x - b.x);
    const bl = bottom[0];
    const br = bottom[1];
    
    return [tl, tr, br, bl];
}

/**
 * Automagically crops the image to the card boundaries using OpenCV.js with Perspective Transform.
 * Returns null if no card is reliably detected, signaling a fallback to manual crop.
 */
export const autoCropCard = async (base64Image: string): Promise<string | null> => {
    const cv = await loadOpenCv();

    if (!cv) {
        console.warn('OpenCV not available, skipping auto-crop');
        return null;
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                const src = cv.imread(img);

                const dsize = new cv.Size(0, 0);
                const maxDim = 900;
                const scale = Math.min(maxDim / src.cols, maxDim / src.rows, 1);
                const work = new cv.Mat();

                if (scale < 1) {
                    cv.resize(src, work, dsize, scale, scale, cv.INTER_AREA);
                } else {
                    src.copyTo(work);
                }

                const gray = new cv.Mat();
                cv.cvtColor(work, gray, cv.COLOR_RGBA2GRAY, 0);

                const blurred = new cv.Mat();
                cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

                const edges = new cv.Mat();
                cv.Canny(blurred, edges, 40, 130);

                const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
                const morph = new cv.Mat();
                cv.morphologyEx(edges, morph, cv.MORPH_CLOSE, kernel);
                cv.dilate(morph, morph, kernel);

                const contours = new cv.MatVector();
                const hierarchy = new cv.Mat();
                cv.findContours(morph, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

                const minArea = (work.cols * work.rows) * 0.06;
                const targetRatio = 2.5 / 3.5;
                const ratioTolerance = 0.22;

                const quadFromContour = (cnt: any): any | null => {
                    const peri = cv.arcLength(cnt, true);
                    const approx = new cv.Mat();
                    cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
                    if (approx.rows === 4 && cv.isContourConvex(approx)) return approx;
                    approx.delete();
                    return null;
                };

                const rectPointsMat = (cnt: any): any | null => {
                    try {
                        const rotated = cv.minAreaRect(cnt);
                        if (cv.RotatedRect?.points) {
                            const pts = cv.RotatedRect.points(rotated);
                            const arr = [pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y];
                            return cv.matFromArray(4, 1, cv.CV_32SC2, arr);
                        }
                        if (cv.boxPoints) {
                            const box = new cv.Mat();
                            cv.boxPoints(rotated, box);
                            const approx = new cv.Mat();
                            box.convertTo(approx, cv.CV_32SC2);
                            box.delete();
                            return approx;
                        }
                    } catch (e) {
                        return null;
                    }
                    return null;
                };

                const contourScore = (cnt: any, area: number): { score: number; ratioDelta: number } => {
                    const rect = cv.minAreaRect(cnt);
                    const w = Math.max(1, rect.size.width);
                    const h = Math.max(1, rect.size.height);
                    const ratio = Math.min(w, h) / Math.max(w, h);
                    const ratioDelta = Math.abs(ratio - targetRatio);
                    if (ratioDelta > ratioTolerance) return { score: -1, ratioDelta };

                    const rectArea = w * h;
                    const fill = rectArea > 0 ? area / rectArea : 0;
                    const normArea = area / (work.cols * work.rows);
                    const score = (normArea * 2.2) + ((1 - ratioDelta / ratioTolerance) * 1.2) + (Math.min(fill, 1) * 0.8);
                    return { score, ratioDelta };
                };

                let bestQuad: any = null;
                let bestScore = -1;

                for (let i = 0; i < contours.size(); ++i) {
                    const cnt = contours.get(i);
                    const area = cv.contourArea(cnt);
                    if (area < minArea) {
                        cnt.delete();
                        continue;
                    }

                    const scored = contourScore(cnt, area);
                    if (scored.score < 0) {
                        cnt.delete();
                        continue;
                    }

                    const quad = quadFromContour(cnt) || rectPointsMat(cnt);
                    if (quad && scored.score > bestScore) {
                        if (bestQuad) bestQuad.delete();
                        bestQuad = quad;
                        bestScore = scored.score;
                    } else if (quad) {
                        quad.delete();
                    }

                    cnt.delete();
                }

                let resultBase64: string | null = null;

                if (bestQuad) {
                    const points = [];
                    for (let i = 0; i < 4; i++) {
                        points.push({
                            x: bestQuad.data32S[i * 2],
                            y: bestQuad.data32S[i * 2 + 1]
                        });
                    }

                    const scaledPoints = points.map(p => ({ x: p.x / scale, y: p.y / scale }));
                    const [tl, tr, br, bl] = orderPoints(scaledPoints);

                    const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
                    const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
                    const maxWidth = Math.max(widthA, widthB);

                    const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
                    const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
                    const maxHeight = Math.max(heightA, heightB);
                    const targetWidth = Math.max(1, Math.round(maxWidth));
                    const targetHeight = Math.max(1, Math.round(maxHeight));
                    const warpArea = targetWidth * targetHeight;
                    const outputRatio = maxWidth > 0 && maxHeight > 0 ? Math.min(maxWidth, maxHeight) / Math.max(maxWidth, maxHeight) : 0;
                    const ratioDelta = Math.abs(outputRatio - targetRatio);

                    if (ratioDelta <= ratioTolerance && warpArea >= (src.cols * src.rows) * 0.08) {
                        const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                            0, 0,
                            targetWidth, 0,
                            targetWidth, targetHeight,
                            0, targetHeight
                        ]);

                        const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                            tl.x, tl.y,
                            tr.x, tr.y,
                            br.x, br.y,
                            bl.x, bl.y
                        ]);

                        const M = cv.getPerspectiveTransform(srcTri, dstTri);
                        const warped = new cv.Mat();
                        cv.warpPerspective(src, warped, M, new cv.Size(targetWidth, targetHeight), cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar());

                        const canvas = document.createElement('canvas');
                        cv.imshow(canvas, warped);
                        resultBase64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];

                        M.delete(); warped.delete(); srcTri.delete(); dstTri.delete();
                    }

                    bestQuad.delete();
                }

                src.delete(); work.delete(); gray.delete(); blurred.delete(); edges.delete();
                contours.delete(); hierarchy.delete(); morph.delete(); kernel.delete();

                resolve(resultBase64);
            } catch (e) {
                console.error("AutoCrop Error", e);
                resolve(null);
            }
        };

        img.onerror = () => resolve(null);
        img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    });
};

/**
 * Performs a manual perspective crop based on the provided normalized quadrilateral points (0-1).
 */
export const performPerspectiveWarp = async (base64Image: string, points: {x: number, y: number}[]): Promise<string> => {
    const cv = await loadOpenCv();

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (cv) {
                try {
                    const src = cv.imread(img);
                    
                    // Convert relative points to absolute pixel coordinates
                    const pixelPoints = points.map(p => ({
                        x: p.x * img.width,
                        y: p.y * img.height
                    }));

                    // Ensure points are ordered TL, TR, BR, BL
                    const [tl, tr, br, bl] = orderPoints(pixelPoints);

                    // Calculate destination dimensions
                    const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
                    const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
                    const maxWidth = Math.max(widthA, widthB);

                    const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
                    const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
                    const maxHeight = Math.max(heightA, heightB);

                    // Perspective Transform
                    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                        0, 0,
                        maxWidth, 0,
                        maxWidth, maxHeight,
                        0, maxHeight
                    ]);

                    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
                        tl.x, tl.y,
                        tr.x, tr.y,
                        br.x, br.y,
                        bl.x, bl.y
                    ]);

                    const M = cv.getPerspectiveTransform(srcTri, dstTri);
                    const warped = new cv.Mat();
                    const dsize = new cv.Size(maxWidth, maxHeight);
                    
                    cv.warpPerspective(src, warped, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

                    const canvas = document.createElement('canvas');
                    cv.imshow(canvas, warped);
                    
                    // Cleanup
                    src.delete(); warped.delete(); M.delete(); srcTri.delete(); dstTri.delete();
                    
                    resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
                    return;
                } catch (e) {
                    console.error("Manual Warp CV Error", e);
                    // Fallthrough to standard canvas crop below
                }
            }

            // Fallback: Simple Axis-Aligned Crop
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Canvas context unavailable"));
                return;
            }

            const pxPoints = points.map(p => ({
                x: p.x * img.width,
                y: p.y * img.height
            }));

            const minX = Math.min(...pxPoints.map(p => p.x));
            const minY = Math.min(...pxPoints.map(p => p.y));
            const maxX = Math.max(...pxPoints.map(p => p.x));
            const maxY = Math.max(...pxPoints.map(p => p.y));
            
            const width = Math.max(1, maxX - minX);
            const height = Math.max(1, maxY - minY);

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, minX, minY, width, height, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
        };
        img.onerror = (e) => reject(e);
        img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    });
};

// --- CORE COMPUTER VISION PIPELINE UTILS ---

/**
 * Converts image data to grayscale array (0-255)
 */
export const convertToGrayscale = (imageData: ImageData): Uint8Array => {
    const { data, width, height } = imageData;
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        // Luminance formula: 0.299R + 0.587G + 0.114B
        gray[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    return gray;
};

/**
 * Binarizes grayscale image using Adaptive Thresholding (Integral Image method for speed).
 */
export const adaptiveThreshold = (gray: Uint8Array, width: number, height: number, windowSize: number = 15, c: number = 5): Uint8Array => {
    const binary = new Uint8Array(width * height);
    const integral = new Int32Array(width * height);

    // 1. Compute Integral Image
    for (let y = 0; y < height; y++) {
        let sum = 0;
        for (let x = 0; x < width; x++) {
            sum += gray[y * width + x];
            if (y === 0) {
                integral[y * width + x] = sum;
            } else {
                integral[y * width + x] = integral[(y - 1) * width + x] + sum;
            }
        }
    }

    // 2. Threshold
    const s2 = Math.floor(windowSize / 2);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const x1 = Math.max(x - s2, 0);
            const x2 = Math.min(x + s2, width - 1);
            const y1 = Math.max(y - s2, 0);
            const y2 = Math.min(y + s2, height - 1);
            
            const count = (x2 - x1 + 1) * (y2 - y1 + 1);
            
            // Calculate sum of window using integral image (O(1))
            const A = integral[y2 * width + x2];
            const B = y1 > 0 ? integral[(y1 - 1) * width + x2] : 0;
            const C = x1 > 0 ? integral[y2 * width + (x1 - 1)] : 0;
            const D = (y1 > 0 && x1 > 0) ? integral[(y1 - 1) * width + (x1 - 1)] : 0;
            
            const sum = A - B - C + D;
            const mean = sum / count;

            binary[y * width + x] = gray[y * width + x] <= (mean - c) ? 0 : 255;
        }
    }
    return binary;
};

/**
 * Converts a base64 image to a binarized (B/W) base64 image using adaptive thresholding.
 */
export const binarizeBase64 = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const w = img.width;
            const h = img.height;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if(!ctx) return resolve(base64);

            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, w, h);
            const gray = convertToGrayscale(imgData);
            const bin = adaptiveThreshold(gray, w, h, 25, 10); 
            
            for (let i = 0; i < bin.length; i++) {
                const val = bin[i];
                imgData.data[i * 4] = val;
                imgData.data[i * 4 + 1] = val;
                imgData.data[i * 4 + 2] = val;
                imgData.data[i * 4 + 3] = 255;
            }
            ctx.putImageData(imgData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        };
        img.onerror = () => resolve(base64);
        img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    });
};

/**
 * Computes a Difference Hash (dHash) from image data.
 */
export const computeDHash = (imageData: ImageData): string => {
    const { data, width } = imageData;
    let hash = '';
    
    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < width - 1; x++) {
            const idxLeft = (y * width + x) * 4;
            const idxRight = (y * width + (x + 1)) * 4;
            const valLeft = data[idxLeft + 1]; 
            const valRight = data[idxRight + 1];
            hash += (valLeft < valRight) ? '1' : '0';
        }
    }
    return hash;
};

/**
 * Extracts normalized ID strips (Bottom-Left and Bottom-Right) from a full card image.
 */
export const extractIDStrips = async (imageUrl: string): Promise<{ bl: ImageData | null, br: ImageData | null }> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve({ bl: null, br: null });

            const scale = 800 / img.height;
            const w = img.width * scale;
            const h = 800;
            
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);

            const stripH = Math.floor(h * 0.12);
            const stripW = Math.floor(w * 0.35);
            
            const blData = ctx.getImageData(0, h - stripH, stripW, stripH);
            const brData = ctx.getImageData(w - stripW, h - stripH, stripW, stripH);

            const processForHash = (source: ImageData) => {
                const tmpCanvas = document.createElement('canvas');
                tmpCanvas.width = 33; 
                tmpCanvas.height = 32;
                const tmpCtx = tmpCanvas.getContext('2d');
                if(!tmpCtx) return null;
                
                const sCanvas = document.createElement('canvas');
                sCanvas.width = source.width;
                sCanvas.height = source.height;
                sCanvas.getContext('2d')?.putImageData(source, 0, 0);
                
                tmpCtx.drawImage(sCanvas, 0, 0, 33, 32);
                
                const resized = tmpCtx.getImageData(0, 0, 33, 32);
                const gray = convertToGrayscale(resized);
                const bin = adaptiveThreshold(gray, 33, 32, 7, 2);
                
                for(let i=0; i<bin.length; i++) {
                    const val = bin[i];
                    resized.data[i*4] = val;
                    resized.data[i*4+1] = val;
                    resized.data[i*4+2] = val;
                    resized.data[i*4+3] = 255;
                }
                return resized;
            };

            resolve({
                bl: processForHash(blData),
                br: processForHash(brData)
            });
        };
        img.onerror = () => resolve({ bl: null, br: null });
        img.src = imageUrl;
    });
};

export const calculateHammingDistance = (hash1: string, hash2: string): number => {
    if (hash1.length !== hash2.length) return 1000;
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
};

// Maintained for compatibility with UserProfile processImageUpload
export const processImageUpload = async (file: File, options: { targetWidth: number; aspectRatio: number }): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context unavailable"));
                    return;
                }
                
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                const sourceAspect = img.width / img.height;
                let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

                if (sourceAspect > options.aspectRatio) {
                    sWidth = img.height * options.aspectRatio;
                    sx = (img.width - sWidth) / 2;
                } else {
                    sHeight = img.width / options.aspectRatio;
                    sy = (img.height - sHeight) / 2;
                }
                canvas.width = options.targetWidth;
                canvas.height = options.targetWidth / options.aspectRatio;
                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85); 
                resolve(dataUrl);
            };
            img.onerror = (e) => reject(new Error("Failed to load image"));
        };
        reader.onerror = (e) => reject(e);
    });
};
