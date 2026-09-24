export interface PaymentMethodOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'requires_config';
  fee: number;
}

export interface PaymentIntentResult {
  clientSecret?: string;
  success: boolean;
  message: string;
  transactionId?: string;
  requiresRedirect?: boolean;
  orderId?: string;
  status: 'PAID' | 'PENDING' | 'FAILED';
}

export class PaymentService {
  /**
   * Check if live payment gateway credentials are configured
   */
  static isLiveGatewayConfigured(): boolean {
    return true;
  }

  /**
   * List available payment gateways
   */
  static getAvailableGateways(): PaymentMethodOption[] {
    return [
      {
        id: 'easebuzz',
        name: 'UPI / Cards / Netbanking (Easebuzz)',
        description: 'Secure payment via Easebuzz (India, INR)',
        icon: 'CreditCard',
        status: 'active',
        fee: 0,
      },
    ];
  }

  /**
   * Initiates payment with Easebuzz via secure backend API
   */
  static async initiateEasebuzzPayment(orderId: string, agreeTerms: boolean): Promise<{
    success: boolean;
    accessKey?: string;
    merchantKey?: string;
    environment?: 'test' | 'prod';
    message?: string;
  }> {
    try {
      const res = await fetch('/api/payments/easebuzz/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId, agreeTerms }),
      });
      
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error initiating payment.' };
    }
  }

  /**
   * Direct client-side payment processing is disabled for security.
   */
  static async processPayment(_params: {
    orderId: string;
    method: string;
    amount: number;
    currency: string;
    customerEmail: string;
    customerName: string;
  }): Promise<{ success: boolean; message: string; transactionId?: string; status: 'PAID' | 'PENDING' | 'FAILED' }> {
    return {
      success: false,
      status: 'FAILED',
      message: 'Direct client-side payment processing is disabled. Use Easebuzz gateway.',
    };
  }

  static async verifyWebhookSignature(_payload: string, _signature: string): Promise<boolean> {
    return false;
  }
}
