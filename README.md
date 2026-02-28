

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `VITE_GEMINI_API_KEY` in `.env.local` (or `.env`)
3. Run the app:
   `npm run dev`


## Environment & security

- This is a Vite client app. Any `VITE_*` variables are bundled into client-side JavaScript and are **not secrets**.
- `VITE_GEMINI_API_KEY` is suitable for local demos only. For production, call Gemini through a backend/proxy and keep keys server-side.

## Scripts

- `npm run dev` – start local development server
- `npm run build` – production build
- `npm run preview` – preview the built app
- `npm run verify` – duplicate symbol check + build

## Code organization

- See `docs/CODEBASE_MAP.md` for a grouped map of files/folders by purpose and a prioritized cleanup backlog.

