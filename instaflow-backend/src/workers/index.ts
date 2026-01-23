import { startUnifiedWorker } from "./unified.worker";

// Start workers if this file is loaded (usually in local dev)
startUnifiedWorker().catch((err) => console.error("[Worker] Failed to start:", err));