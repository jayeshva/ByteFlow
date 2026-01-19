import crypto from 'crypto';

/**
 * Cashfree Payment Gateway Service
 * 
 * Provides integration with Cashfree Payments for subscriptions.
 * Uses Cashfree PG SDK for payment link creation and subscription management.
 */

// Cashfree environment configuration
const CASHFREE_CONFIG = {
  appId: process.env.CASHFREE_APP_ID || '',
  secretKey: process.env.CASHFREE_SECRET_KEY || '',
  environment: (process.env.CASHFREE_ENVIRONMENT || 'TEST') as 'TEST' | 'PROD',
  webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET || '',
};

// API base URLs
const API_BASE = CASHFREE_CONFIG.environment === 'PROD'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const SUBSCRIPTION_API_BASE = CASHFREE_CONFIG.environment === 'PROD'
  ? 'https://api.cashfree.com/api/v2'
  : 'https://sandbox.cashfree.com/api/v2';


export interface CashfreeCheckoutParams {
  planId: string;
  tenantId: string;
  customerEmail: string;
  customerPhone: string;
  customerName?: string;
  amount: number; // in paise (smallest unit)
  successUrl: string;
  cancelUrl?: string;
}

export interface CashfreeCheckoutResult {
  paymentLink: string;
  orderId: string;
  cfOrderId?: string;
}

export const CashfreeService = {
  /**
   * Create a payment link for subscription
   */
  createSubscriptionCheckout: async (params: CashfreeCheckoutParams): Promise<CashfreeCheckoutResult> => {
    const orderId = `order_${params.tenantId}_${Date.now()}`;
    
    const requestBody = {
      order_id: orderId,
      order_amount: params.amount / 100, // Convert paise to rupees
      order_currency: 'INR',
      customer_details: {
        customer_id: params.tenantId,
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone,
        customer_name: params.customerName || params.customerEmail,
      },
      order_meta: {
        return_url: `${params.successUrl}?order_id={order_id}`,
        notify_url: `${process.env.BACKEND_URL || 'http://localhost:4000'}/subscription/cashfree-webhook`,
      },
      order_note: `Subscription: ${params.planId}`,
      order_tags: {
        tenantId: params.tenantId,
        planId: params.planId,
      },
    };

    try {
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

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Cashfree order creation failed:', data);
        throw new Error(data.message || 'Failed to create Cashfree order');
      }

      console.log('Cashfree order created:', data);

      return {
        paymentLink: data.payment_session_id 
          ? `${CASHFREE_CONFIG.environment === 'PROD' ? 'https://payments.cashfree.com' : 'https://sandbox.cashfree.com/pg'}/links/${data.payment_session_id}`
          : data.payment_link || '',
        orderId: orderId,
        cfOrderId: data.cf_order_id,
      };
    } catch (error) {
      console.error('Cashfree checkout error:', error);
      throw error;
    }
  },

  /**
   * Verify webhook signature from Cashfree
   * See: https://docs.cashfree.com/docs/webhooks
   */
  verifyWebhookSignature: (
    payload: string,
    timestamp: string,
    signature: string
  ): boolean => {
    const secret = CASHFREE_CONFIG.webhookSecret;
    
    // Skip verification in development or if secret not configured
    if (!secret || CASHFREE_CONFIG.environment === 'TEST') {
      console.log('Skipping Cashfree webhook signature verification (TEST mode or no secret)');
      return true;
    }

    // If signature is missing, fail in production
    if (!signature) {
      console.warn('Missing Cashfree webhook signature');
      return CASHFREE_CONFIG.environment !== 'PROD';
    }

    try {
      // Cashfree signature format: HMAC-SHA256 of raw body
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');
      
      // Also try with timestamp prepended (older format)
      const expectedSignatureWithTimestamp = crypto
        .createHmac('sha256', secret)
        .update(timestamp + payload)
        .digest('base64');
      
      const isValid = signature === expectedSignature || signature === expectedSignatureWithTimestamp;
      
      if (!isValid) {
        console.log('Signature mismatch:', {
          received: signature,
          expected: expectedSignature,
          expectedWithTs: expectedSignatureWithTimestamp,
        });
      }
      
      return isValid;
    } catch (error) {
      console.error('Cashfree signature verification error:', error);
      return CASHFREE_CONFIG.environment !== 'PROD';
    }
  },


  /**
   * Get order/payment status
   */
  getOrderStatus: async (orderId: string): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'x-api-version': '2023-08-01',
          'x-client-id': CASHFREE_CONFIG.appId,
          'x-client-secret': CASHFREE_CONFIG.secretKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get order status');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get Cashfree order status:', error);
      return null;
    }
  },

  /**
   * Create a subscription (recurring payment)
   */
  createSubscription: async (params: {
    subscriptionId: string;
    planId: string;
    customerId: string;
    customerEmail: string;
    customerPhone: string;
    amount: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    returnUrl: string;
  }): Promise<{ subscriptionId: string; authLink: string } | null> => {
    try {
      const response = await fetch(`${SUBSCRIPTION_API_BASE}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CASHFREE_CONFIG.appId,
          'x-client-secret': CASHFREE_CONFIG.secretKey,
        },
        body: JSON.stringify({
          subscriptionId: params.subscriptionId,
          planId: params.planId,
          customerEmail: params.customerEmail,
          customerPhone: params.customerPhone,
          firstChargeDate: new Date().toISOString().split('T')[0],
          authAmount: params.amount,
          returnUrl: params.returnUrl,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Cashfree subscription creation failed:', data);
        return null;
      }

      return {
        subscriptionId: data.subReferenceId || params.subscriptionId,
        authLink: data.authLink || '',
      };
    } catch (error) {
      console.error('Failed to create Cashfree subscription:', error);
      return null;
    }
  },

  /**
   * Cancel a subscription
   */
  cancelSubscription: async (subscriptionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${SUBSCRIPTION_API_BASE}/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CASHFREE_CONFIG.appId,
          'x-client-secret': CASHFREE_CONFIG.secretKey,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Cashfree subscription cancellation failed:', data);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to cancel Cashfree subscription:', error);
      return false;
    }
  },

  /**
   * Get subscription status
   */
  getSubscriptionStatus: async (subscriptionId: string): Promise<any> => {
    try {
      const response = await fetch(`${SUBSCRIPTION_API_BASE}/subscriptions/${subscriptionId}`, {
        method: 'GET',
        headers: {
          'x-client-id': CASHFREE_CONFIG.appId,
          'x-client-secret': CASHFREE_CONFIG.secretKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get subscription status');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get Cashfree subscription status:', error);
      return null;
    }
  },
};

export default CashfreeService;
