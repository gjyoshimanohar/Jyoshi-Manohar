const fs = require('fs');
let c = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const target = `<div className="flex items-center justify-between mb-3">
 <label className="block text-xs uppercase tracking-widest text-black">Content</label>
 <div>
 <input `;

const replacement = `<div className="flex items-center justify-between mb-3">
 <label className="block text-xs uppercase tracking-widest text-black">Content</label>
 <div className="flex items-center space-x-4">
 <div className="flex bg-slate-100 p-1 rounded-lg">
 <button
 type="button"
 onClick={() => setEditingPost({ ...editingPost, format: 'html' })}
 className={\`px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-md transition-all \${(!editingPost.format || editingPost.format === 'html') ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-black'}\`}
 >
 Rich Text
 </button>
 <button
 type="button"
 onClick={() => setEditingPost({ ...editingPost, format: 'markdown' })}
 className={\`px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-md transition-all \${(editingPost.format === 'markdown') ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-black'}\`}
 >
 Markdown
 </button>
 </div>
 <div>
 <input `;

c = c.replace(target, replacement);

const targetEditor = `<div className="mb-2 text-xs text-black bg-slate-50 p-3 rounded border border-slate-100">
 <strong>Document Editor:</strong> Use the MS Word/Google Docs style toolbar to format your content. <br/>
 If you upload an image via the "Upload Image" button above, it will be uploaded to your Firebase Storage and its URL will be appended as an \`&lt;img&gt;\` tag at the end of the post. You can also paste images directly.
 </div>
 <div className="bg-slate-100 shadow-inner border border-slate-200">
 <SunEditor `;

const replacementEditor = `<div className="mb-2 text-xs text-black bg-slate-50 p-3 rounded border border-slate-100">
 <strong>Document Editor:</strong> {editingPost.format === 'markdown' ? 'Use standard Markdown syntax to format your content.' : 'Use the MS Word/Google Docs style toolbar to format your content.'} <br/>
 If you upload an image via the "Upload Image" button above, it will be uploaded to your Firebase Storage and its URL will be appended as an \`&lt;img&gt;\` tag at the end of the post (or markdown image tag). You can also paste images directly.
 </div>
 <div className="bg-slate-100 shadow-inner border border-slate-200">
 {editingPost.format === 'markdown' ? (
 <textarea
 value={editingPost.content || ''}
 onChange={e => setEditingPost({ ...editingPost, content: e.target.value })}
 className="w-full bg-white border-none p-4 font-mono text-sm text-primary focus:ring-2 focus:ring-primary outline-none min-h-[600px]"
 placeholder="# Start writing your markdown here..."
 />
 ) : (
 <SunEditor `;

c = c.replace(targetEditor, replacementEditor);

const targetEndEditor = ` ['fullScreen', 'showBlocks', 'codeView']
 ]
 }}
 />
 </div>
 </div>
 <div className="flex justify-end space-x-6 pt-6">`;

const replacementEndEditor = ` ['fullScreen', 'showBlocks', 'codeView']
 ]
 }}
 />
 )}
 </div>
 </div>
 <div className="flex justify-end space-x-6 pt-6">`;

c = c.replace(targetEndEditor, replacementEndEditor);

const targetUpload = ` const appendImage = (url: string) => {
 setEditingPost(prev => {
 if (!prev) return prev;
 return {
 ...prev,
 content: (prev.content || '') + \`\\n<img src="\${url}" alt="Uploaded Image" style="max-width:100%;height:auto;margin:1rem 0;" />\`
 };
 });
 };`;

const replacementUpload = ` const appendImage = (url: string) => {
 setEditingPost(prev => {
 if (!prev) return prev;
 const imgTag = prev.format === 'markdown' ? \`\\n![Uploaded Image](\${url})\\n\` : \`\\n<img src="\${url}" alt="Uploaded Image" style="max-width:100%;height:auto;margin:1rem 0;" />\`;
 return {
 ...prev,
 content: (prev.content || '') + imgTag
 };
 });
 };`;

c = c.replace(targetUpload, replacementUpload);

fs.writeFileSync('src/pages/Admin.tsx', c);
console.log('Replaced');
