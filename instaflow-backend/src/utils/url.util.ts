import { config } from '../config';

export class UrlUtil {
    /**
     * Generates a tracking URL for a CTA button.
     * The trackingId is a base64url encoded string of "automationId:buttonId".
     */
    static generateTrackingUrl(automationId: string, buttonId: string): string {
        const payload = `${automationId}:${buttonId}`;
        const trackingId = Buffer.from(payload, 'utf-8').toString('base64url');

        // Ensure FRONTEND_URL doesn't have a trailing slash for consistency
        const baseUrl = config.FRONTEND_URL.replace(/\/$/, '');

        // The redirection endpoint is on the backend, but often proxied or reached via BASE_URL
        // Since the backend handles /api/analytics/r/:trackingId, we point there.
        // If the frontend proxies /api to backend, this works.
        // Usually, in this architecture, API_URL or BACKEND_URL would be better.
        // Let's assume the API is reachable at FRONTEND_URL/api or we use a separate BACKEND_URL if available.
        // Looking at analytics.routes.ts, it's mounted under /api/analytics.

        return `${baseUrl}/api/analytics/r/${trackingId}`;
    }
}
