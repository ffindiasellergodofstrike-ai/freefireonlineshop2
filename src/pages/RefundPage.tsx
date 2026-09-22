import React from 'react';
import { LegalContent } from '../components/LegalContent';

export const RefundPage: React.FC = () => {
  const sections = [
    {
      id: 'digital-products',
      title: 'Digital Products Policy',
      content: (
        <div className="space-y-3">
          <p>
            Because our products are intangible digital goods (including downloadable ZIP files, scripts, software utilities, video access, and digital developer resources) that become accessible and downloadable immediately after successful payment verification, refunds are generally not available once the digital product has been successfully delivered, downloaded, or accessed, subject to applicable law and the specific circumstances of the order.
          </p>
          <p>
            We urge all customers to carefully review product descriptions, feature lists, included files, and technical requirements before completing their purchase.
          </p>
        </div>
      ),
    },
    {
      id: 'non-delivery',
      title: 'Technical Non-Delivery Exceptions',
      content: (
        <div className="space-y-3">
          <p>
            If your payment was successfully completed and debited, but you did not receive the purchased digital product or access was blocked due to a server or technical delivery failure on our part, please contact our support team immediately.
          </p>
          <p>
            Our team will first attempt to resolve the delivery or access problem promptly (by re-issuing direct download links or manually refreshing your account entitlements). If the purchased digital product genuinely cannot be delivered or accessed after successful payment, we will provide an appropriate refund or other resolution in accordance with applicable payment provider rules and relevant law.
          </p>
        </div>
      ),
    },
    {
      id: 'duplicate-payments',
      title: 'Duplicate Charges & Processing Errors',
      content: (
        <p>
          If you were inadvertently charged more than once for the same transaction due to a payment gateway processing error or double-submission, please inform us with your transaction details. Once verified by our payment gateway records, the duplicate transaction will be promptly investigated and refunded.
        </p>
      ),
    },
    {
      id: 'failed-payments',
      title: 'Failed & Incomplete Transactions',
      content: (
        <p>
          If a payment transaction failed, was declined by your financial institution, or was cancelled before completion, no successful order is created and no digital product delivery will occur. If a pending pre-authorization hold appears on your bank statement for a failed transaction, it will be automatically released by your card issuer according to their standard processing timeline.
        </p>
      ),
    },
    {
      id: 'unauthorized-transactions',
      title: 'Unauthorized Transactions',
      content: (
        <p>
          If you notice an unauthorized charge from FreeFireShop on your billing statement, please contact our support team immediately at <strong>support@freefireshop.dev</strong> and promptly notify your card issuer or payment provider so the issue can be formally investigated.
        </p>
      ),
    },
    {
      id: 'request-procedure',
      title: 'How to Submit a Review Request',
      content: (
        <div className="space-y-3">
          <p>
            To submit an inquiry regarding delivery issues or duplicate billing, please provide:
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Your Order ID or Transaction Number (e.g. FF-2026-XXXX)</li>
            <li>The email address used during purchase</li>
            <li>A detailed description of the delivery issue or error encountered</li>
          </ol>
          <p className="text-sm text-slate-500">
            Our support desk aims to review and respond to all technical delivery inquiries within 24 to 48 business hours.
          </p>
        </div>
      ),
    },
  ];

  return (
    <LegalContent
      title="Digital Product Refund Policy"
      subtitle="Clear and legally reasonable terms regarding digital downloads, technical non-delivery, and billing inquiries."
      lastUpdated="September 21, 2026"
      quickSummary={[
        'Digital products are generally non-refundable once delivered, downloaded, or accessed.',
        'Technical non-delivery is investigated and resolved immediately with access or a refund.',
        'Duplicate transactions caused by gateway processing errors are promptly refunded.',
        'Strict, fair, and compliant with consumer protection and payment network guidelines.',
      ]}
      sections={sections}
    />
  );
};
