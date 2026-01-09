# IntelliRoad

IntelliRoad is a lightweight platform that shows how real-time road intelligence can be built using edge data, cloud processing, and verifiable integrity.

The app simulates collecting road observations from a mobile or in-vehicle device, extracts compact features instead of raw video, hashes them on-device, and sends them to a backend for validation and storage. Each observation can optionally be anchored on-chain to prove authenticity and prevent tampering, without exposing sensitive raw data.

IntelliRoad demonstrates how edge AI, async pipelines, and blockchain can work together to create scalable, privacy-aware, and trustworthy urban mapping systems.

## Folders:
- `apps/frontend` React + Vite
- `apps/backend` Node.js + Express + SQLite
- `packages/contracts` Hardhat + Solidity

## Quickstart (Node 18+):
1) `npm install`
2) `npm run dev` (starts backend + frontend)
3) (Optional) Deploy contract: `npm run deploy:local`

## Notes:
- Backend default: `http://localhost:4000`
- Frontend default: `http://localhost:5173`
