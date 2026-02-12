<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ZltNrahY6OjPFCTlYpy_m4V-iBkpfGuK

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` (or copy from `.env.example`) and set required environment variables:
   - `VITE_API_KEY` (required): shared API key used by app services (Gemini + Pokemon TCG API)
3. Run the app:
   `npm run dev`

## Environment Variables

- `VITE_API_KEY` (**required**) - canonical API key environment variable read by `getEnv('API_KEY')`.
  - This value powers Pokemon TCG API requests.
  - If missing, TCG data calls intentionally degrade and log a user-facing setup message instead of using embedded credentials.
