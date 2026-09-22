import { Product, Category, Coupon } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'templates',
    slug: 'templates',
    name: 'Website Templates',
    shortName: 'Templates',
    description: 'Modern, responsive website & landing page templates for creators, freelancers, and digital stores.',
    iconName: 'Layout',
    productCount: 1,
    featuredTags: ['Bio Link', 'Digital Store', 'HTML/CSS/JS', 'Responsive'],
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'scripts',
    slug: 'scripts',
    name: 'Scripts & Tools',
    shortName: 'Scripts',
    description: 'Automation scripts, web utilities, and developer tools.',
    iconName: 'Code',
    productCount: 0,
    featuredTags: ['Automation', 'Tools', 'NodeJS', 'Python'],
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50 text-emerald-700',
  },
];

export const PRODUCTS: Product[] = [
  {
    id: 'linknest-pro',
    slug: 'linknest-pro',
    title: 'LinkNest Pro — Personal Bio & Digital Store Website Template',
    shortDescription:
      'Create your own professional bio link page and showcase your digital products, social links, WhatsApp, email and payment links — all in one place.',
    description:
      'LinkNest Pro is a modern, responsive personal bio and digital-store website template designed for creators, freelancers, developers, influencers and small businesses.\n\nTurn one simple link into your own professional online profile where visitors can:\n\n👤 View your profile & bio\n🔗 Access all your important links\n📱 Connect through WhatsApp\n📧 Contact you by email\n🌐 Visit your website and social profiles\n🛍️ Browse your digital products\n💰 See product prices\n🔥 Click Buy Now and continue to your payment/checkout page\n\nNo monthly subscription. No framework required. Just customize, deploy and use.',
    category: 'templates',
    categoryLabel: 'Website Templates',
    productType: 'DOWNLOAD',
    price: 550,
    originalPrice: 999,
    rating: 4.9,
    reviewCount: 42,
    image: '/images/branding/LinkNest-Pro.png',
    gallery: [
      '/images/branding/LinkNest-Pro.png'
    ],
    fileFormat: 'HTML, CSS, JS (ZIP Archive)',
    fileSize: '6.7 KB',
    downloadUrl: '/downloads/linknest-pro-template.zip',
    version: '',
    features: [
      'Responsive Mobile & Desktop Layout',
      'Personal Profile & Bio Showcase',
      'Digital Product Cards with Pricing',
      'Direct Buy Now / Payment Link Support',
      'WhatsApp & Email Direct Action Buttons',
      'Social Media Links Integration',
      'Dark & Light Mode Theme Switcher',
      'SEO-Optimized Meta & OpenGraph Tags',
      'Zero Frameworks / Pure Vanilla JS & CSS'
    ],
    whatsIncluded: [
      'Complete HTML/CSS/JS source code',
      'Responsive mobile & desktop design',
      'Digital product showcase',
      'Product pricing section',
      'Buy Now / payment-link support',
      'Social media links',
      'WhatsApp & Email buttons',
      'Dark/Light mode',
      'SEO-ready metadata',
      'Favicon',
      'Free deployment guide',
      'Product & payment setup guide',
      'Customization guide',
      'Commercial license template'
    ],
    requirements: [
      'Any modern web browser (Chrome, Safari, Firefox, Edge)',
      'Basic text editor (VS Code, Notepad++, or Sublime Text) for editing links and text',
      'Free web hosting (Vercel, Netlify, GitHub Pages, or Cloudflare Pages)'
    ],
    faqs: [
      {
        question: 'Do I need a monthly subscription to use LinkNest Pro?',
        answer: 'No! There are zero monthly fees or hidden charges. You purchase once and get full lifetime usage rights and source code.'
      },
      {
        question: 'How do customers buy my products?',
        answer: 'You can link each product item to your preferred payment gateway (Stripe, PayPal, Razorpay, UPI, BuyMeACoffee, Gumroad) directly via simple link URLs.'
      },
      {
        question: 'Can I host it on my own custom domain?',
        answer: 'Yes! You can host LinkNest Pro on any custom domain or sub-domain with free hosting platforms like Vercel, Netlify, or GitHub Pages.'
      },
      {
        question: 'What happens if I lose my download link?',
        answer: 'No worries! You can access all your purchased products anytime by logging into your account dashboard on FreeFireShop. Your digital library is permanently stored in your account.'
      },
      {
        question: 'Do I need to know coding to use this template?',
        answer: 'Basic knowledge of HTML/CSS is helpful if you want to make deep customizations, but for simply changing links, text, and images, you just need a basic text editor. We provide a step-by-step guide to help you.'
      },
      {
        question: 'Is the template SEO friendly?',
        answer: 'Yes, LinkNest Pro is built with clean HTML5 semantic structure and includes pre-configured meta tags for SEO and social media (OpenGraph) sharing.'
      },
      {
        question: 'Is there a refund policy?',
        answer: 'As this is a digital downloadable product, we generally do not offer refunds once the file has been accessed. However, if you face any technical issues with the source code, our support team is here to help.'
      }
    ],
    status: 'active',
    tags: ['Bio Link', 'Digital Store', 'Landing Page', 'Website Template', 'HTML/CSS/JS', 'Creator Portfolio', 'Link in Bio'],
    isFeatured: true,
    isNew: true,
    releasedAt: '2026-09-20',
    updatedAt: '2026-09-21'
  }
];

export const COUPONS: Coupon[] = [
  {
    code: 'SAVE20',
    discountPercent: 20,
    description: '20% off any digital product on FreeFireShop',
  },
  {
    code: 'LAUNCH50',
    discountPercent: 50,
    description: '50% off launch discount',
    minSpend: 50,
  },
  {
    code: 'DEV30',
    discountPercent: 30,
    description: '30% developer discount',
    minSpend: 40,
  },
];

