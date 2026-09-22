import React from 'react';
import { LegalContent } from '../components/LegalContent';

export const TermsPage: React.FC = () => {
  const sections = [
    {
      id: 'section-1-introduction',
      title: '1. Introduction',
      content: (
        <p>
          Welcome to FreeFireShop (the "Store", "we", "us", or "our"). These Terms and Conditions govern your access to and purchase of authorized digital products from our online store. By browsing the website, creating an account, or placing an order, you agree to be legally bound by these terms in their entirety.
        </p>
      ),
    },
    {
      id: 'section-2-digital-products',
      title: '2. Digital Products',
      content: (
        <p>
          FreeFireShop specializes exclusively in intangible digital products, including downloadable files, scripts, software utilities, developer tools, video walkthroughs, and digital resources that we are legally authorized to sell and distribute.
        </p>
      ),
    },
    {
      id: 'section-3-product-information',
      title: '3. Product Information',
      content: (
        <p>
          We strive to provide accurate technical descriptions, compatibility requirements, file formats, and version details for every digital product. Customers are encouraged to review the specifications and system requirements on each product page prior to purchase.
        </p>
      ),
    },
    {
      id: 'section-4-pricing',
      title: '4. Pricing',
      content: (
        <p>
          All prices are listed in United States Dollars (USD) unless explicitly stated otherwise. We reserve the right to modify prices, discounts, and promotional offers at any time without prior notice. Price changes do not affect previously confirmed and paid orders.
        </p>
      ),
    },
    {
      id: 'section-5-orders',
      title: '5. Orders',
      content: (
        <p>
          When you place an order, an initial pending order record is created. An order constitutes an offer to purchase digital access. A binding contract is formed only once your payment is successfully authorized and confirmed by our payment processing system.
        </p>
      ),
    },
    {
      id: 'section-6-payments',
      title: '6. Payments',
      content: (
        <p>
          Payments are processed securely via verified payment gateway integrations (such as credit/debit card processors, PayPal, or accepted payment providers). We do not store sensitive payment credentials or raw credit card numbers on our servers.
        </p>
      ),
    },
    {
      id: 'section-7-digital-delivery',
      title: '7. Digital Delivery',
      content: (
        <p>
          Upon verified payment confirmation, digital products are delivered electronically. Delivery is fulfilled immediately by provisioning access to your secure customer account portal and generating authorized download links.
        </p>
      ),
    },
    {
      id: 'section-8-download-access',
      title: '8. Download & Access Rights',
      content: (
        <p>
          Customers may access and download their purchased digital assets through the My Downloads section of their account. Download access remains tied to the authenticated account associated with the verified order.
        </p>
      ),
    },
    {
      id: 'section-9-customer-responsibilities',
      title: '9. Customer Responsibilities',
      content: (
        <p>
          You are responsible for ensuring that your computer hardware, operating system, and software environment meet the published system prerequisites for each purchased digital asset. You are also responsible for maintaining local backup copies of your downloaded digital files.
        </p>
      ),
    },
    {
      id: 'section-10-intellectual-property',
      title: '10. Intellectual Property',
      content: (
        <p>
          All digital products, documentation, graphics, and code sold or distributed on FreeFireShop are protected by intellectual property laws. FreeFireShop only distributes content it is authorized to sell. Purchasing a product grants specific usage rights and does not transfer underlying copyright or proprietary ownership.
        </p>
      ),
    },
    {
      id: 'section-11-usage-rights',
      title: '11. Product Usage Rights',
      content: (
        <p>
          Your purchase provides access to use and customize the digital product for your own project. Product descriptions may include additional technical or usage restrictions.
        </p>
      ),
    },
    {
      id: 'section-12-prohibited-use',
      title: '12. Prohibited Use',
      content: (
        <p>
          You may not redistribute, share publicly, leak, re-sell standalone source files, grant resale rights, reverse-engineer proprietary security layers, or use any product for unlawful or infringing purposes without express written authorization.
        </p>
      ),
    },
    {
      id: 'section-13-refunds',
      title: '13. Refunds',
      content: (
        <p>
          Refunds for digital products are governed strictly by our Refund Policy. Because digital goods become accessible immediately upon verified payment, refunds are generally not available once delivered, downloaded, or accessed, subject to applicable law and technical non-delivery exceptions.
        </p>
      ),
    },
    {
      id: 'section-14-order-cancellation',
      title: '14. Order Cancellation',
      content: (
        <p>
          Pending orders that have not yet been processed or paid may be cancelled. Once a payment is verified and electronic delivery is executed, the order is deemed fulfilled and cannot be cancelled arbitrarily.
        </p>
      ),
    },
    {
      id: 'section-15-account-responsibilities',
      title: '15. Account Responsibilities',
      content: (
        <p>
          You agree to provide accurate and complete information when creating an account or placing an order. You are responsible for safeguarding your login credentials and for all activities conducted under your customer profile.
        </p>
      ),
    },
    {
      id: 'section-16-service-availability',
      title: '16. Service Availability',
      content: (
        <p>
          While we strive for continuous 99.9% uptime and reliable digital delivery servers, we do not guarantee uninterrupted availability. Periodic maintenance, updates, or external network disruptions may occur.
        </p>
      ),
    },
    {
      id: 'section-17-third-party-services',
      title: '17. Third-Party Services',
      content: (
        <p>
          Our store may link to or integrate with third-party tools, payment gateways, or hosting platforms. We are not responsible for the availability, terms, or privacy practices of independent third-party services.
        </p>
      ),
    },
    {
      id: 'section-18-limitation-of-liability',
      title: '18. Limitation of Liability',
      content: (
        <p>
          To the maximum extent permitted by applicable law, FreeFireShop shall not be liable for indirect, incidental, special, or consequential damages resulting from the use or inability to use any digital product. Our total liability shall not exceed the amount actually paid for the specific product in dispute.
        </p>
      ),
    },
    {
      id: 'section-19-changes-to-terms',
      title: '19. Changes to Terms',
      content: (
        <p>
          We may update these Terms & Conditions periodically to reflect business, operational, or legal requirements. Updated versions will be posted on this page with a revised "Last Updated" date. Continued use of the website constitutes acceptance of the modified terms.
        </p>
      ),
    },
    {
      id: 'section-20-contact-information',
      title: '20. Contact Information',
      content: (
        <p>
          If you have questions regarding these Terms & Conditions, please contact us via our Contact page or directly by email at <strong>support@freefireshop.dev</strong>.
        </p>
      ),
    },
  ];

  return (
    <LegalContent
      title="Terms & Conditions"
      subtitle="The comprehensive legal terms governing the purchase and usage of digital products from FreeFireShop."
      lastUpdated="September 21, 2026"
      quickSummary={[
        'Comprehensive 20-point terms governing all authorized digital product sales.',
        'Instant electronic delivery upon verified payment confirmation.',
        'Clear product-specific usage and redistribution restrictions.',
        'Fair digital goods refund policy adhering to consumer protection laws.',
      ]}
      sections={sections}
    />
  );
};
