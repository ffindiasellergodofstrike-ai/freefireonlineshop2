import React from 'react';

export interface PolicySection {
  id: string;
  title: string;
  content: string | React.ReactNode;
}

export interface Policy {
  slug: string;
  title: string;
  subtitle: string;
  lastUpdated: string;
  quickSummary: string[];
  sections: PolicySection[];
}

const rawPolicyData: Record<string, Policy> = {
  terms: {
    slug: 'terms',
    title: 'Terms & Conditions',
    subtitle: 'The official binding agreement governing customer access, account creation, and product licensing on FFDigital.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Comprehensive legal terms governing all digital product purchases and website usage.',
      'Operated solely as an individual proprietorship by [OWNER FULL LEGAL NAME].',
      'Instant digital download licensing details and usage rules.',
      'Disputes governed under the jurisdiction of Indian laws and courts.',
    ],
    sections: [
      {
        id: 'operator-identity',
        title: '1. Operator Identity & Business Structure',
        content: 'This website (https://www.ffdigital.shop/) and all its digital services, products, and downloads are operated and distributed exclusively by [OWNER FULL LEGAL NAME], acting as the Sole Proprietor of FFDigital. FFDigital is not a multi-vendor marketplace, team-based software company, or corporate conglomerate. There are no co-founders, partners, secondary sellers, or external representatives. All transactions, digital content, and support services are managed directly by the Individual Proprietor.'
      },
      {
        id: 'binding-agreement',
        title: '2. Binding Legal Agreement',
        content: 'By accessing this website, registering an account, or purchasing any digital downloads, you agree to be bound in full by these Terms & Conditions, the Refund Policy, and our Privacy Policy. If you do not agree to these terms, you must cease using this site immediately. These terms constitute a legally binding electronic agreement between you (the Customer) and [OWNER FULL LEGAL NAME] (the Proprietor).'
      },
      {
        id: 'account-security',
        title: '3. Account Registration & Credential Integrity',
        content: 'To purchase digital assets or access download vaults, you must register a customer account. You agree to provide accurate, truthful, and complete details, including your email address and an active Indian mobile number. You are solely responsible for protecting your login credentials. Concurrent logins or account sharing are strictly prohibited and will trigger automatic system lockout and license revocation.'
      },
      {
        id: 'digital-product-delivery',
        title: '4. Digital Delivery & Secure Vault Access',
        content: 'All products sold on FFDigital are intangible, digital files (such as ZIP archives, source code, website templates, scripts, and PDFs). Upon successful payment validation, delivery is initiated electronically. You receive access through your customer dashboard\'s "My Downloads" section and a secure download link via email. Direct access to download links may be monitored or rate-limited to prevent bandwidth abuse.'
      },
      {
        id: 'pricing-payments',
        title: '5. Pricing, Taxes & Payment Verification',
        content: 'All prices are listed in Indian Rupees (₹) unless stated otherwise. Prices are subject to revision at the sole discretion of the Proprietor without prior notification. Orders are deemed accepted only after successful payment authorization is confirmed by our integrated payment processors (e.g., Easebuzz). You agree to provide valid billing coordinates and accept responsibility for any local taxes or transaction charges.'
      },
      {
        id: 'refunds-disclaimers',
        title: '6. Refund and Cancellation Rules',
        content: 'Due to the nature of digital products, which are fully accessible immediately after purchase, all transactions are final. Refunds are strictly limited and governed by our Digital Product Refund Policy. Order cancellation is not supported once the file transfer, license key allocation, or vault download link has been electronically provisioned.'
      },
      {
        id: 'intellectual-property',
        title: '7. Proprietary Rights & Content Ownership',
        content: 'All source code, design layouts, digital scripts, documentation, and graphical media available on this site are the intellectual property of [OWNER FULL LEGAL NAME] (except where third-party asset licenses are explicitly declared). Purchasing a product grants you a conditional license and does not transfer copyrights or brand ownership.'
      },
      {
        id: 'liability-limit',
        title: '8. Limitation of Liability & Indemnity',
        content: 'To the maximum extent permitted under Indian law, [OWNER FULL LEGAL NAME] shall not be liable for any direct, indirect, incidental, or consequential damages (including server downtime, loss of business profits, or coding integration failures) arising from the use or inability to use our digital assets. The maximum aggregate liability under any circumstance is strictly capped at the exact amount paid for the specific product.'
      },
      {
        id: 'governing-law',
        title: '9. Governing Law & Jurisdiction',
        content: 'These Terms & Conditions are governed by and construed in accordance with the laws of the Republic of India. Any legal dispute, conflict, or claim arising from your use of this website or purchases made on FFDigital shall be subject to the exclusive jurisdiction of the competent courts located in the city/district of the Proprietor\'s principal place of business.'
      },
      {
        id: 'modifications',
        title: '10. Right to Modify Terms',
        content: 'The Proprietor reserves the absolute right to amend, update, or rewrite these Terms & Conditions at any time to align with business requirements or Indian digital laws. The "Last Revised" date will be updated accordingly, and your continued usage of the website or customer dashboard constitutes your legal assent to the revised terms.'
      }
    ]
  },
  refund: {
    slug: 'refund',
    title: 'Refund & Cancellation Policy',
    subtitle: 'Clear, legally sound parameters concerning digital product downloads, technical non-delivery, and payment gateway issues.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Digital items are intangible and generally non-refundable once delivered or downloaded.',
      'Explicit exception for verified technical delivery failures caused by server faults.',
      'Duplicate gateway charges are fully refundable upon verification.',
      'Strictly adheres to Indian consumer safety guidelines on digital transactions.',
    ],
    sections: [
      {
        id: 'finality-rule',
        title: '1. Finality of Digital Content Sales',
        content: 'All sales of digital products on FFDigital (including downloadable ZIP archives, scripts, code templates, software assets, and PDF guides) are considered final and non-refundable. Because digital goods are delivered instantly and cannot be returned in a physical sense, we do not accept returns, cancellations, or "mind-change" refund claims once the products have been added to your dashboard download vault.'
      },
      {
        id: 'delivery-exception',
        title: '2. Technical Non-Delivery Exception',
        content: 'If you have successfully paid for a digital product but face an access denial or server error that prevents download, please contact us immediately. We will investigate the transaction log and attempt to deliver the assets manually via email or secure cloud link within 48 business hours. If we genuinely cannot deliver the file or resolve the technical block after verification, a full refund of the product purchase price will be issued.'
      },
      {
        id: 'duplicate-charges',
        title: '3. Duplicate Charging Errors',
        content: 'If you were charged multiple times for the same transaction due to a payment gateway timeout, double-submission, or technical glitch, please share the billing screenshot and order ID. Once our payment gateway logs confirm a duplicate payment capture, we will initiate a reverse transaction for the duplicate charge within 3 to 5 business days.'
      },
      {
        id: 'no-cancellation',
        title: '4. Cancellation of Processed Orders',
        content: 'We do not support the cancellation of successful, paid orders. If you change your mind, buy the wrong version, or realize your system does not meet the specified software requirements, we cannot issue a refund. Please read product descriptions, check system specifications, and watch demo videos carefully before purchasing.'
      },
      {
        id: 'refund-timeline',
        title: '5. Refund Processing Timelines',
        content: 'Where a refund is approved by the Proprietor under the technical non-delivery exception, the transaction is reversed via our official payment gateway (e.g., Easebuzz). The funds will reflect in your original payment source (Bank Account, Credit/Debit Card, or Wallet) within 5 to 7 Indian banking days, subject to standard banking settlement schedules.'
      }
    ]
  },
  delivery: {
    slug: 'delivery',
    title: 'Digital Product Delivery Policy',
    subtitle: 'Comprehensive overview of how digital purchases are provisioned, verified, and secured for immediate access.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Zero physical shipping or shipping fees — 100% digital electronic delivery.',
      'Instant access via customer account dashboard and email delivery.',
      'Fulfillment tracked and logged with strict timestamping.',
      'Customer obligation to maintain local backup copies.',
    ],
    sections: [
      {
        id: 'electronic-delivery',
        title: '1. Instant Electronic Delivery Model',
        content: 'FFDigital operates exclusively on a digital-first fulfillment model. We do not dispatch any physical parcels, discs, boxes, or printed documentation. There are no shipping charges or handling fees. Delivery is conducted entirely online and is activated immediately upon successful payment verification.'
      },
      {
        id: 'dashboard-access',
        title: '2. Customer Account & Email Delivery',
        content: 'Once payment is successfully completed, your purchased files are instantly made available in your customer account dashboard under the "My Downloads" tab. Simultaneously, an automated delivery confirmation email containing secure download links is sent to your registered email address. If you do not see the email, please check your spam folder or reach out to support.'
      },
      {
        id: 'delivery-logging',
        title: '3. Download Integrity & Delivery Tracking',
        content: 'To prevent fraud and maintain operational integrity, our server infrastructure logs each download action, including the IP address, timestamp, browser footprint, and download status. Successful file download records from our server logs are treated as definitive proof of delivery. Any claim of technical non-delivery must be verified against these system logs.'
      },
      {
        id: 'local-backups',
        title: '4. Customer Responsibility for Local Backups',
        content: 'Purchasing a digital product from FFDigital grants you access to download the file version current at the time of purchase. While we aim to host download vaults indefinitely, we reserve the right to archive or replace older product files. It is your sole responsibility to download and keep secure local backup copies of your purchased files immediately after purchase.'
      }
    ]
  },
  chargebacks: {
    slug: 'chargebacks',
    title: 'Chargeback & Payment Dispute Policy',
    subtitle: 'Strict legal terms and preventative guidelines regarding payment disputes, unjustified card chargebacks, and online billing.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Customers must submit support tickets before initiating external chargebacks.',
      'Unjustified chargebacks are treated as unauthorized acquisition of digital assets.',
      'Triggers immediate account suspension and license revocation.',
      'Active reporting to payment processors and anti-fraud fraud databases.',
    ],
    sections: [
      {
        id: 'pre-dispute-contact',
        title: '1. Contacting Support First',
        content: 'We are committed to providing smooth digital delivery and technical support. If you face download errors, duplicate charges, or billing confusion, you are required to open a support ticket or email us at our support email before contacting your financial institution. Over 99% of digital delivery issues can be resolved amicably within 24-48 business hours without resorting to formal bank disputes.'
      },
      {
        id: 'unjustified-disputes',
        title: '2. Definition of Unauthorized Disputes',
        content: 'Filing a chargeback or payment dispute with your bank or credit card processor without first attempting to resolve the issue with the Proprietor is considered an unjustified dispute. Because digital goods cannot be physically "returned", opening a dispute while retaining access to downloaded source files or script archives constitutes fraudulent acquisition of intellectual property.'
      },
      {
        id: 'account-banning',
        title: '3. Consequences of Filing Unjustified Chargebacks',
        content: 'Upon receipt of a chargeback notification from our payment processor (Easebuzz/UPI/Cards): (a) Your FFDigital account will be permanently suspended; (b) All license keys, updates, and access to download vaults will be immediately revoked; (c) Your IP and details will be blacklisted across our merchant network; (d) All historical purchases associated with your profile will be audited and deactivated.'
      },
      {
        id: 'legal-recourse',
        title: '4. Reporting & Legal Recourse',
        content: 'Unjustified disputes and payment fraud represent a breach of contract under Indian civil law and the Information Technology Act. We actively submit comprehensive defense dossiers to credit card companies, including server download logs, IP verification, and checkout policy agreements. We also report bad-faith transaction histories to secure payment network databases to protect merchant health.'
      }
    ]
  },
  fraud: {
    slug: 'fraud',
    title: 'Fraud Prevention & Abuse Policy',
    subtitle: 'Operational protocols, automated filters, and legal policies set to eliminate transaction fraud and system abuse.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Prohibits VPN/proxy use, false identities, or stolen payment credentials.',
      'Active logging of IP addresses, geographic location, and checkout metadata.',
      'Immediate referral of financial cyber-fraud to cyber cells.',
      'Proprietor reserves the right to request proof of purchase identity.',
    ],
    sections: [
      {
        id: 'zero-tolerance',
        title: '1. Zero Tolerance for Financial Fraud',
        content: 'FFDigital maintains a strict zero-tolerance stance toward carding, stolen credit cards, fake payment receipts, or any other unauthorized payment methods. Any attempt to use compromised financial credentials to download our premium scripts, source code, or digital templates is treated as theft under the Indian Penal Code and Information Technology Act.'
      },
      {
        id: 'security-monitoring',
        title: '2. Security Filters & Metadata Collection',
        content: 'Our checkout system employs active security filters to identify high-risk orders. We collect, analyze, and log transaction metadata, including user IP address, geographic location, hosting provider details, proxy/VPN status, email age, and session patterns. Orders matching severe risk patterns or using anonymous VPN services will be flagged for manual approval or automatically cancelled.'
      },
      {
        id: 'identity-verification',
        title: '3. Identity Verification Checks',
        content: 'To secure transactions, the Proprietor reserves the absolute right to temporarily hold any download order and request billing identity verification. This may include asking for basic cardholder confirmation or verification from the registered email. Failure to cooperate with security verification checks within 72 hours will result in automatic order cancellation and refund.'
      },
      {
        id: 'criminal-referrals',
        title: '4. Law Enforcement & Cyber Cell Referrals',
        content: 'In cases of confirmed payment fraud, stolen credit cards, or malicious hacking of payment gateways, we do not simply issue a refund. We actively compile and report all transaction details, logged IP addresses, user accounts, and telemetry logs directly to the Indian National Cyber Crime Reporting Portal, local cyber police cells, and secure credit reporting agencies.'
      }
    ]
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'A thorough legal statement detailing how FFDigital handles, stores, and protects personal customer information.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Collected data is utilized strictly for digital delivery and accounting.',
      'No renting, selling, or distributing customer databases to third parties.',
      'PCI-DSS secure gateway integrations safeguard payment transactions.',
      'Complies fully with the Indian Information Technology Act, 2000.',
    ],
    sections: [
      {
        id: 'data-collection',
        title: '1. Information We Collect',
        content: 'To fulfill digital orders, generate official receipts, and deliver support, we collect: (a) Personal Identity Data (Full Name and Email Address); (b) Billing coordinates (Country, State, and PIN/Postal Code); (c) Technical Data (IP addresses, transaction timestamps, browser details, and download logs). We do NOT receive, store, or process raw credit card numbers, bank PINs, or wallet passwords on our servers.'
      },
      {
        id: 'data-usage',
        title: '2. Use of Collected Data',
        content: 'Your personal data is processed strictly for: (a) Provisioning digital products to your secure customer dashboard; (b) Verifying payments via certified processors; (c) Emailing tax invoices and critical technical update alerts; (d) Preventing checkout fraud, chargeback abuse, and unauthorized redistribution; (e) Addressing technical support inquiries.'
      },
      {
        id: 'third-party-sharing',
        title: '3. Restricted Third-Party Data Sharing',
        content: 'FFDigital does not sell, rent, trade, or share your contact info or transaction data with third-party advertising brokers or external marketers. Personal data is shared exclusively with necessary core infrastructure partners under strict confidentiality agreements. This includes our hosting server provider, transactional email dispatch service, and PCI-DSS Level 1 payment gateway (Easebuzz).'
      },
      {
        id: 'data-security',
        title: '4. Server Security & SSL/TLS Encryption',
        content: 'We prioritize customer data security. All session interactions, account logins, and checkout forms are protected using industry-standard Secure Sockets Layer (SSL) and Transport Layer Security (TLS) encryption. Access to server administrative databases is restricted strictly to the Proprietor.'
      },
      {
        id: 'retention-rights',
        title: '5. Data Retention & Customer Privacy Rights',
        content: 'We retain customer identity and download logs for as long as your registered account is active to ensure persistent product downloads. You have the right to request access to your stored personal data, request corrections, or request account deletion, subject to regulatory tax and financial accounting retention periods under Indian laws.'
      }
    ]
  },
  cookies: {
    slug: 'cookies',
    title: 'Cookie Policy',
    subtitle: 'Transparent disclosures regarding cookies, session tracking, and user browser preferences.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Uses essential cookies only to maintain shopping carts and login state.',
      'No invasive advertising, retargeting, or tracking cookies implemented.',
      'Cookies are stored locally on your device for session duration.',
      'Fully customizable through your standard web browser preferences.',
    ],
    sections: [
      {
        id: 'what-are-cookies',
        title: '1. Understanding Browser Cookies',
        content: 'Cookies are small text files stored locally on your computer or mobile device by websites you visit. They are widely used to make websites work more efficiently, enable secure features, and provide core shopping functionality.'
      },
      {
        id: 'essential-cookies',
        title: '2. Essential First-Party Cookies',
        content: 'FFDigital uses essential first-party session cookies to manage core website services: (a) Shopping Cart Integrity: Remembering the digital products you have added while you browse other pages; (b) Account Authentication: Keeping you securely logged in to your download dashboard as you navigate; (c) Security Tokens: Shielding our checkout forms against Cross-Site Request Forgery (CSRF) attacks.'
      },
      {
        id: 'no-tracking',
        title: '3. No Tracking or Retargeting Cookies',
        content: 'We respect user privacy and focus on utility. We do not integrate third-party tracking pixels, invasive advertising cookies, behavioral retargeting codes, or cross-site tracking scripts. Our analytics cookies are anonymized and used solely to count page views and check server performance.'
      },
      {
        id: 'browser-control',
        title: '4. Customizing Cookie Preferences',
        content: 'You can control, block, or delete cookies directly through your browser\'s settings menu. Please note that blocking essential cookies will prevent our shopping cart, login verification, and secure payment systems from operating correctly.'
      }
    ]
  },
  'ip-copyright': {
    slug: 'ip-copyright',
    title: 'Intellectual Property & Copyright Policy',
    subtitle: 'Legal regulations declaring absolute ownership of source files, templates, and protection clauses.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'All source codes, graphics, and written materials are fully copyrighted.',
      'Created and owned strictly by individual Proprietor [OWNER FULL LEGAL NAME].',
      'No resale, redistribution, or modification for competing purposes.',
      'Active legal protection under the Indian Copyright Act, 1957.',
    ],
    sections: [
      {
        id: 'proprietor-ownership',
        title: '1. Absolute Content & Design Ownership',
        content: 'All files, digital products, templates, scripts, graphics, source codes, guides, and textual materials published on FFDigital are the exclusive intellectual property of the Proprietor, [OWNER FULL LEGAL NAME]. These assets are protected by Indian copyright laws, international treaties, and trademark regulations. Unlicensed reproduction or piracy is strictly prohibited.'
      },
      {
        id: 'no-commercial-resale',
        title: '2. Prohibiting Secondary Resale & Redistribution',
        content: 'Purchasing a digital asset from our store provides a single usage license as outlined in our Digital License Policy. Under no circumstances are you permitted to: (a) Re-sell, sublicense, or distribute the source files standalone; (b) Host downloaded files on public repositories, forums, or cloud links; (c) Bundle our assets inside other templates, packages, or market builders to sell under your own name.'
      },
      {
        id: 'anti-piracy',
        title: '3. Anti-Piracy Monitoring',
        content: 'We actively scan public digital networks, code-sharing forums, group-buy sites, and template platforms for copyrighted assets belonging to FFDigital. We apply technical markers inside our script source codes to trace leaked files back to the corresponding customer order and account.'
      },
      {
        id: 'copyright-enforcement',
        title: '4. Copyright Infringement & Legal Action',
        content: 'If an unauthorized distribution, leak, or resale of our digital assets is detected: (a) Your buyer license will be immediately terminated; (b) We will issue formal DMCA takedown requests to hosting providers and web registrars; (c) We reserve the right to initiate legal proceedings for copyright infringement and monetary damages under the Indian Copyright Act, 1957, and relevant provisions of the IT Act, 2000.'
      }
    ]
  },
  license: {
    slug: 'license',
    title: 'Digital Product License',
    subtitle: 'The legal framework defining permitted usages, single-user limitations, and commercial boundaries of downloaded assets.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Grants a limited, non-exclusive, non-transferable single-user license.',
      'Authorized for use in personal or client commercial projects.',
      'No file extraction, repackaging, or re-selling allowed.',
      'Violation results in immediate license deactivation and legal dispute.',
    ],
    sections: [
      {
        id: 'license-grant',
        title: '1. Limited Single-User License Grant',
        content: 'When you purchase a digital product (source code, script, template, utility, etc.) from FFDigital, you are not buying the underlying copyright or ownership. Instead, [OWNER FULL LEGAL NAME] grants you a limited, non-exclusive, non-transferable, revocable single-user license. This license allows you to download and use the product in accordance with these terms.'
      },
      {
        id: 'permitted-uses',
        title: '2. Permitted Commercial & Personal Uses',
        content: 'Under this license, you are authorized to: (a) Use the code/template for your own personal website or application; (b) Use the code/template for exactly one client project, provided the client receives the finished compiled application and does not have direct access to our raw source ZIP; (c) Customize, modify, or extend the source code to suit your technical requirements.'
      },
      {
        id: 'prohibited-actions',
        title: '3. Prohibited Redistribution & Reselling',
        content: 'The following activities are strictly prohibited under this license: (a) Distributing, sharing, leaking, or sublicensing the raw source files or assets to any third party; (b) Creating a derivative digital product (e.g., modified script or layout) and selling it on competing template markets; (c) Using our assets to build software-as-a-service (SaaS) white-label platforms where end-users can copy or extract our raw design/source code.'
      },
      {
        id: 'termination',
        title: '4. License Deactivation & Termination',
        content: 'This license auto-terminates immediately if you violate any restriction. Upon termination: (a) You must destroy all local copies of the downloaded source files; (b) Your customer account on FFDigital will be closed; (c) You must immediately take down any website, project, or application utilizing our proprietary scripts or templates.'
      }
    ]
  },
  'acceptable-use': {
    slug: 'acceptable-use',
    title: 'Acceptable Use Policy',
    subtitle: 'System regulations regarding proper behavior, security standards, and strict system compliance requirements.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Prohibits web scrapers, automated downloading scripts, and crawlers.',
      'Bans reverse-engineering, vulnerability testing, and server spamming.',
      'Assets must not be integrated into malicious or infringing projects.',
      'IP blacklisting and legal action will protect hosting infrastructure.',
    ],
    sections: [
      {
        id: 'authorized-behavior',
        title: '1. Authorized Use of Services',
        content: 'You agree to use FFDigital and its secure dashboard strictly for authorized purposes (i.e., browsing available digital catalog listings, completing purchases, and downloading acquired assets for legitimate projects).'
      },
      {
        id: 'scraping-scrapers',
        title: '2. Prohibiting Scrapers and Automated Tools',
        content: 'You are strictly prohibited from using automated scripts, web scrapers, curl commands, spiders, crawlers, or high-volume request utilities to: (a) Extract product listings, descriptions, or visual assets; (b) Bypass payment checkouts to directly scrape direct download links; (c) Place mock orders or create fake user profiles.'
      },
      {
        id: 'malicious-activities',
        title: '3. Prohibiting Security Attacks & Vulnerability Hacking',
        content: 'You must not attempt to compromise the security or integrity of our systems. This includes: (a) Uploading or sending malicious scripts, viruses, or payloads; (b) Attempting to bypass download rate-limits; (c) Performing unauthorized vulnerability scans or pen-testing without the Proprietor\'s written consent; (d) Executing DDoS (Distributed Denial of Service) attacks.'
      },
      {
        id: 'ip-blocking',
        title: '4. Infrastructure Protection & IP Blocking',
        content: 'We actively monitor server traffic. Any IP address, hosting network, or account found violating this Acceptable Use Policy will be instantly and permanently blacklisted. We reserve the right to deploy Cloudflare/hosting firewalls to prevent network abuse and ensure continuous uptime for legitimate buyers.'
      }
    ]
  },
  security: {
    slug: 'security',
    title: 'Account & Website Security Policy',
    subtitle: 'Technical specifications, administrative safeguards, and user security responsibilities on FFDigital.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Encryption protects user password hashes and customer session data.',
      'Sharing credentials or leaking download tokens is strictly prohibited.',
      'Automated rate-limiters lock out profiles on concurrent active logins.',
      'Vulnerability disclosure guidelines for technical security reporting.',
    ],
    sections: [
      {
        id: 'encryption-standards',
        title: '1. Technical Security Measures',
        content: 'FFDigital employs rigorous security measures to protect customer information. All interactive checkout workflows, login forms, and account settings are secured with active SSL/TLS encryption protocols. User account passwords are encrypted and hashed before being stored in our administrative database, ensuring even database managers cannot read raw passwords.'
      },
      {
        id: 'credential-safekeeping',
        title: '2. Customer Account Safeguards',
        content: 'Your account is intended for your personal, individual use only. You are strictly responsible for maintaining strong, unique passwords and safeguarding your credentials. You agree to notify us immediately if you suspect any unauthorized access to your email or customer dashboard.'
      },
      {
        id: 'concurrent-logins',
        title: '3. Anti-Credential Sharing Controls',
        content: 'Our backend uses session-tracking tokens to detect concurrent logins. If our system flags multiple active sessions from different geographical coordinates or distinct ISPs simultaneously, it will treat it as unauthorized credential sharing. The account will be temporarily locked, download links will be invalidated, and you must verify identity via support to regain access.'
      },
      {
        id: 'responsible-disclosure',
        title: '4. Ethical Security & Responsible Disclosure',
        content: 'We welcome reports regarding genuine technical security bugs. If you discover a vulnerability or coding security loophole on our website, please report it privately to our grievance officer. Do not disclose the issue publicly, use it to bypass checkouts, or execute malicious hacks. We will address valid security issues promptly.'
      }
    ]
  },
  disclaimer: {
    slug: 'disclaimer',
    title: 'Website Disclaimer',
    subtitle: 'Legally cautious clauses detailing warranty exemptions, support boundaries, and operational limits of sold files.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'All digital templates, tools, and code are provided completely "as is".',
      'No explicit or implicit warranties regarding compatibility or financial outcomes.',
      'Customer assumes complete integration and system compatibility risks.',
      'No legal liability is accepted for secondary hosting or coding costs.',
    ],
    sections: [
      {
        id: 'as-is-basis',
        title: '1. Provided "As Is" and "As Available"',
        content: 'All digital templates, scripts, source codes, PDF resources, video walkthroughs, and technical software sold on FFDigital are provided strictly on an "as is" and "as available" basis. The Proprietor makes no warranties, express or implied, regarding the continuous operation of products, compatibility with all future third-party frameworks, or complete error-free execution under custom setups.'
      },
      {
        id: 'no-guarantee',
        title: '2. No Income or Business Guarantee',
        content: 'FFDigital provides high-quality software utilities, development tools, and design packages. However, purchasing or utilizing our source files does not guarantee any specific financial return, web traffic, business expansion, or operational outcome. You are solely responsible for your own marketing, business administration, and software customization.'
      },
      {
        id: 'user-integration',
        title: '3. Compatibility and Technical Integration Risk',
        content: 'You assume complete responsibility for ensuring your web host, PHP version, database server, and terminal environment match the specifications published on each product details page. The Proprietor does not provide complimentary server configurations, custom system upgrades, or coding modifications to adapt our templates to your custom setups.'
      },
      {
        id: 'third-party-dependencies',
        title: '4. Third-Party Libraries Disclaimer',
        content: 'Certain digital assets may rely on external third-party software libraries, APIs, or scripts (e.g., React, Tailwind, PayPal SDKs, etc.). We are not responsible for updates, changes, shutdowns, or compatibility breakages caused by independent third-party developers.'
      }
    ]
  },
  grievance: {
    slug: 'grievance',
    title: 'Grievance Redressal Policy',
    subtitle: 'Our formal grievance mechanisms compliant with Indian IT Act 2000 and Consumer Protection Rules.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Grievance redressal mechanism under Indian Information Technology laws.',
      'Grievance Officer: [OWNER FULL LEGAL NAME] (Proprietor).',
      'Direct contact support via grievance-specific email.',
      'Strict legal response timeline: Acknowledge (48 hours), Resolve (1 month).',
    ],
    sections: [
      {
        id: 'legal-framework',
        title: '1. Redressal Framework & Indian Compliance',
        content: 'In compliance with the Information Technology Act, 2000, and the Consumer Protection (E-Commerce) Rules, 2020, FFDigital has established a structured Grievance Redressal Mechanism to address customer complaints, cyber-fraud queries, and billing disputes in a lawful and transparent manner.'
      },
      {
        id: 'grievance-officer',
        title: '2. Appointed Grievance Officer',
        content: 'For any formal complaints, legal inquiries, copyright claims, or technical disputes that could not be resolved by our standard support desk, you may contact our Grievance Officer directly: \n\n• Officer Name: [OWNER FULL LEGAL NAME] \n• Designation: Proprietor & Grievance Officer \n• Principal Business Address: [FULL BUSINESS / PRINCIPAL ADDRESS] \n• Grievance Redressal Email: [GRIEVANCE EMAIL] \n• Support Hours: Mon-Fri, 10:00 AM - 6:00 PM IST.'
      },
      {
        id: 'handling-timeline',
        title: '3. Submission Procedure & Resolution Timeline',
        content: 'To submit a formal grievance, you must write to our Grievance Redressal Email with your Registered Email, Order ID, Transaction Number, and a clear description of the complaint. Our officer will: (a) Acknowledge receipt of the complaint within 48 business hours; (b) Conduct a thorough internal system audit; (c) Work to resolve the grievance or provide a formal decision within 30 days of the receipt.'
      },
      {
        id: 'jurisdiction-disputes',
        title: '4. Scope of Grievances',
        content: 'Grievance redressal is strictly limited to issues concerning technical download blocks, gateway transaction confirmation issues, billing errors, or copyright ownership disputes on our website. Please note that custom software customization requests, server-side debugging help, or user programming questions do not fall under the purview of formal grievances.'
      }
    ]
  },
  'contact-support': {
    slug: 'contact-support',
    title: 'Contact & Support Policy',
    subtitle: 'Support hours, communication guidelines, and the operational boundaries of our developer assistance.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Customer support available Mon-Fri, 10:00 AM to 6:00 PM IST.',
      'Official contact coordinates: [SUPPORT EMAIL] and [BUSINESS PHONE].',
      'Covers download bugs and product defects only.',
      'Excludes free programming tutorials and custom database setup.',
    ],
    sections: [
      {
        id: 'support-hours',
        title: '1. Standard Technical Support Hours',
        content: 'Our support desk is operated directly by the Proprietor of FFDigital. Technical support and communication are available from Monday to Friday, 10:00 AM to 6:00 PM Indian Standard Time (IST). Tickets or emails received during weekends, national holidays, or off-hours will be queued and reviewed on the subsequent business day.'
      },
      {
        id: 'contact-channels',
        title: '2. Official Contact Coordinates',
        content: 'To receive technical assistance or submit purchase queries, please reach out through our official channels: \n\n• Primary Support Email: [SUPPORT EMAIL] \n• Customer Support Phone: [BUSINESS PHONE] \n• Principal Business Address: [FULL BUSINESS / PRINCIPAL ADDRESS] \n• Grievance Redressal: [GRIEVANCE EMAIL]'
      },
      {
        id: 'support-scope',
        title: '3. Scope of Technical Support',
        content: 'Our complimentary support is strictly limited to: (a) Resolving purchase validation and login bugs; (b) Refreshing expired or corrupted download links; (c) Investigating transaction processing issues; (d) Addressing built-in file bugs. We do NOT provide free customized programming, integration tutorials, host configuration help, or debugging for third-party scripts.'
      },
      {
        id: 'communication-code',
        title: '4. Professional Communication Code',
        content: 'We treat all our customers with absolute respect and professionalism, and we expect the same in return. Any communication containing abusive language, threats, spamming of multiple tickets, or unfounded fraud accusations will result in immediate suspension of technical support and deactivation of download privileges.'
      }
    ]
  },
  'content': {
    slug: 'content',
    title: 'Content Policy',
    subtitle: 'Official guidelines regarding digital file hosting, content integrity, and intellectual property on FFDigital.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Declares ownership over all scripts, codes, graphics, and documentation.',
      'Prohibits illegal resale, hotlinking, or redistribution of files.',
      'Allows user customizations for personal and client project implementation.',
      'Active enforcement under copyright laws and intellectual property treaties.',
    ],
    sections: [
      {
        id: 'content-ownership',
        title: '1. Content Integrity & Intellectual Property',
        content: 'All digital products, source files, design layouts, documentation, visual images, and assets hosted on FFDigital are the copyright of the Proprietor. These digital assets are protected by the Indian Copyright Act of 1957. Unauthorized copying, standalone redistribution, or unlicensed usage of any hosted content is strictly forbidden.'
      },
      {
        id: 'license-and-usage',
        title: '2. Permitted Modification & Usage',
        content: 'Buying a digital template or script provides you with a single-user license. You are permitted to customize and edit the content to fit your technical design. However, compiling or redistributing modified codes as competitor store templates is a violation of this Content Policy.'
      },
      {
        id: 'takedown-dmca',
        title: '3. Copyright Grievances and DMCA Takedowns',
        content: 'We respect the intellectual property rights of creators. If you believe any files hosted on our platform infringe upon your copyright, please report it immediately with proper documentation to our Grievance Officer. Valid reports will be investigated and addressed within 48 business hours.'
      }
    ]
  },
  'shipping-delivery': {
    slug: 'shipping-delivery',
    title: 'Shipping & Delivery Policy',
    subtitle: 'Our transparent guidelines explaining digital-first electronic delivery schedules and download access.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Instant electronic provisioning upon payment confirmation — zero physical shipping.',
      'Direct account dashboard access and automated download token delivery.',
      'Permanent download logs track the receipt of all purchase orders.',
      'Duty of the customer to preserve local backup copies.',
    ],
    sections: [
      {
        id: 'digital-shipping',
        title: '1. Electronic Shipping Model',
        content: 'FFDigital specializes exclusively in downloadable software, scripts, and website templates. We do not ship physical packages, discs, or written manuals. Consequently, there are no physical shipping charges, import taxes, or delayed delivery schedules. Delivery is conducted entirely online.'
      },
      {
        id: 'fulfillment',
        title: '2. Delivery Timelines & Account Access',
        content: 'Fulfillments are fully automated. Immediately after a successful checkout transaction, download links are provisioned directly to your active customer dashboard. A confirmation email with secure backup download tokens is also sent to your registered coordinates. Delivery is instant (completed within seconds of payment capture).'
      },
      {
        id: 'responsibility',
        title: '3. Download Preservation & Backups',
        content: 'Once file delivery is logged on our servers, it is considered completed. Please download your files and store a secure local backup copy immediately to ensure you retain access even during scheduled server maintenance.'
      }
    ]
  }
};

