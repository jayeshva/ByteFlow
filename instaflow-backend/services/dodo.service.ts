import DodoPayments from 'dodopayments';

// Initialize Dodo Payments client
const dodo = new DodoPayments({
  bearerToken: process.env.DODO_API_KEY,
  environment: (process.env.DODO_ENVIRONMENT as 'test_mode' | 'live_mode') || 'test_mode',
});

export interface CreateCheckoutParams {
  planId: string;
  dodoProductId: string;
  tenantId: string;  // Required for webhook processing
  customerId?: string;
  customerEmail: string;
  customerName?: string;
  successUrl: string;
  cancelUrl?: string;
}

export interface CheckoutResult {
  paymentLink: string;
  customerId?: string;
}

export const DodoService = {
  /**
   * Create a subscription checkout session
   */
  createSubscriptionCheckout: async (params: CreateCheckoutParams): Promise<CheckoutResult> => {
    const payment = await dodo.payments.create({
      billing: {
        city: '',
        country: 'IN',
        state: '',
        street: '',
        zipcode: '',
      },
      customer: {
        email: params.customerEmail,
        name: params.customerName || params.customerEmail,
      },
      product_cart: [
        {
          product_id: params.dodoProductId,
          quantity: 1,
        },
      ],
      return_url: params.successUrl,
      metadata: {
        tenantId: params.tenantId,
        planId: params.planId,
      },
    });

    console.log("Payment", payment);

    // Construct payment link using the product-based checkout URL
    let paymentLink = payment.payment_link;
    
    if (!paymentLink) {
      // Use Dodo's product checkout URL format
      const baseUrl = process.env.DODO_ENVIRONMENT === 'live_mode'
        ? 'https://checkout.dodopayments.com'
        : 'https://test.checkout.dodopayments.com';
      // Use the product_id from the cart
      const productId = params.dodoProductId;
      paymentLink = `${baseUrl}/buy/${productId}?quantity=1`;
    }

    return {
      paymentLink: paymentLink || '',
      customerId: payment.customer?.customer_id,
    };
  },

  /**
   * Verify webhook signature from Dodo (uses Svix format)
   * See: https://docs.dodopayments.com/api-reference/webhooks/get-webhook-headers
   */
  verifyWebhookSignature: (
    payload: string, 
    signature: string,
    timestamp?: string,
    webhookId?: string
  ): boolean => {
    const secret = process.env.DODO_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('DODO_WEBHOOK_SECRET not set, skipping signature verification');
      return true; // Allow in development
    }
    
    // Svix signature format: "v1,{base64_signature}"
    // The signature is HMAC-SHA256 of "{webhook-id}.{webhook-timestamp}.{body}"
    if (!timestamp || !webhookId) {
      console.warn('Missing timestamp or webhookId for signature verification');
      return false;
    }

    try {
      const crypto = require('crypto');
      
      // Decode the webhook secret (base64 encoded, starts with "whsec_")
      const secretKey = secret.startsWith('whsec_') 
        ? Buffer.from(secret.slice(6), 'base64')
        : Buffer.from(secret, 'base64');
      
      // Create the signed payload
      const signedPayload = `${webhookId}.${timestamp}.${payload}`;
      
      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(signedPayload)
        .digest('base64');
      
      // Extract signature from header (format: "v1,{signature}")
      const signatures = signature.split(' ');
      for (const sig of signatures) {
        const [version, sigValue] = sig.split(',');
        if (version === 'v1' && sigValue === expectedSignature) {
          return true;
        }
      }
      
      console.warn('Signature mismatch');
      return false;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  },

  /**
   * Get customer portal link for subscription management
   */
  getCustomerPortalLink: async (customerId: string): Promise<string | null> => {
    try {
      // Dodo's customer portal URL is typically constructed like this
      // In live mode, customers can manage subscriptions via the portal
      const baseUrl = process.env.DODO_ENVIRONMENT === 'live_mode' 
        ? 'https://app.dodopayments.com' 
        : 'https://sandbox.dodopayments.com';
      return `${baseUrl}/portal/${customerId}`;
    } catch (error) {
      console.error('Failed to get customer portal link:', error);
      return null;
    }
  },

  /**
   * Cancel a subscription
   */
  cancelSubscription: async (subscriptionId: string): Promise<boolean> => {
    try {
      await dodo.subscriptions.update(subscriptionId, {
        status: 'cancelled',
      });
      return true;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return false;
    }
  },

  /**
   * Get subscription details
   */
  getSubscription: async (subscriptionId: string) => {
    try {
      return await dodo.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  },
};

export default DodoService;
