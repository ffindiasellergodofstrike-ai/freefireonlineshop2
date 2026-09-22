import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  Download,
  Sparkles,
  ChevronRight,
  PackageCheck,
  RefreshCw,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { OrderService } from '../services/OrderService';
import { PaymentService } from '../services/PaymentService';
import { Order } from '../types';

import { AuthService } from '../services/AuthService';

declare global {
  interface Window {
    EasebuzzCheckout: any;
  }
}

const isPaidStatus = (status?: string): boolean => status?.toUpperCase() === 'PAID';

export const CheckoutPage: React.FC = () => {
  const { cartItems, cartSummary, appliedCoupon, clearCart, currentUser, navigate, searchParams } = useApp();
  const { showToast } = useToast();

  // Form State
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.mobile || '');
  const [billingCountry, setBillingCountry] = useState('India');
  const [paymentMethod, setPaymentMethod] = useState<'easebuzz' | 'wallet'>('easebuzz');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Processing & Completed State
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Load Easebuzz Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://ebz-static.s3.ap-south-1.amazonaws.com/easecheckout/v2.0.0/easebuzz-checkout-v2.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Handle Redirect Back from Easebuzz
  useEffect(() => {
    const status = searchParams.status;
    const orderId = searchParams.orderId;

    if (status === 'success' && orderId) {
      handleSuccessfulPayment(orderId);
    } else if (status === 'failed') {
      showToast('error', 'Payment Failed', 'Your transaction was cancelled or failed. Please try again.');
    }
  }, [searchParams]);

  const handleSuccessfulPayment = async (orderId: string) => {
    setIsVerifying(true);
    try {
      // Poll or wait for webhook to update status
      let attempts = 0;
      const maxAttempts = 5;
      
      const checkStatus = async () => {
        const order = await OrderService.fetchOrderById(orderId);
        if (order && isPaidStatus(order.paymentStatus)) {
          setCompletedOrder(order);
          clearCart();
          setIsVerifying(false);
          
          try {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
            });
          } catch (err) {}
          
          showToast('success', 'Payment Verified', 'Your digital product access is now active!');
          return true;
        }
        return false;
      };

      const poll = async () => {
        const done = await checkStatus();
        if (!done && attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000);
        } else if (!done) {
          // If still not paid after polling, maybe manual reconcile?
          setVerificationError('Payment verification is taking longer than expected. Please check your account dashboard in a few minutes or click Reconcile.');
          setIsVerifying(false);
        }
      };

      poll();
    } catch (err) {
      setVerificationError('Error verifying payment status.');
      setIsVerifying(false);
    }
  };

  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      showToast('error', 'Terms Required', 'Please accept the licensing terms and privacy policy.');
      return;
    }
    if (cartItems.length === 0) {
      showToast('error', 'Cart Empty', 'Add products to your cart before proceeding.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create a pending order via backend API
      const pendingOrder = await OrderService.createPendingOrderAsync(
        cartItems,
        {
          fullName: customerName,
          email: customerEmail,
          country: billingCountry,
          phone: customerPhone,
        } as any,
        cartSummary.discount,
        appliedCoupon?.code,
        paymentMethod === 'easebuzz' ? 'Easebuzz UPI/Cards' : 'Indian Wallets'
      );

      // 2. Initiate Easebuzz Payment via backend
      const initResult = await PaymentService.initiateEasebuzzPayment(pendingOrder.id, agreeTerms);

      if (initResult.success && initResult.accessKey && initResult.merchantKey) {
        // 3. Open Easebuzz Checkout Modal
        const easebuzzCheckout = new window.EasebuzzCheckout(
          initResult.merchantKey,
          initResult.environment || 'test'
        );

        const options = {
          access_key: initResult.accessKey,
          onResponse: (response: any) => {
            // response will have the payment details
            // The actual status is updated via webhook
            console.log('Easebuzz Response:', response);
            if (response.status === 'success') {
              // The callback URL will handle the redirect, but we can also handle it here if it's a modal
              window.location.href = `/checkout?status=success&orderId=${pendingOrder.id}`;
            } else {
              setIsProcessing(false);
              showToast('error', 'Payment Cancelled', 'Payment process was not completed.');
            }
          },
        };

        easebuzzCheckout.initiatePayment(options);
      } else {
        setIsProcessing(false);
        showToast('error', 'Initiation Failed', initResult.message || 'Could not initiate Easebuzz gateway.');
      }
    } catch (err: any) {
      setIsProcessing(false);
      showToast('error', 'Checkout Error', err.message || 'An error occurred during checkout initiation.');
    }
  };

  const handleReconcile = async () => {
    const orderId = searchParams.orderId;
    if (!orderId) return;
    
    setIsVerifying(true);
    setVerificationError(null);
    try {
      const res = await fetch(`/api/payments/easebuzz/reconcile/${encodeURIComponent(orderId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        const order = await OrderService.fetchOrderById(orderId);
        if (order && isPaidStatus(order.paymentStatus)) {
          setCompletedOrder(order);
          clearCart();
          showToast('success', 'Order Reconciled', 'Access granted successfully.');
        } else {
          setVerificationError('Payment is not confirmed yet. Please try again in a moment.');
        }
      } else {
        setVerificationError(data.message || 'Manual reconciliation failed. Please contact support.');
      }
    } catch (err) {
      setVerificationError('Network error during reconciliation.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSecureDownload = async (productId: string, defaultName: string) => {
    try {
      showToast('info', 'Authorizing Download', 'Validating purchase access and secure token...');
      const res = await OrderService.requestDownloadToken(productId);
      if (res.success && res.downloadUrl) {
        showToast('success', 'Download Initiated', `Streaming ${defaultName}...`);
        const a = document.createElement('a');
        a.href = res.downloadUrl;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        showToast('error', 'Download Denied', res.message || 'Unable to authorize download.');
      }
    } catch (err) {
      showToast('error', 'Download Failed', 'Could not request secure download link.');
    }
  };

  // VERIFYING VIEW (POLLING)
  if (isVerifying) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto animate-pulse">
          <Clock className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900">Verifying Your Payment...</h1>
          <p className="text-slate-600 max-w-sm mx-auto text-sm">
            Please do not refresh or close this window. We are confirming your transaction with the bank to provision your digital download.
          </p>
        </div>
        {verificationError && (
          <div className="max-w-md mx-auto p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-start gap-3 text-left">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="space-y-3">
              <p>{verificationError}</p>
              <button 
                onClick={handleReconcile}
                className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors"
              >
                Manual Reconcile Now
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // SUCCESS CONFIRMATION VIEW
  if (completedOrder) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Success Header */}
      <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl p-6 sm:p-10 text-center space-y-5">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border-4 border-white">
          <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
            Payment Successful & Verified
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Thank You For Your Purchase!
          </h1>
          <p className="text-slate-600 text-xs sm:text-base max-w-lg mx-auto leading-relaxed">
            Your digital products have been provisioned for{' '}
            <strong className="text-slate-900 break-all">{completedOrder.customerEmail}</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 px-4 py-3 sm:py-4 bg-slate-50 rounded-2xl border border-slate-200 text-[10px] sm:text-xs font-mono font-bold text-slate-700">
          <span className="truncate">Reference: <strong className="text-slate-900">{completedOrder.orderNumber}</strong></span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="truncate">Paid: <strong className="text-emerald-600">₹{completedOrder.total.toFixed(2)}</strong></span>
        </div>
      </div>

      {/* Digital Downloads Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
        <div className="p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <PackageCheck className="w-6 h-6 text-blue-600 shrink-0" />
            <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">Your Vault Access</h2>
          </div>
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 uppercase tracking-widest self-start sm:self-center">
            Instant Access
          </span>
        </div>

        <div className="p-5 sm:p-8 space-y-6">
          <div className="space-y-4">
            {completedOrder.items.map((item, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-5 transition-all hover:border-slate-300"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                      {item.product.categoryLabel}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1 truncate">{item.product.title}</h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate">
                      Archive: {item.product.slug}-v{item.product.version || '1.0'}.zip ({item.product.fileSize || '38 MB'})
                    </p>
                  </div>

                  <button
                    id={`download-archive-btn-${idx}`}
                    onClick={() => handleSecureDownload(item.productId || item.product?.id || 'linknest-pro', `${item.product.slug || 'linknest-pro'}-v${item.product.version || '1.2.0'}.zip`)}
                    className="p-2 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] sm:min-w-0 shrink-0"
                  >
                    <Download className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="hidden sm:inline">Download Package</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <button
              onClick={() => navigate('/account')}
              className="w-full sm:w-auto text-xs sm:text-sm font-black text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1.5 py-2 group min-h-[44px]"
            >
              <span className="truncate">View All Orders in Dashboard</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 shrink-0" />
            </button>

            <button
              onClick={() => navigate('/products')}
              className="w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-black text-white font-black rounded-xl text-xs sm:text-sm transition-all shadow-xl active:scale-95 min-h-[44px]"
            >
              Continue Browsing Store
            </button>
          </div>
        </div>
      </div>
    </div>
    );
  }

  // STANDARD CHECKOUT FORM VIEW
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Checkout Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleProcessCheckout} className="space-y-6">
            {/* 1. Customer Digital Delivery Info */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <span>Customer & Digital Delivery Info</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Alex Henderson"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address <span className="text-slate-400 font-normal">(for file delivery)</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Indian Mobile Number</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">+91</span>
                    <input
                      type="tel"
                      required
                      pattern="[6-9][0-9]{9}"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9998887776"
                      className="w-full pl-12 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Billing Country</label>
                  <select
                    value={billingCountry}
                    onChange={(e) => setBillingCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                  >
                    <option value="India">India</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Worldwide">Other (Worldwide)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Payment Method Selector */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <span>Payment Method</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('easebuzz')}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    paymentMethod === 'easebuzz'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <CreditCard className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-xs block">UPI / Cards / Netbanking</span>
                  <span className="text-[10px] text-slate-400 font-normal">Instant Authorization</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    paymentMethod === 'wallet'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                  <span className="text-xs block">Wallets</span>
                  <span className="text-[10px] text-slate-400 font-normal">Paytm, PhonePe, Mobikwik</span>
                </button>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-2 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 accent-blue-600"
                />
                <label htmlFor="agree-terms" className="text-xs text-slate-600 leading-snug cursor-pointer">
                  I agree to the FreeFireShop{' '}
                  <a href="#/terms" className="text-blue-600 font-semibold underline">
                    Terms of Service
                  </a>
                  .
                </label>
              </div>
            </div>

            {/* Complete Purchase Button */}
            <button
              id="submit-order-btn"
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-2xl text-base transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-98"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Preparing Secure Checkout...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Complete Order & Get Instant Access (₹{cartSummary.total.toFixed(2)})</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Review Sidebar (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-4 sticky top-24">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              Order Review ({cartItems.length} Items)
            </h3>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto space-y-2">
              {cartItems.map((item) => (
                <div key={item.product.id} className="pt-2 flex justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{item.product.title}</p>
                    <p className="text-slate-500">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-slate-800">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">₹{cartSummary.subtotal.toFixed(2)}</span>
              </div>
              {cartSummary.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount ({appliedCoupon?.code}):</span>
                  <span className="font-mono">-₹{cartSummary.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Delivery:</span>
                <span className="text-emerald-600 font-semibold">Instant Download</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Total Price:</span>
                <span className="text-xl font-extrabold text-emerald-600 font-mono">
                  ₹{cartSummary.total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>Full 14-day defect refund guarantee on all unencrypted digital products.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