const replacePlaceholders = (text: string): string => {
  return text
    .replace(/\[OWNER FULL LEGAL NAME\]/g, 'Prankrishna Das')
    .replace(/\[SUPPORT EMAIL\]/g, 'connectwithvexora@gmail.com')
    .replace(/\[GRIEVANCE EMAIL\]/g, 'connectwithvexora@gmail.com')
    .replace(/\[BUSINESS PHONE\]/g, '+91 9793970031')
    .replace(/\[DATE\]/g, 'September 22, 2026')
    .replace(/\[FULL BUSINESS \/ PRINCIPAL ADDRESS\]/g, 'Registered & Operating Address: House no 417, Near Santosh Tea stall, labour chauraha, shantipuram, Prayagraj, UTTAR PRADESH, Pin: 211013 (Permanent Address: 02 No Takimari, Mantadari, PO: Milanpally, Dist: Jalpaiguri, West Bengal - 735133, India)');
};

const processedPolicyData: Record<string, Policy> = {};

Object.entries(rawPolicyData).forEach(([key, policy]) => {
  processedPolicyData[key] = {
    ...policy,
    subtitle: replacePlaceholders(policy.subtitle),
    lastUpdated: replacePlaceholders(policy.lastUpdated),
    quickSummary: policy.quickSummary.map(item => replacePlaceholders(item)),
    sections: policy.sections.map(section => ({
      ...section,
      title: replacePlaceholders(section.title),
      content: typeof section.content === 'string' ? replacePlaceholders(section.content) : section.content,
    })),
  };
});

export const policyData = processedPolicyData;
