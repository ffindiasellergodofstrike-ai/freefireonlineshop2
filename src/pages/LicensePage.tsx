import React from 'react';
import { LegalContent } from '../components/LegalContent';

export const LicensePage: React.FC = () => {
  const sections = [
    {
      id: 'product-specific-policy',
      title: 'Product-Specific License & Usage Terms',
      content: (
        <div className="space-y-3">
          <p>
            At <strong>FreeFireShop</strong>, we distribute a diverse range of digital products—including scripts, developer utilities, downloadable files, video tutorials, and technical resources. Because the nature and intended application of each digital asset varies, the permitted scope of use depends directly on the <strong>product description and applicable usage rights supplied with each specific product</strong>.
          </p>
          <p>
            Please check the dedicated <strong>License / Usage Terms</strong> badge and section on every individual product page prior to deployment.
          </p>
        </div>
      ),
    },
    {
      id: 'general-permissions',
      title: 'Standard Product Entitlements',
      content: (
        <div className="space-y-3">
          <p>
            Unless explicitly modified by the individual product's license specification:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Personal & Internal Deployment:</strong> You are authorized to deploy and utilize the purchased digital product for your own internal projects, personal websites, and company operations.</li>
            <li><strong>Client Deliverables:</strong> For customizable scripts, design kits, and templates, you are permitted to compile and deploy customized derivative works for client websites or standalone applications.</li>
            <li><strong>Modifications:</strong> You may modify and adapt the source files to integrate with your custom architecture.</li>
            <li><strong>Version Updates:</strong> You receive access to product maintenance updates and bug fixes for the life of that product on FreeFireShop.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'prohibited-activities',
      title: 'Prohibited Resale & Standalone Redistribution',
      content: (
        <div className="space-y-3">
          <p>
            Under no circumstances may any customer:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Re-sell, sub-license, rent, or redistribute the raw digital source files or download archives in standalone format.</li>
            <li>Upload downloadable product packages to public open-source code repositories (such as public GitHub repos), torrent portals, or file-sharing networks.</li>
            <li>Claim original copyright or ownership of materials authorized to FreeFireShop.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'educational-content',
      title: 'Video & Educational Content Access',
      content: (
        <p>
          Purchased video masterclasses and educational walkthroughs are licensed for individual customer viewing and personal skill development. Account sharing or public rebroadcasting of protected video tutorials is strictly prohibited.
        </p>
      ),
    },
  ];

  return (
    <LegalContent
      title="License & Usage Policy"
      subtitle="Clear guidelines on product-specific usage permissions, commercial rights, and deployment terms."
      lastUpdated="September 21, 2026"
      quickSummary={[
        'Permitted use is determined by the specific terms provided on each product page.',
        'Authorized for personal, company, and client application deployments.',
        'Direct standalone resale or public source file dumping is strictly prohibited.',
        'Access to maintenance releases and version updates included with verified purchase.',
      ]}
      sections={sections}
    />
  );
};
