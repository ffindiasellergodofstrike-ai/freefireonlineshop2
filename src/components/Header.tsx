import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Heart,
  User as UserIcon,
  ChevronDown,
  Menu,
  Sparkles,
  Code2,
  Wrench,
  Download,
  PlayCircle,
  FolderArchive,
  Flame,
  ArrowRight,
  LogOut,
  FolderDown,
  Package,
  Lock as LockIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/products';

export const Header: React.FC = () => {
  const {
    currentPath,
    navigate,
    cartCount,
    wishlistCount,
    currentUser,
    isAuthenticated,
    signOut,
    setIsMobileMenuOpen,
    setIsQuickSearchOpen,
  } = useApp();

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCatIcon = (iconName: string) => {
    switch (iconName) {
      case 'Code2':
        return Code2;
      case 'Wrench':
        return Wrench;
      case 'Download':
        return Download;
      case 'PlayCircle':
        return PlayCircle;
      case 'FolderArchive':
        return FolderArchive;
      default:
        return Sparkles;
    }
  };

  const isCurrent = (path: string) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-1.5 sm:gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-6 min-w-0">
            <button
              id="header-logo-btn"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 sm:gap-2.5 focus:outline-none group text-left min-w-0"
              aria-label="FreeFireShop Home"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 fill-amber-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                  FreeFire<span className="text-blue-600">Shop</span>
                </span>
                <span className="hidden sm:block text-[9px] font-extrabold text-slate-400 tracking-[0.1em] uppercase leading-tight mt-1">
                  Premium Digital Goods
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-semibold">
              <button
                id="nav-home"
                onClick={() => navigate('/')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  isCurrent('/') ? 'text-blue-600 bg-blue-50/80' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                Home
              </button>

              <button
                id="nav-products"
                onClick={() => navigate('/products')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  isCurrent('/products') ? 'text-blue-600 bg-blue-50/80' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                All Products
              </button>

              <button
                id="nav-about"
                onClick={() => navigate('/about')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  isCurrent('/about') ? 'text-blue-600 bg-blue-50/80' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                About
              </button>

              <button
                id="nav-contact"
                onClick={() => navigate('/contact')}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  isCurrent('/contact') ? 'text-blue-600 bg-blue-50/80' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                Contact
              </button>
            </nav>
          </div>

          {/* Right Action Icons: Search, Wishlist, Cart, Account */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Quick Search Button */}
            <button
              id="header-search-trigger-btn"
              onClick={() => setIsQuickSearchOpen(true)}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl text-slate-600 bg-slate-100/80 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 text-xs font-medium transition-colors"
              aria-label="Open Search (Cmd+K)"
            >
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="hidden md:inline">Search...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1 py-0.2 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
                ⌘K
              </kbd>
            </button>

            {/* Wishlist Button */}
            <button
              id="header-wishlist-btn"
              onClick={() => navigate('/wishlist')}
              className="relative p-2 sm:p-2.5 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              aria-label={`Wishlist with ${wishlistCount} items`}
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              id="header-cart-btn"
              onClick={() => navigate('/cart')}
              className="relative p-2 sm:p-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              aria-label={`Shopping cart with ${cartCount} items`}
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Account / Profile Dropdown */}
            <div ref={userDropdownRef} className="relative">
              {isAuthenticated && currentUser ? (
                <button
                  id="header-account-btn"
                  onClick={() => setIsUserDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
                  aria-label="User menu"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border border-blue-200 shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden xl:inline text-xs font-bold text-slate-800 max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                </button>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    id="header-login-btn"
                    onClick={() => navigate('/login')}
                    className="px-3 py-2 text-slate-700 hover:text-blue-600 hover:bg-slate-100 font-semibold rounded-xl text-xs transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    id="header-register-btn"
                    onClick={() => navigate('/register')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </button>
                </div>
              )}

              {/* User Dropdown */}
              {isUserDropdownOpen && isAuthenticated && currentUser && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 bg-slate-50 rounded-xl mb-2 border border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                    {currentUser.username && (
                      <p className="text-[11px] font-mono text-slate-500 truncate">@{currentUser.username}</p>
                    )}
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{currentUser.email}</p>
                    <span className="inline-block mt-1.5 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Customer Profile
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        navigate('/account');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>Account Dashboard</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        navigate('/account/orders');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                    >
                      <Package className="w-4 h-4 text-slate-400" />
                      <span>My Orders</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        navigate('/account/downloads');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                    >
                      <FolderDown className="w-4 h-4 text-slate-400" />
                      <span>My Downloads</span>
                    </button>
                    {currentUser.email === 'ff.india.seller.god.of.strike@gmail.com' && (
                      <button
                        onClick={() => {
                          setIsUserDropdownOpen(false);
                          navigate('/admin');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-left"
                      >
                        <LockIcon className="w-4 h-4 text-indigo-500" />
                        <span>Admin System</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 mt-2 pt-1">
                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
