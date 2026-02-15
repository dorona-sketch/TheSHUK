/**
 * @deprecated This service has been fully superseded by CardRecognitionService and geminiService.
 * Please use CardRecognitionService.identify() for all identification tasks.
 */
// Temporary shim to prevent runtime crashes while migrating imports.
// Importers should switch to: `import { CardRecognitionService } from "./src/services/CardRecognitionService"`.
// This shim logs a deprecation warning and exposes a no-op interface.

export const visionService = new Proxy({}, {
  get() {
    console.warn('[DEPRECATED] visionService is deprecated. Use CardRecognitionService instead.')
    return () => {
      console.warn('[DEPRECATED] visionService method called. No-op. Use CardRecognitionService.identify().')
      return undefined
    }
  }
})

