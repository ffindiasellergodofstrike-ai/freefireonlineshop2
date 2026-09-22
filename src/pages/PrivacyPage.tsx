import React from 'react';
import { LegalContent } from '../components/LegalContent';

export const PrivacyPage: React.FC = () => {
  const sections = [
    {
      id: 'collection',
      title: '1. Information We Collect',
      content: (
        <div className="space-y-3">
          <p>
            When you interact with FreeFireShop, create an account, make a purchase, or contact our support team, we collect the necessary customer details to fulfill digital orders and deliver services:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Personal Identity:</strong> Your full name and email address.</li>
            <li><strong>Billing & Invoicing:</strong> Billing address, postal code, and country (for tax calculation and legal invoice generation).</li>
            <li><strong>Order Records:</strong> Items purchased, order identifiers, transaction timestamps, and order totals.</li>
            <li><strong>Payment Status:</strong> Payment confirmation status and gateway transaction IDs (we never receive or store raw credit card numbers).</li>
            <li><strong>Download & Access Logs:</strong> Timestamps of downloaded digital files and account access records to prevent unauthorized account sharing.</li>
            <li><strong>Support Communications:</strong> Messages and technical inquiries sent to our helpdesk.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'cookies-analytics',
      title: '2. Cookies & Analytics',
      content: (
        <div className="space-y-3">
          <p>
            We use essential session cookies to remember your shopping cart items, authentication session, and user preferences. We may also use privacy-focused, anonymized analytics to measure store performance, detect broken pages, and improve site reliability.
          </p>
          <p>
            You can configure your browser to reject cookies, though certain shopping cart and account authentication functions may require session cookies to operate correctly.
          </p>
        </div>
      ),
    },
    {
      id: 'how-we-use',
      title: '3. How We Use Your Information',
      content: (
        <div className="space-y-3">
          <p>We process your data strictly for legitimate business purposes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>To process your digital orders and verify payment authorization.</li>
            <li>To provision digital downloads and secure customer portal access.</li>
            <li>To generate and email purchase receipts and tax invoices.</li>
            <li>To deliver critical product security patches and version update notifications.</li>
            <li>To prevent fraud, chargeback abuse, and unauthorized redistribution.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'payments-security',
      title: '4. Payment Security & Data Retention',
      content: (
        <div className="space-y-3">
          <p>
            All payment transactions are encrypted using Transport Layer Security (TLS/SSL) and processed directly by certified PCI-DSS Level 1 payment processors (e.g. Stripe, PayPal).
          </p>
          <p>
            We retain order records for the duration required by financial auditing, tax regulations, and customer support history. You may request data deletion or account removal subject to legal retention obligations.
          </p>
        </div>
      ),
    },
    {
      id: 'no-sale',
      title: '5. No Sale or Unauthorized Sharing of Data',
      content: (
        <p>
          FreeFireShop never sells, rents, trades, or distributes customer personal information to third-party data brokers or marketing agencies. Data is shared exclusively with necessary infrastructure providers (such as payment processors and transactional email relays) under strict data protection terms.
        </p>
      ),
    },
    {
      id: 'user-rights',
      title: '6. Your Privacy Rights & Contact',
      content: (
        <div className="space-y-3">
          <p>
            Depending on your jurisdiction (including GDPR and CCPA regulations), you have the right to access, export, correct, or request the deletion of your personal data.
          </p>
          <p>
            For any privacy inquiries or data requests, contact us at <strong>privacy@freefireshop.dev</strong> or <strong>support@freefireshop.dev</strong>.
          </p>
        </div>
      ),
    },
  ];

  return (
    <LegalContent
      title="Privacy Policy"
      subtitle="How FreeFireShop protects your personal details, order records, and digital account access."
      lastUpdated="September 21, 2026"
      quickSummary={[
        'We collect essential details to fulfill orders, generate invoices, and deliver digital downloads.',
        'Payment details are processed securely by PCI-DSS certified payment processors.',
        'We never sell or trade your email address or customer records to third parties.',
        'Full transparency on cookies, access logging, and customer data rights.',
      ]}
      sections={sections}
    />
  );
};
