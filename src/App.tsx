import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { Header } from './components/Header';
import { MobileMenu } from './components/MobileMenu';
import { Footer } from './components/Footer';
import { QuickSearchModal } from './components/QuickSearchModal';

// Pages
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { CategoryPage } from './pages/CategoryPage';
import { SearchPage } from './pages/SearchPage';
import { CartPage } from './pages/CartPage';
import { WishlistPage } from './pages/WishlistPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AccountPage } from './pages/AccountPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { FAQPage } from './pages/FAQPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RefundPage } from './pages/RefundPage';
import { AdminPage } from './pages/AdminPage';

const AppContent: React.FC = () => {
  const { currentPath, pathParams } = useApp();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentPath, pathParams]);

  // Route Resolver
  const renderCurrentPage = () => {
    if (currentPath.startsWith('/product/')) {
      return <ProductDetailsPage />;
    }
    if (currentPath.startsWith('/category/')) {
      return <CategoryPage />;
    }

    switch (currentPath) {
      case '/':
        return <HomePage />;
      case '/products':
        return <ProductsPage />;
      case '/search':
        return <SearchPage />;
      case '/cart':
        return <CartPage />;
      case '/wishlist':
        return <WishlistPage />;
      case '/checkout':
        return <CheckoutPage />;
      case '/login':
        return <LoginPage />;
      case '/register':
        return <RegisterPage />;
      case '/forgot-password':
        return <ForgotPasswordPage />;
      case '/account':
      case '/account/orders':
      case '/account/downloads':
      case '/account/settings':
        return <AccountPage />;
      case '/about':
        return <AboutPage />;
      case '/contact':
        return <ContactPage />;
      case '/faq':
        return <FAQPage />;
      case '/terms':
        return <TermsPage />;
      case '/privacy':
        return <PrivacyPage />;
      case '/refund':
        return <RefundPage />;
      case '/admin':
        return <AdminPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <Header />

      {/* Main Page Body */}
      <main className="flex-1">
        {renderCurrentPage()}
      </main>

      {/* Footer */}
      <Footer />

      {/* Overlays & Modals */}
      <MobileMenu />
      <QuickSearchModal />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ToastProvider>
  );
}
