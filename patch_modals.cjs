const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const replacement = `
      {/* ORGANIZATION SETTINGS MODAL */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Organization Settings</h3>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              settingsService.updateInvoiceSettings({ senderName, senderEmail, senderAddress });
              setIsSettingsModalOpen(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Company Name</label>
                <input 
                  type="text" 
                  value={senderName} 
                  onChange={(e) => setSenderName(e.target.value)} 
                  className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" 
                  readOnly
                />
                <span className="text-[10px] text-gray-400">Corporate sender name is strictly fixed to Jyoshi Manohar.</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Company Email</label>
                <input 
                  type="email" 
                  value={senderEmail} 
                  onChange={(e) => setSenderEmail(e.target.value)} 
                  className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" 
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Organization Address & Footer</label>
                <textarea 
                  value={senderAddress} 
                  onChange={(e) => setSenderAddress(e.target.value)} 
                  className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" 
                  rows={3} 
                />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCTS MODAL */}
      {isProductsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white w-full max-w-2xl h-[80vh] flex flex-col rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Manage Line Items / Products</h3>
              <button onClick={() => setIsProductsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Product Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target;
                const name = form.name.value;
                const desc = form.desc.value;
                const price = parseFloat(form.price.value);
                if (editingProduct) {
                  await productService.updateProduct(editingProduct.id, { name, description: desc, price });
                  setEditingProduct(null);
                } else {
                  await productService.createProduct({ name, description: desc, price });
                }
                form.reset();
              }} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="text-sm font-semibold mb-3">{editingProduct ? 'Edit Product' : 'Add New Product'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <input name="name" type="text" placeholder="Product / Service Name *" required defaultValue={editingProduct?.name} className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" />
                  <input name="price" type="number" step="0.01" min="0" placeholder="Unit Price *" required defaultValue={editingProduct?.price} className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" />
                </div>
                <textarea name="desc" placeholder="Description (Optional)" rows={2} defaultValue={editingProduct?.description} className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm mb-3" />
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold">
                    {editingProduct ? 'Save Changes' : 'Add Product'}
                  </button>
                  {editingProduct && (
                    <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold">
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* Product List */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-700">Existing Products</h4>
                {products.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4 text-center border border-dashed rounded-xl">No products added yet.</div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-150">
                    {products.map(p => (
                      <div key={p.id} className="p-3 bg-white flex justify-between items-center hover:bg-gray-50">
                        <div>
                          <div className="font-semibold text-sm text-gray-900">{p.name} <span className="text-gray-500 ml-2 font-mono">{getCurrencySymbol(currency)}{p.price}</span></div>
                          {p.description && <div className="text-xs text-gray-500 mt-1">{p.description}</div>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingProduct(p)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => productService.deleteProduct(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

content = content.replace(/    <\/div>\n  \);\n}\n*$/, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
