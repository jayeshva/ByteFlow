import DodoPayments from 'dodopayments';
import { config } from '../config';
import logger from '../utils/logger';

const dodo = new DodoPayments({
    bearerToken: process.env.DODO_API_KEY,
    environment: (process.env.DODO_ENVIRONMENT as 'test_mode' | 'live_mode') || 'test_mode',
});

export interface CreateCheckoutParams {
    planId: string;
    dodoProductId: string;
    tenantId: string;
    customerId?: string;
    customerEmail: string;
    customerName?: string;
    successUrl: string;
    cancelUrl?: string;
}

export class DodoService {
    static async createSubscriptionCheckout(params: CreateCheckoutParams) {
        const payment = await dodo.payments.create({
            billing: { country: 'IN', city: '', state: '', street: '', zipcode: '' },
            customer: { email: params.customerEmail, name: params.customerName || params.customerEmail },
            product_cart: [{ product_id: params.dodoProductId, quantity: 1 }],
            return_url: params.successUrl,
            metadata: { tenantId: params.tenantId, planId: params.planId },
        });

        return {
            paymentLink: payment.payment_link || '',
            customerId: payment.customer?.customer_id,
        };
    }

    static async cancelSubscription(subscriptionId: string) {
        try {
            await dodo.subscriptions.update(subscriptionId, { status: 'cancelled' });
            return true;
        } catch (error) {
            logger.error({ err: error }, 'Dodo cancellation failed');
            return false;
        }
    }

    static async getCustomerPortalLink(customerId: string) {
        const baseUrl = process.env.DODO_ENVIRONMENT === 'live_mode'
            ? 'https://app.dodopayments.com'
            : 'https://sandbox.dodopayments.com';
        return `${baseUrl}/portal/${customerId}`;
    }
}
