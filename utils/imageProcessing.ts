
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

/**
 * Automagically crops the image to the card boundaries using OpenCV.js.
 * Falls back to original image if OpenCV is not loaded or detection fails.
 */
export const autoCropCard = async (base64Image: string): Promise<string> => {
    return new Promise((resolve) => {
        // @ts-ignore
        if (typeof window === 'undefined' || !window.cv) {
            console.warn("OpenCV not loaded, skipping auto-crop");
            return resolve(base64Image);
        }

        const img = new Image();
        img.onload = () => {
            try {
                // @ts-ignore
                const cv = window.cv;
                const src = cv.imread(img);
                const gray = new cv.Mat();
                cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
                
                const blurred = new cv.Mat();
                cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
                
                const edges = new cv.Mat();
                cv.Canny(blurred, edges, 75, 200);
                
                const contours = new cv.MatVector();
                const hierarchy = new cv.Mat();
                cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

                let maxArea = 0;
                let maxContour = null;

                for (let i = 0; i < contours.size(); ++i) {
                    const cnt = contours.get(i);
                    const area = cv.contourArea(cnt);
                    if (area > maxArea) {
                        maxArea = area;
                        maxContour = cnt;
                    }
                }

                // Threshold: Contour must cover at least 10% of the image to be considered a card
                if (maxContour && maxArea > (src.cols * src.rows * 0.1)) {
                    const rect = cv.boundingRect(maxContour);
                    // Use Region of Interest (ROI) to crop
                    const dst = src.roi(rect);
                    
                    const canvas = document.createElement('canvas');
                    cv.imshow(canvas, dst);
                    
                    // Cleanup
                    dst.delete();
                    
                    // Convert back to base64 (strip prefix)
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    resolve(dataUrl.split(',')[1]);
                } else {
                    resolve(base64Image);
                }

                // Cleanup memory
                src.delete(); gray.delete(); blurred.delete(); edges.delete(); contours.delete(); hierarchy.delete();
            } catch (e) {
                console.error("OpenCV Crop Failed", e);
                resolve(base64Image);
            }
        };
        img.onerror = () => resolve(base64Image);
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
 * Useful for extracting ID text/symbols regardless of lighting.
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

            // If pixel < mean - C, it's black (0), else white (255)
            // Standard image: 0=black, 255=white.
            binary[y * width + x] = gray[y * width + x] <= (mean - c) ? 0 : 255;
        }
    }
    return binary;
};

/**
 * Converts a base64 image to a binarized (B/W) base64 image using adaptive thresholding.
 * Optimizes text for OCR.
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
            const bin = adaptiveThreshold(gray, w, h, 25, 10); // Tuned window/C for text
            
            // Write back
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
 * Ideal for "ID Strip Signatures" as it captures structural gradients.
 */
export const computeDHash = (imageData: ImageData): string => {
    // 1. Resize to small size (e.g. 33x32 for 32x32 hash)
    // We assume the input imageData is already the ROI we want to hash
    const { data, width } = imageData;
    let hash = '';
    
    // We iterate rows. For each row, compare pixel[x] < pixel[x+1]
    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < width - 1; x++) {
            const idxLeft = (y * width + x) * 4;
            const idxRight = (y * width + (x + 1)) * 4;
            
            // Use Green channel or Avg for speed
            const valLeft = data[idxLeft + 1]; 
            const valRight = data[idxRight + 1];
            
            hash += (valLeft < valRight) ? '1' : '0';
        }
    }
    return hash;
};

/**
 * Extracts normalized ID strips (Bottom-Left and Bottom-Right) from a full card image.
 * Returns resized ImageData ready for hashing.
 */
export const extractIDStrips = async (imageUrl: string): Promise<{ bl: ImageData | null, br: ImageData | null }> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve({ bl: null, br: null });

            // Standardize scaling (e.g. height=800) to ensure consistent feature extraction
            const scale = 800 / img.height;
            const w = img.width * scale;
            const h = 800;
            
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);

            // Strip Parameters (Bottom 12%, Width 35%)
            const stripH = Math.floor(h * 0.12);
            const stripW = Math.floor(w * 0.35);
            
            // Extract BL
            const blData = ctx.getImageData(0, h - stripH, stripW, stripH);
            
            // Extract BR
            const brData = ctx.getImageData(w - stripW, h - stripH, stripW, stripH);

            // Pre-process for hashing (Resize to 33x32)
            const processForHash = (source: ImageData) => {
                const tmpCanvas = document.createElement('canvas');
                tmpCanvas.width = 33; // +1 for difference calc
                tmpCanvas.height = 32;
                const tmpCtx = tmpCanvas.getContext('2d');
                if(!tmpCtx) return null;
                
                // Create temp canvas to hold source data
                const sCanvas = document.createElement('canvas');
                sCanvas.width = source.width;
                sCanvas.height = source.height;
                sCanvas.getContext('2d')?.putImageData(source, 0, 0);
                
                // Draw resized
                tmpCtx.drawImage(sCanvas, 0, 0, 33, 32);
                
                // Binarize (Optional but helps dHash stability on ID text)
                const resized = tmpCtx.getImageData(0, 0, 33, 32);
                const gray = convertToGrayscale(resized);
                const bin = adaptiveThreshold(gray, 33, 32, 7, 2);
                
                // Write binary back to ImageData for visual debugging (optional) or dHash
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

// --- ORIGINAL HELPERS (Maintained for compatibility) ---

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

                // Center Crop Logic
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

/**
 * Performs a crop based on the provided quadrilateral points.
 */
export const performPerspectiveWarp = async (base64Image: string, points: {x: number, y: number}[]): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
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

            ctx.drawImage(
                img, 
                minX, minY, width, height, 
                0, 0, width, height
            );

            resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
        };
        img.onerror = (e) => reject(e);
        img.src = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
    });
};
