import React from 'react';
import { Transaction } from '../lib/supabase';
import { Printer, FileText, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  receipt: Transaction;
  onClose: () => void;
}

export default function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  
  // WhatsApp prefilled invoice share link compiler
  const getWhatsAppShareLink = (tx: Transaction) => {
    const phoneNum = tx.customer_whatsapp || tx.customer_phone || '';
    if (!phoneNum) return '';

    const cleanPhone = phoneNum.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const itemsText = tx.items
      .map(item => `- ${item.quantity}x ${item.name} (SKU: ${item.sku}) - ₹${item.subtotal.toFixed(2)}`)
      .join('\n');

    const message = `🧾 *TEKART STORE RECEIPT* 🧾\n\n` +
      `*Transaction ID:* #${tx.id}\n` +
      `*Date:* ${new Date(tx.created_at).toLocaleDateString()}\n` +
      `*Cashier:* ${tx.cashier_name}\n\n` +
      `*Items Purchased:*\n${itemsText}\n\n` +
      `*Subtotal:* ₹${tx.subtotal.toFixed(2)}\n` +
      (tx.gst > 0 ? `*GST:* ₹${tx.gst.toFixed(2)}\n` : '') +
      (tx.discount > 0 ? `*Discount:* -₹${tx.discount.toFixed(2)}\n` : '') +
      `*Grand Total:* ₹${tx.total.toFixed(2)}\n` +
      `*Payment Method:* ${tx.payment_method}\n\n` +
      `Thank you for shopping at *TEKART SMART LIVING*!`;

    return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-950/40 border-b border-white/5 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2 text-tk-blue-bright font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Transaction Receipt</span>
          </div>
          <button 
            onClick={onClose}
            className="text-tk-text-secondary hover:text-white text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Print Docket Area */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[70vh] bg-white text-black font-mono text-xs print-receipt-area">
          <div className="text-center space-y-0.5 border-b border-dashed border-black/40 pb-3 mb-3">
            <h2 className="text-base font-extrabold tracking-wider">TEKART SMART LIVING</h2>
            <p>Premium Curation Store</p>
            <p className="text-[10px]">C-Sector, Local Market, Shop #4</p>
            <p className="text-[10px]">Phone: +91 98765 43210</p>
          </div>

          <div className="space-y-1 border-b border-dashed border-black/40 pb-3 mb-3 text-[10px]">
            <p><span className="font-bold">Order ID:</span> #{receipt.id}</p>
            <p><span className="font-bold">Date:</span> {new Date(receipt.created_at).toLocaleString()}</p>
            <p><span className="font-bold">Cashier:</span> {receipt.cashier_name}</p>
            {receipt.customer_name && (
              <p><span className="font-bold">Customer:</span> {receipt.customer_name} ({receipt.customer_phone})</p>
            )}
            {receipt.is_voided && (
              <p className="text-red-600 font-extrabold tracking-widest text-center py-1 bg-red-100 rounded mt-1.5 uppercase">
                *** VOIDED & REFUNDED ***
              </p>
            )}
          </div>

          <table className="w-full text-left text-[10px] border-b border-dashed border-black/40 pb-2 mb-2">
            <thead>
              <tr className="border-b border-black/20 font-bold">
                <th className="pb-1">Item</th>
                <th className="pb-1 text-center">Qty</th>
                <th className="pb-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1">
                    <p>{item.name}</p>
                    <p className="text-[8px] text-gray-500">SKU: {item.sku}</p>
                  </td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">₹{item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-[10px] border-b border-dashed border-black/40 pb-3 mb-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{receipt.subtotal.toFixed(2)}</span>
            </div>
            {receipt.gst > 0 && (
              <div className="flex justify-between">
                <span>GST:</span>
                <span>₹{receipt.gst.toFixed(2)}</span>
              </div>
            )}
            {receipt.discount > 0 && (
              <div className="flex justify-between font-bold text-gray-700">
                <span>Discount:</span>
                <span>-₹{receipt.discount.toFixed(2)}</span>
              </div>
            )}
            {receipt.rounding !== 0 && (
              <div className="flex justify-between text-[9px] text-gray-500">
                <span>Rounding:</span>
                <span>₹{receipt.rounding.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-extrabold border-t border-black/10 pt-1.5">
              <span>Grand Total:</span>
              <span>₹{receipt.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center space-y-1">
            <p className="font-bold">Payment Mode: {receipt.payment_method}</p>
            <p className="text-[9px] mt-1.5 italic">Thank you! Visit again.</p>
          </div>
        </div>

        {/* Print controls */}
        <div className="p-4 bg-slate-950/40 border-t border-white/5 flex flex-col space-y-2 no-print">
          {(receipt.customer_phone || receipt.customer_whatsapp) && !receipt.is_voided && (
            <a
              href={getWhatsAppShareLink(receipt)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white font-extrabold text-xs py-2.5 rounded-lg flex items-center justify-center space-x-1.5 shadow-md cursor-pointer text-center"
            >
              <FileText className="w-4 h-4" />
              <span>Forward Receipt via WhatsApp (Free)</span>
            </a>
          )}
          <div className="flex space-x-2">
            <button
              onClick={() => window.print()}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center space-x-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print docket</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-tk-blue-mid hover:bg-tk-blue-deep text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
            >
              Close Dialog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
