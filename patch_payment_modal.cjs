const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const modalText = `
      {/* RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Record Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const paymentValue = parseFloat(paymentAmount);
              if (isNaN(paymentValue) || paymentValue <= 0) return;
              
              const newPayment = {
                id: Math.random().toString(36).substring(2, 9),
                date: format(new Date(), 'yyyy-MM-dd'),
                amount: paymentValue,
                method: paymentMethod,
                reference: paymentReference
              };
              
              const updatedAmountPaid = (selectedInvoice.amountPaid || 0) + paymentValue;
              const newStatus = updatedAmountPaid >= selectedInvoice.total ? 'paid' : 'partial';
              
              const updatedPayments = [...(selectedInvoice.payments || []), newPayment];
              
              await invoiceService.updateInvoice(selectedInvoice.id, {
                amountPaid: updatedAmountPaid,
                payments: updatedPayments,
                status: newStatus
              });
              
              // update local view state
              setSelectedInvoice({
                ...selectedInvoice,
                amountPaid: updatedAmountPaid,
                payments: updatedPayments,
                status: newStatus
              });
              
              setPaymentAmount('');
              setPaymentReference('');
              setIsPaymentModalOpen(false);
            }} className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm mb-4 flex justify-between items-center">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-bold">{getCurrencySymbol(selectedInvoice.currency)}{selectedInvoice.total.toFixed(2)}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-sm mb-4 flex justify-between items-center">
                <span className="text-emerald-700">Outstanding:</span>
                <span className="font-bold text-emerald-700">{getCurrencySymbol(selectedInvoice.currency)}{Math.max(0, selectedInvoice.total - (selectedInvoice.amountPaid || 0)).toFixed(2)}</span>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Amount</label>
                <input 
                  type="number" 
                  step="0.01"
                  max={selectedInvoice.total - (selectedInvoice.amountPaid || 0)}
                  value={paymentAmount} 
                  onChange={(e) => setPaymentAmount(e.target.value)} 
                  className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" 
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Method</label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)} 
                  className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" 
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Paypal">Paypal</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Reference (Optional)</label>
                <input 
                  type="text" 
                  value={paymentReference} 
                  onChange={(e) => setPaymentReference(e.target.value)} 
                  placeholder="Transaction ID / Check Number"
                  className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" 
                />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

content = content.replace(/    <\/div>\n  \);\n}\n*$/, modalText + `    </div>\n  );\n}\n`);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
