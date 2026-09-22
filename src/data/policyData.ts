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
    subtitle: 'The official binding agreement governing customer access, account creation, and digital template orders on FFDigital.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Operated solely as an individual proprietorship by Owner / Proprietor Prankrishna Das.',
      'Customer must enter accurate contact details, email, and Indian mobile number.',
      'FFDigital is not responsible for delivery delays or failures caused by incorrect details entered by customer.',
      'Digital products, website templates, and software licenses cannot be cancelled once downloaded or delivered.',
      'Abuse, fraud, chargeback misuse, or fake payment proof will result in order cancellation and legal action.',
    ],
    sections: [
      {
        id: 'operator-identity',
        title: '1. Operator Identity & Business Structure',
        content: 'FFDigital (https://www.ffdigital.shop/) is an Indian digital e-commerce platform operated exclusively by Prankrishna Das, acting as the Sole Proprietor. FFDigital specializes in premium website templates, React templates, HTML/CSS/JavaScript templates, SaaS templates, e-commerce templates, admin dashboards, source code, scripts, and digital developer assets. \n\n• Proprietor Name: Prankrishna Das \n• Brand Name: FFDigital \n• Registered Address: House no 417, Near Santosh Tea stall, Labour Chauraha, Shantipuram, Prayagraj, Uttar Pradesh - 211013, India \n• Permanent Address: 02 No Takimari, Mantadari, PO: Milanpally, Dist: Jalpaiguri, West Bengal - 735133, India \n• Support Email: ffdigital.support@gmail.com \n• Phone: +91 9793970031 \n• Support Timing: Monday to Saturday, 10:00 AM to 6:00 PM IST'
      },
      {
        id: 'binding-agreement',
        title: '2. Binding Legal Agreement',
        content: 'By accessing this website, placing an order, registering an account, or submitting payment for any digital product, template, or software asset on FFDigital, you agree to be bound in full by these Terms & Conditions, the Refund Policy, Privacy Policy, and Shipping & Delivery Policy. If you do not agree to these terms, you must discontinue using this website immediately.'
      },
      {
        id: 'customer-obligation',
        title: '3. Customer Accuracy & Input Obligations',
        content: 'When placing an order on FFDigital, the customer is strictly required to provide accurate, truthful, and verified details, including your full legal name, registered email address, and active Indian mobile number. FFDigital executes digital deliveries and download access based on the exact information submitted by the customer. FFDigital is NOT responsible for delays, failed delivery, or incorrect access resulting from wrong, mistyped, or inaccurate details entered by the customer.'
      },
      {
        id: 'digital-product-delivery',
        title: '4. Digital Delivery & Fulfillment Methods',
        content: 'All products and services offered on FFDigital are 100% digital and intangible (such as downloadable website templates, React components, source code packages, developer scripts, and software assets). Delivery is executed electronically via instant download access, email dispatch, and the customer dashboard order panel. Expected delivery is instantaneous and takes between 5 minutes and 24 hours following payment confirmation. No physical shipping is applicable.'
      },
      {
        id: 'pricing-payments',
        title: '5. Pricing, Currency & Payment Gateways',
        content: 'All product prices are quoted in Indian Rupees (₹ INR). Payments are collected through certified Indian payment gateways (such as Easebuzz and CCAvenue) utilizing secure encryption, UPI, Net Banking, and Debit/Credit Cards. Orders are processed only after positive settlement authorization from our payment gateway partners.'
      },
      {
        id: 'cancellation-restriction',
        title: '6. Cancellation Restrictions',
        content: 'Due to the instantaneous and irrevocable nature of digital downloadable goods and source code files, digital products and website templates CANNOT be cancelled, recalled, or reversed once delivery, download link generation, or digital file access has been completed.'
      },
      {
        id: 'fraud-anti-abuse',
        title: '7. Anti-Fraud, Abuse & Chargeback Misuse',
        content: 'Any attempt to defraud FFDigital, submit counterfeit payment screenshots, make fraudulent claims, or initiate unjustified bank chargebacks after successful delivery will result in immediate permanent account termination, forfeiture of unfulfilled orders, and filing of formal cybercrime complaints with Indian law enforcement.'
      },
      {
        id: 'liability-limit',
        title: '8. Limitation of Liability',
        content: 'To the fullest extent permitted by Indian law, Prankrishna Das and FFDigital shall not be liable for third-party hosting downtimes, external framework updates, or indirect operational losses. Our total financial liability under any circumstance is strictly capped at the purchase price paid for the specific order.'
      },
      {
        id: 'governing-law',
        title: '9. Governing Law & Jurisdiction',
        content: 'These Terms & Conditions are governed by and construed in accordance with the laws of the Republic of India. Any legal dispute arising under or in connection with FFDigital shall be subject to the exclusive jurisdiction of the competent courts in India.'
      },
      {
        id: 'support-coordination',
        title: '10. Customer Support Contact',
        content: 'For questions regarding these Terms, contact us during operational hours (Monday to Saturday, 10:00 AM to 6:00 PM IST) at ffdigital.support@gmail.com or via telephone at +91 9793970031.'
      }
    ]
  },
  refund: {
    slug: 'refund',
    title: 'Refund & Cancellation Policy',
    subtitle: 'Transparent, consumer-friendly refund procedures and eligibility guidelines for digital templates and source code on FFDigital.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Clear, formal refund evaluation process for all transactions on FFDigital.',
      'Refunds applicable if order is not delivered, wrong product delivered, duplicate payment occurs, or payment deducted on failed orders.',
      'Refunds are strictly not applicable after successful digital delivery or source code download.',
      'Customer can request a refund via email (ffdigital.support@gmail.com) or phone (+91 9793970031).',
      'Approved refunds are credited to the original payment source within 5 to 7 working days.',
      'Customer support available Monday to Saturday, 10:00 AM to 6:00 PM IST.',
    ],
    sections: [
      {
        id: 'refund-eligibility',
        title: '1. Refund Eligibility & Applicable Scenarios',
        content: 'At FFDigital, customer satisfaction and trust are paramount. Refunds are evaluated and granted under the following clear circumstances: \n\n• Order Not Delivered: The digital download link has not been generated or delivered within 24 hours of successful payment confirmation and technical support is unable to complete the delivery. \n• Wrong Product Delivered: The delivered template or file package does not match the purchased specification due to an error on our part. \n• Duplicate Transaction / Double Billing: Multiple debits occurred for a single order due to payment gateway timeout or technical failure. \n• Payment Deducted but Order Failed: Payment was debited from your bank account or UPI wallet, but the transaction timed out or failed to generate an active order.'
      },
      {
        id: 'non-refundable',
        title: '2. Non-Refundable Situations',
        content: 'Refunds are NOT applicable in the following situations: \n\n• Successful Digital Delivery: Once a digital product, website template, source code package, or download link has been successfully processed, delivered, or accessed. \n• Incorrect Details Entered by Customer: FFDigital is not responsible for failed or misdirected deliveries if the customer entered an incorrect email address. \n• Change of Mind: Cancellations or refund requests based on change of mind after payment has been authorized and download access has been provided.'
      },
      {
        id: 'refund-process',
        title: '3. Step-by-Step Refund Request Process',
        content: 'To request a refund, please follow these simple steps: \n\n1. Contact our support desk by emailing ffdigital.support@gmail.com or calling +91 9793970031 during working hours (Monday to Saturday, 10:00 AM to 6:00 PM IST). \n2. Provide your Order ID, Payment Proof (Bank / Gateway Transaction UTR or reference receipt), Registered Mobile Number or Email, and a clear explanation of the issue. \n3. Our customer support team will verify the payment gateway transaction log and delivery status within 24 to 48 business hours.'
      },
      {
        id: 'refund-timeline',
        title: '4. Refund Processing Timelines & Method',
        content: 'Once your refund request is approved, the refund is initiated directly through our official payment gateway (Easebuzz / CCAvenue). The funds will be credited back to the original payment method (Bank Account, UPI ID, Credit/Debit Card, or Net Banking) within 5 to 7 working days, subject to your issuing bank\'s settlement schedule.'
      },
      {
        id: 'order-cancellation',
        title: '5. Order Cancellation Rules',
        content: 'Because orders for digital templates and source code downloads are placed into immediate automated fulfillment, orders cannot be cancelled once digital delivery or file download has occurred. If you made an error and wish to cancel before download access has been utilized or delivered, contact us immediately at ffdigital.support@gmail.com or +91 9793970031. If delivery has not commenced, our team will cancel the order and process a full refund within 5 to 7 working days.'
      }
    ]
  },
  delivery: {
    slug: 'delivery',
    title: 'Shipping & Delivery Policy',
    subtitle: 'Official digital delivery guidelines for all templates, source code, and electronic products on FFDigital.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'FFDigital sells exclusively digital downloadable products, website templates, and source code.',
      'Delivery is 100% digital via instant dashboard download, email dispatch, or order panel.',
      'Expected delivery window: instant to within 5 minutes to 24 hours after successful payment.',
      'No physical shipping or shipping fees apply.',
      'Zero shipping charges across all digital assets.',
    ],
    sections: [
      {
        id: 'digital-nature',
        title: '1. Digital Goods & Electronic Delivery Model',
        content: 'FFDigital sells exclusively digital software products and electronic services (including website templates, React templates, HTML/CSS/JS themes, SaaS starter kits, admin dashboards, scripts, and digital assets). No physical parcels, discs, boxes, or printed paperwork are shipped. There are zero shipping or handling fees.'
      },
      {
        id: 'delivery-channels',
        title: '2. Delivery Channels & Methods',
        content: 'Fulfillment is conducted entirely online through the following channels: \n\n• Instant Customer Dashboard Download: Immediate access to source code ZIP packages directly from your customer account page upon successful payment. \n• Email Dispatch: Digital invoice, secure download links, and setup documentation sent to your registered email address. \n• Order Confirmation Page: Direct one-click download access available immediately on the post-checkout confirmation screen.'
      },
      {
        id: 'delivery-timeframe',
        title: '3. Expected Delivery Timelines',
        content: 'Orders are typically fulfilled instantly (within 5 minutes to 24 hours) following successful payment verification by our payment gateway. You will receive an instant electronic confirmation as soon as fulfillment is complete.'
      },
      {
        id: 'potential-delays',
        title: '4. Potential Causes for Delivery Delays',
        content: 'While we strive for instantaneous fulfillment, delivery delays may occasionally occur due to: \n\n• Incorrect or mistyped email address submitted by the customer. \n• Payment gateway fraud check or banking verification hold. \n• Temporary network interruption during payment webhook processing. \n\nIf your order has not been delivered within 24 hours, please contact our support team immediately at ffdigital.support@gmail.com for prioritized manual resolution.'
      },
      {
        id: 'support-hours',
        title: '5. Fulfillment Assistance & Contact',
        content: 'Our fulfillment and support desk operates Monday to Saturday, 10:00 AM to 6:00 PM IST. For any delivery questions or status checks, email ffdigital.support@gmail.com or call +91 9793970031.'
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
      'Active reporting to payment processors and anti-fraud databases.',
    ],
    sections: [
      {
        id: 'pre-dispute-contact',
        title: '1. Contacting Support First',
        content: 'We are committed to providing smooth digital delivery and technical support. If you face download errors, duplicate charges, or billing confusion, you are required to open a support ticket or email us at ffdigital.support@gmail.com before contacting your financial institution. Over 99% of digital delivery issues can be resolved amicably within 24-48 business hours without resorting to formal bank disputes.'
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
        content: 'Your personal data is processed strictly for: (a) Provisioning digital products and website templates to your secure customer dashboard; (b) Verifying payments via certified processors; (c) Emailing tax invoices and critical technical update alerts; (d) Preventing checkout fraud, chargeback abuse, and unauthorized redistribution; (e) Addressing technical support inquiries.'
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
        content: 'FFDigital uses essential first-party session cookies to manage core website services: (a) Shopping Cart Integrity: Remembering the digital products and templates you have added while you browse other pages; (b) Account Authentication: Keeping you securely logged in to your download dashboard as you navigate; (c) Security Tokens: Shielding our checkout forms against Cross-Site Request Forgery (CSRF) attacks.'
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
      'Created and owned strictly by individual Proprietor Prankrishna Das.',
      'No resale, redistribution, or modification for competing purposes.',
      'Active legal protection under the Indian Copyright Act, 1957.',
    ],
    sections: [
      {
        id: 'proprietor-ownership',
        title: '1. Absolute Content & Design Ownership',
        content: 'All files, digital products, templates, scripts, graphics, source codes, guides, and textual materials published on FFDigital are the exclusive intellectual property of the Proprietor, Prankrishna Das. These assets are protected by Indian copyright laws, international treaties, and trademark regulations. Unlicensed reproduction or piracy is strictly prohibited.'
      },
      {
        id: 'no-commercial-resale',
        title: '2. Prohibiting Secondary Resale & Redistribution',
        content: 'Purchasing a digital asset or template from our store provides a single usage license as outlined in our Digital License Policy. Under no circumstances are you permitted to: (a) Re-sell, sublicense, or distribute the source files standalone; (b) Host downloaded files on public repositories, forums, or cloud links; (c) Bundle our assets inside other templates, packages, or market builders to sell under your own name.'
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
        content: 'When you purchase a digital product (source code, script, template, utility, etc.) from FFDigital, you are not buying the underlying copyright or ownership. Instead, Prankrishna Das grants you a limited, non-exclusive, non-transferable, revocable single-user license. This license allows you to download and use the product in accordance with these terms.'
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
        content: 'All digital templates, scripts, source codes, PDF resources, documentation, and technical software sold on FFDigital are provided strictly on an "as is" and "as available" basis. The Proprietor makes no warranties, express or implied, regarding the continuous operation of products, compatibility with all future third-party frameworks, or complete error-free execution under custom setups.'
      },
      {
        id: 'no-guarantee',
        title: '2. No Income or Business Guarantee',
        content: 'FFDigital provides high-quality software utilities, development tools, and design packages. However, purchasing or utilizing our source files does not guarantee any specific financial return, web traffic, business expansion, or operational outcome. You are solely responsible for your own marketing, business administration, and software customization.'
      },
      {
        id: 'user-integration',
        title: '3. Compatibility and Technical Integration Risk',
        content: 'You assume complete responsibility for ensuring your web host, runtime environment, Node.js version, database server, and terminal environment match the specifications published on each product details page. The Proprietor does not provide complimentary server configurations, custom system upgrades, or coding modifications to adapt our templates to your custom setups.'
      },
      {
        id: 'third-party-dependencies',
        title: '4. Third-Party Libraries Disclaimer',
        content: 'Certain digital assets may rely on external third-party software libraries, APIs, or scripts (e.g., React, Tailwind CSS, etc.). We are not responsible for updates, changes, shutdowns, or compatibility breakages caused by independent third-party developers.'
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
      'Grievance Officer: Prankrishna Das (Proprietor).',
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
        content: 'For any formal complaints, legal inquiries, copyright claims, or technical disputes that could not be resolved by our standard support desk, you may contact our Grievance Officer directly: \n\n• Officer Name: Prankrishna Das \n• Designation: Proprietor & Grievance Officer \n• Principal Business Address: House no 417, Near Santosh Tea stall, Labour Chauraha, Shantipuram, Prayagraj, Uttar Pradesh - 211013, India | Permanent Address: 02 No Takimari, Mantadari, PO: Milanpally, Dist: Jalpaiguri, West Bengal - 735133, India \n• Grievance Redressal Email: ffdigital.support@gmail.com \n• Support Hours: Monday to Saturday, 10:00 AM to 6:00 PM IST.'
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
    subtitle: 'Support hours, communication guidelines, and customer assistance coordinates on FFDigital.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Customer support available Monday to Saturday, 10:00 AM to 6:00 PM IST.',
      'Official contact coordinates: ffdigital.support@gmail.com and +91 9793970031.',
      'Operated directly by Owner / Proprietor Prankrishna Das.',
      'Assistance for order delivery, payment verification, and technical issues.',
    ],
    sections: [
      {
        id: 'support-hours',
        title: '1. Official Customer Support Hours',
        content: 'Our customer support desk is operated directly by Prankrishna Das, Sole Proprietor of FFDigital. Customer support is available from Monday to Saturday, 10:00 AM to 6:00 PM Indian Standard Time (IST). Queries received outside operational hours or on national holidays are queued and answered on the next business day.'
      },
      {
        id: 'contact-channels',
        title: '2. Official Contact Coordinates',
        content: 'To reach our team for assistance, order queries, or payment status: \n\n• Brand Name: FFDigital \n• Owner / Proprietor: Prankrishna Das \n• Primary Support Email: ffdigital.support@gmail.com \n• Customer Support Phone: +91 9793970031 \n• Operational Hours: Monday to Saturday, 10:00 AM to 6:00 PM IST \n• Registered Address: House no 417, Near Santosh Tea stall, Labour Chauraha, Shantipuram, Prayagraj, Uttar Pradesh - 211013, India \n• Permanent Address: 02 No Takimari, Mantadari, PO: Milanpally, Dist: Jalpaiguri, West Bengal - 735133, India'
      },
      {
        id: 'support-scope',
        title: '3. Scope of Support Services',
        content: 'FFDigital provides assistance for: (a) Digital download access and file retrieval; (b) Payment gateway receipt verification and transaction inquiries; (c) Digital template unzip and setup documentation guidance; (d) Processing valid refund requests as per our Refund Policy.'
      },
      {
        id: 'communication-code',
        title: '4. Professional Communication Code',
        content: 'We strive to deliver helpful, prompt, and transparent customer service. We request customers to communicate politely with their order details and transaction reference. Abusive language, threats, or fraudulent claims are not tolerated.'
      }
    ]
  },
  'cancellation': {
    slug: 'cancellation',
    title: 'Cancellation Policy',
    subtitle: 'Official guidelines and procedures regarding order cancellations for digital website templates and code packages.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'Digital products and templates cannot be cancelled once download access is generated.',
      'Cancellation requests prior to fulfillment initiation can be submitted to support.',
      'Request via email (ffdigital.support@gmail.com) or phone (+91 9793970031).',
      'Approved cancellations are refunded to the original payment source within 5 to 7 working days.',
      'Customer support available Monday to Saturday, 10:00 AM to 6:00 PM IST.',
    ],
    sections: [
      {
        id: 'cancellation-overview',
        title: '1. Order Cancellation Parameters',
        content: 'Because FFDigital specializes in instant digital downloads, website templates, and developer scripts, fulfillment begins promptly upon payment confirmation. Once digital files or source code packages have been electronically delivered or downloaded, cancellations are strictly not permitted.'
      },
      {
        id: 'cancellation-eligibility',
        title: '2. Pre-Fulfillment Cancellation Eligibility',
        content: 'If you placed an order in error and delivery or download has NOT yet occurred or been accessed, you may request an immediate order cancellation by contacting our support team within 30 minutes of payment confirmation.'
      },
      {
        id: 'how-to-cancel',
        title: '3. How to Submit a Cancellation Request',
        content: 'To request a cancellation before delivery starts, contact us immediately: \n\n• Email: ffdigital.support@gmail.com \n• Phone: +91 9793970031 \n• Operational Hours: Monday to Saturday, 10:00 AM to 6:00 PM IST \n\nPlease provide your Order ID, Payment Proof (UTR/Transaction ID), and registered email or mobile number.'
      },
      {
        id: 'cancellation-refund',
        title: '4. Cancellation Refund Processing',
        content: 'If your cancellation request is approved before download initiation, the full transaction amount will be refunded directly to your original payment method within 5 to 7 working days via our payment gateway (Easebuzz / CCAvenue).'
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
        content: 'We respect the intellectual property rights of creators. If you believe any files hosted on our platform infringe upon your copyright, please report it immediately with proper documentation to our Grievance Officer at ffdigital.support@gmail.com. Valid reports will be investigated and addressed within 48 business hours.'
      }
    ]
  },
  'shipping-delivery': {
    slug: 'shipping-delivery',
    title: 'Shipping & Delivery Policy',
    subtitle: 'Our transparent guidelines explaining digital-first electronic delivery schedules and template fulfillment.',
    lastUpdated: '[DATE]',
    quickSummary: [
      'FFDigital sells exclusively digital software templates, scripts, and electronic resources.',
      'Delivery is 100% digital via instant download, email dispatch, or customer dashboard.',
      'Expected delivery window: instant to within 5 minutes to 24 hours after successful payment.',
      'No physical shipping or shipping fees apply.',
      'Zero shipping fees across all electronic assets.',
    ],
    sections: [
      {
        id: 'digital-shipping',
        title: '1. Digital Goods & Electronic Delivery Model',
        content: 'FFDigital sells exclusively digital products and electronic services (including website templates, React templates, HTML/CSS/JS themes, SaaS starter kits, admin dashboards, scripts, and digital assets). No physical parcels, discs, boxes, or printed paperwork are shipped. There are zero shipping or handling fees.'
      },
      {
        id: 'fulfillment',
        title: '2. Delivery Channels & Timelines',
        content: 'Delivery is executed online via instant download links, email dispatch, or directly within your customer dashboard order panel. Typical delivery is completed instantly to within 5 minutes to 24 hours following payment confirmation.'
      },
      {
        id: 'delays-disclaimer',
        title: '3. Potential Causes for Delays',
        content: 'Delays may occasionally occur due to incorrect email address submitted by customer, bank verification holds, or technical system maintenance. If an order is delayed beyond 24 hours, contact support at ffdigital.support@gmail.com or +91 9793970031.'
      },
      {
        id: 'support-info',
        title: '4. Support Hours & Contact',
        content: 'Our fulfillment and customer support operate Monday to Saturday, 10:00 AM to 6:00 PM IST. We are closed on Sundays and national holidays.'
      }
    ]
  }
};

