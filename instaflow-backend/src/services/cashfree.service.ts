import crypto from 'crypto';
import logger from '../utils/logger';

const CASHFREE_CONFIG = {
    appId: process.env.CASHFREE_APP_ID || '',
    secretKey: process.env.CASHFREE_SECRET_KEY || '',
    environment: (process.env.CASHFREE_ENVIRONMENT || 'TEST') as 'TEST' | 'PROD',
};

const API_BASE = CASHFREE_CONFIG.environment === 'PROD'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

export class CashfreeService {
    static async createSubscriptionCheckout(params: any) {
        const orderId = `order_${params.tenantId}_${Date.now()}`;
        const requestBody = {
            order_id: orderId,
            order_amount: params.amount / 100,
            order_currency: 'INR',
            customer_details: {
                customer_id: params.tenantId,
                customer_email: params.customerEmail,
                customer_phone: params.customerPhone,
                customer_name: params.customerName || params.customerEmail,
            },
            order_meta: {
                return_url: `${params.successUrl}?order_id={order_id}`,
                notify_url: `${process.env.BACKEND_URL}/subscription/cashfree-webhook`,
            },
            order_tags: { tenantId: params.tenantId, planId: params.planId },
        };

        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-version': '2023-08-01',
                'x-client-id': CASHFREE_CONFIG.appId,
                'x-client-secret': CASHFREE_CONFIG.secretKey,
            },
            body: JSON.stringify(requestBody),
        });

        const data: any = await response.json();
        if (!response.ok) throw new Error(data.message || 'Cashfree failure');

        return {
            paymentLink: data.payment_session_id
                ? `${CASHFREE_CONFIG.environment === 'PROD' ? 'https://payments.cashfree.com' : 'https://sandbox.cashfree.com/pg'}/links/${data.payment_session_id}`
                : data.payment_link || '',
            orderId,
            cfOrderId: data.cf_order_id,
        };
    }

    static async cancelSubscription(subscriptionId: string) {
        try {
            const response = await fetch(`${API_BASE}/subscriptions/${subscriptionId}/cancel`, {
                method: 'POST',
                headers: {
                    'x-client-id': CASHFREE_CONFIG.appId,
                    'x-client-secret': CASHFREE_CONFIG.secretKey,
                },
            });
            return response.ok;
        } catch (error) {
            logger.error({ err: error }, 'Cashfree cancellation failed');
            return false;
        }
    }
}
