const OPENCV_URL = 'https://docs.opencv.org/4.8.0/opencv.js';

let cvLoadPromise: Promise<any | null> | null = null;

const isCvReady = (cv: any): boolean => Boolean(cv && typeof cv.Mat === 'function');

export const loadOpenCv = async (): Promise<any | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  // @ts-ignore
  if (isCvReady(window.cv)) {
    // @ts-ignore
    return window.cv;
  }

  if (!cvLoadPromise) {
    cvLoadPromise = new Promise((resolve, reject) => {
      const createScript = () => {
        const script = document.createElement('script');
        script.async = true;
        script.src = OPENCV_URL;
        script.dataset.opencvSrc = OPENCV_URL;
        script.onload = () => {
          script.dataset.loaded = 'true';
          script.dataset.failed = 'false';
          onLoaded();
        };
        script.onerror = () => {
          script.dataset.failed = 'true';
          reject(new Error('Failed to load OpenCV script'));
        };
        document.head.appendChild(script);
      };

      const existingScript = document.querySelector<HTMLScriptElement>(`script[data-opencv-src="${OPENCV_URL}"]`);

      const onLoaded = () => {
        // @ts-ignore
        if (isCvReady(window.cv)) {
          // @ts-ignore
          resolve(window.cv);
          return;
        }

        // @ts-ignore
        if (window.cv) {
          // @ts-ignore
          window.cv.onRuntimeInitialized = () => {
            // @ts-ignore
            resolve(window.cv);
          };
          return;
        }

        reject(new Error('OpenCV script loaded but window.cv is unavailable'));
      };

      if (existingScript) {
        if (existingScript.dataset.failed === 'true') {
          existingScript.remove();
          createScript();
          return;
        }

        if (existingScript.dataset.loaded === 'true') {
          onLoaded();
        } else {
          existingScript.addEventListener('load', onLoaded, { once: true });
          existingScript.addEventListener('error', () => {
            existingScript.dataset.failed = 'true';
            reject(new Error('Failed to load OpenCV script'));
          }, { once: true });
        }
        return;
      }

      createScript();
    }).catch((error) => {
      console.error(error);
      cvLoadPromise = null;
      return null;
    });
  }

  return cvLoadPromise;
};
