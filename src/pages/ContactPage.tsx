import React, { useState } from 'react';
import {
  Mail,
  Clock,
  Send,
  CheckCircle2,
  Headphones,
  Phone,
  MapPin,
  Building,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ContactPage: React.FC = () => {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('delivery');
  const [orderNumber, setOrderNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      showToast('error', 'Missing Information', 'Please complete all required fields.');
      return;
    }
    setIsSent(true);
    showToast('success', 'Ticket Dispatched', 'We have received your support request and assigned Ticket #FFD-8842.');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          Official Customer Support & Business Coordinates
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Contact FFDigital Support
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Need assistance with your digital template order, download status, or billing queries? Reach our verified team directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Support Channels & Official Legal Info (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Direct Support Channels */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Headphones className="w-5 h-5 text-blue-600" />
              <span>Direct Support Channels</span>
            </h3>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">Official Support Email</h4>
                  <a href="mailto:ffdigital.support@gmail.com" className="text-blue-600 font-semibold hover:underline text-xs sm:text-sm break-all">
                    ffdigital.support@gmail.com
                  </a>
                  <span className="text-[11px] text-blue-700 font-semibold block mt-1">
                    Response time: Within 2 to 4 hours
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
                <Phone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">Phone Helpline</h4>
                  <a href="tel:+919793970031" className="text-indigo-700 font-bold hover:underline text-sm">
                    +91 9793970031
                  </a>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Direct call & WhatsApp support
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Clock className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">Support Timing</h4>
                  <p className="text-slate-700 font-medium text-xs sm:text-sm">Monday to Saturday, 10:00 AM to 6:00 PM IST</p>
                  <span className="text-[11px] text-slate-500 block mt-0.5">Closed on Sundays & national public holidays</span>
                </div>
              </div>
            </div>
          </div>

          {/* Official Business & Legal Entity Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Business Entity & Address Details</span>
            </h3>

            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
                <span className="font-medium text-slate-500">Brand Name:</span>
                <span className="font-bold text-slate-900">FFDigital</span>
              </div>

              <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
                <span className="font-medium text-slate-500">Owner / Proprietor:</span>
                <span className="font-bold text-slate-900">Prankrishna Das</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                  <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Registered Address</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  House no 417, Near Santosh Tea stall, Labour Chauraha, Shantipuram, Prayagraj, Uttar Pradesh - 211013, India
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Permanent Address</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  02 No Takimari, Mantadari, PO: Milanpally, Dist: Jalpaiguri, West Bengal - 735133, India
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-md">
            {isSent ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Ticket Dispatched!</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Thank you, <strong className="text-slate-900">{name}</strong>. Your inquiry has been routed to our support desk. We will respond to <strong className="text-slate-900">{email}</strong> within our operating hours (Mon-Sat, 10 AM to 6 PM IST).
                </p>
                <button
                  onClick={() => setIsSent(false)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                >
                  Submit Another Ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-900">
                    Submit a Support Ticket
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    For faster resolution of order inquiries, please include your Order ID and transaction details.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Inquiry Topic</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="delivery">Digital Product Download Issue</option>
                      <option value="templates">Template / Source Code Inquiries</option>
                      <option value="billing">Billing or Refund Request</option>
                      <option value="payment-verification">Payment Deducted but Order Pending</option>
                      <option value="technical">Technical Support / Setup Assistance</option>
                      <option value="general">General Store Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Order ID / Reference <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g. FFD-2026-XXXX or UTR"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Message / Issue Details</label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide your Order ID, transaction details, or any questions for our support team..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Support Request</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