const replacePlaceholders = (text: string): string => {
  return text
    .replace(/FreeFireShop/g, 'FFDigital')
    .replace(/Free Fire Shop/g, 'FFDigital')
    .replace(/\[OWNER FULL LEGAL NAME\]/g, 'Prankrishna Das')
    .replace(/\[SUPPORT EMAIL\]/g, 'ffdigital.support@gmail.com')
    .replace(/\[GRIEVANCE EMAIL\]/g, 'ffdigital.support@gmail.com')
    .replace(/connectwithvexora@gmail.com/g, 'ffdigital.support@gmail.com')
    .replace(/\[BUSINESS PHONE\]/g, '+91 9793970031')
    .replace(/\[DATE\]/g, 'September 22, 2026')
    .replace(/Monday to Friday, 10:00 AM to 6:00 PM Indian Standard Time \(IST\)/g, 'Monday to Saturday, 10:00 AM to 6:00 PM IST')
    .replace(/Mon-Fri, 10:00 AM - 6:00 PM IST/g, 'Monday to Saturday, 10:00 AM to 6:00 PM IST')
    .replace(/Mon-Fri, 10:00 AM to 6:00 PM IST/g, 'Monday to Saturday, 10:00 AM to 6:00 PM IST')
    .replace(/\[FULL BUSINESS \/ PRINCIPAL ADDRESS\]/g, 'Registered Address: House no 417, Near Santosh Tea stall, Labour Chauraha, Shantipuram, Prayagraj, Uttar Pradesh - 211013, India | Permanent Address: 02 No Takimari, Mantadari, PO: Milanpally, Dist: Jalpaiguri, West Bengal - 735133, India');
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
