import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { blogService } from '../services/blogService';
import { BlogPost } from '../types';
import { blogPosts as staticPosts } from '../data';
import { Plus, Trash2, LogOut, ChevronRight, Save, X, Database, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

import SunEditor from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      // Basic admin check based on email
      if (u?.email === 'gjyoshimanohar@gmail.com') {
        setIsAdmin(true);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && isAdmin) {
      loadPosts();
    }
  }, [user, isAdmin]);

  const loadPosts = async () => {
    const fetchedPosts = await blogService.getAllPosts();
    setPosts(fetchedPosts);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Login failed", error);
      alert(error.message || "Login failed");
    }
  };

  const handleLogout = () => signOut(auth);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `blog-images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      const imageMarkdown = `\n<img src="${url}" alt="${file.name}" style="max-width: 100%; height: auto;" />\n`;
      setEditingPost((prev) => ({
        ...prev,
        content: (prev?.content || '') + imageMarkdown
      }));
    } catch (error) {
      console.error("Image upload failed", error);
      alert("Failed to upload image. Please ensure Storage is set up in Firebase.");
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleEditorImageUpload = (files: File[], info: object, uploadHandler: Function) => {
    const file = files[0];
    if (!file) return undefined;
    
    const storageRef = ref(storage, `blog-images/${Date.now()}_${file.name}`);
    uploadBytes(storageRef, file).then((snapshot) => {
      getDownloadURL(snapshot.ref).then((url) => {
        uploadHandler({
          result: [{
            url: url,
            name: file.name,
            size: file.size
          }]
        });
      });
    }).catch((error) => {
      console.error("Editor Image upload failed", error);
      alert("Failed to upload image. Please ensure Storage is set up in Firebase.");
      uploadHandler({ errorMessage: 'Upload failed' });
    });
    
    return undefined; // Handled asynchronously
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    const postData = {
      ...editingPost,
      date: editingPost.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      readTime: editingPost.readTime || '5 min read',
    } as Omit<BlogPost, 'id'>;

    if (editingPost.id) {
      await blogService.updatePost(editingPost.id, postData);
    } else {
      await blogService.createPost(postData);
    }

    setEditingPost(null);
    loadPosts();
  };

  const handleDelete = async (id: string) => {
    await blogService.deletePost(id);
    setConfirmDeleteId(null);
    loadPosts();
  };

  const [confirmSeed, setConfirmSeed] = useState(false);

  const handleSeedData = async () => {
    try {
      for (const post of staticPosts) {
        const existing = await blogService.getPostBySlug(post.slug);
        const { id, ...postWithoutId } = post;
        if (!existing) {
          await blogService.createPost(postWithoutId);
        } else {
          // Force update to fix any missing fields (like content) from prior failed syncs
          await blogService.updatePost(existing.id, postWithoutId);
        }
      }
      alert('Data seeded successfully!');
    } catch (error: any) {
        console.error('Seed error:', error);
        
        // Check if it's a permission/not-found error to give a helpful hint
        const errorMsg = error?.message || String(error);
        const isPermissionError = errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('missing or insufficient');
        const isNotFoundError = errorMsg.toLowerCase().includes('not found') || errorMsg.toLowerCase().includes('expected type');
        
        let hint = "";
        if (isPermissionError) {
          hint = "\n\nHINT: This looks like a permissions issue. Have you set your Firestore Security Rules in the Firebase Console? You might be using 'Production Mode' rules which deny all writes.";
        } else if (isNotFoundError) {
          hint = "\n\nHINT: Make sure you have created the 'Firestore Database' in your Firebase Console (Build > Firestore Database).";
        }
        
        alert(`An error occurred during seeding:\n${errorMsg}${hint}\n\nPlease check the browser console for more details.`);
      } finally {
        loadPosts();
      }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-accent">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-48 bg-slate-200 rounded mb-4"></div>
        <div className="h-4 w-32 bg-slate-200 rounded"></div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-accent flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-12 border border-border shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-primary mb-2">Admin Portal</h1>
            <p className="text-black font-normal">Please sign in to manage your blogs</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-black mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-accent border-none p-4 font-bold text-primary focus:ring-2 focus:ring-primary outline-none"
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-black uppercase tracking-widest text-black mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-accent border-none p-4 font-bold text-primary focus:ring-2 focus:ring-primary outline-none"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-white py-4 px-6 font-black uppercase tracking-widest hover:bg-secondary transition-colors flex items-center justify-center space-x-3 mt-4 rounded-md"
            >
              <span>Sign In</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-accent flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-12 border border-border text-center">
          <X className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-black text-primary mb-4">Access Denied</h1>
          <p className="text-black mb-8 font-normal">You do not have permission to access the admin area.</p>
          <button onClick={handleLogout} className="text-primary font-black uppercase tracking-widest underline decoration-2 underline-offset-4">Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <main className="pt-32 pb-24 bg-accent min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-primary font-bold tracking-widest capitalize text-xs mb-6">Control Center</p>
            <h1 className="text-4xl lg:text-5xl font-black text-primary tracking-tighter leading-none">Management</h1>
          </div>
          <div className="flex items-center space-x-4">
                {!confirmSeed ? (
                  <button
                    onClick={() => setConfirmSeed(true)}
                    className="flex items-center space-x-2 bg-white border border-border px-6 py-3 font-black uppercase text-xs tracking-widest hover:border-primary transition-all hidden sm:flex"
                  >
                    <Database className="h-4 w-4" />
                    <span>Sync Defaults</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 bg-white border border-border pr-2 py-1 pl-4 hidden sm:flex">
                    <span className="font-bold text-xs">Are you sure?</span>
                    <button onClick={() => { handleSeedData(); setConfirmSeed(false); }} className="px-3 py-2 bg-secondary text-white font-bold text-xs">Yes</button>
                    <button onClick={() => setConfirmSeed(false)} className="px-3 py-2 bg-slate-200 text-black font-bold text-xs">No</button>
                  </div>
                )}
                <button
                  onClick={() => setEditingPost({})}
                  className="flex items-center space-x-2 bg-primary text-white px-6 py-3 font-black uppercase text-xs tracking-widest hover:bg-secondary transition-all rounded-md"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Post</span>
                </button>
            <button onClick={handleLogout} className="p-3 text-black hover:text-primary transition-colors flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Logout</span>
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {editingPost ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 md:p-12 border border-border mb-12"
          >
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black text-primary">{editingPost.id ? 'Edit Post' : 'Create New Post'}</h2>
              <button 
                onClick={() => setEditingPost(null)}
                className="text-black hover:text-primary transition-colors flex items-center space-x-2 uppercase text-xs font-black tracking-widest"
              >
                <span>Discard Changes</span>
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-black mb-3">Post Title</label>
                  <input
                    required
                    type="text"
                    value={editingPost.title || ''}
                    onChange={e => setEditingPost({...editingPost, title: e.target.value})}
                    className="w-full bg-accent border-none p-4 font-bold text-primary focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Enter blog title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-black mb-3">URL Slug</label>
                  <input
                    required
                    type="text"
                    value={editingPost.slug || ''}
                    onChange={e => setEditingPost({...editingPost, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')})}
                    className="w-full bg-accent border-none p-4 font-bold text-primary focus:ring-2 focus:ring-primary outline-none"
                    placeholder="post-url-slug"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-black mb-3">Category</label>
                  <input
                    required
                    type="text"
                    value={editingPost.category || ''}
                    onChange={e => setEditingPost({...editingPost, category: e.target.value})}
                    className="w-full bg-accent border-none p-4 font-bold text-primary focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Taxation, Business, AI etc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-black mb-3">Excerpt</label>
                  <textarea
                    required
                    value={editingPost.excerpt || ''}
                    onChange={e => setEditingPost({...editingPost, excerpt: e.target.value})}
                    className="w-full bg-accent border-none p-4 font-normal text-primary focus:ring-2 focus:ring-primary outline-none h-24"
                    placeholder="Brief summary shown on the listing page"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-black uppercase tracking-widest text-black">Content</label>
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="image-upload" 
                      className="hidden" 
                      onChange={handleImageUpload} 
                      disabled={uploadingImage}
                    />
                    <label 
                      htmlFor="image-upload" 
                      className={`flex items-center space-x-2 text-xs font-bold uppercase tracking-widest cursor-pointer hover:text-primary transition-colors ${uploadingImage ? 'text-primary' : 'text-black'}`}
                    >
                      {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      <span>{uploadingImage ? 'Uploading...' : 'Upload Image (Appends to end)'}</span>
                    </label>
                  </div>
                </div>
                <div className="mb-2 text-xs text-black bg-slate-50 p-3 rounded border border-slate-100">
                  <strong>Document Editor:</strong> Use the MS Word/Google Docs style toolbar to format your content. <br/>
                  If you upload an image via the "Upload Image" button above, it will be uploaded to your Firebase Storage and its URL will be appended as an `&lt;img&gt;` tag at the end of the post. You can also paste images directly.
                </div>
                <div className="bg-slate-100 overflow-hidden shadow-inner border border-slate-200">
                  <SunEditor 
                    setContents={editingPost.content || ''}
                    onChange={(newContent) => setEditingPost({...editingPost, content: newContent})}
                    onImageUploadBefore={handleEditorImageUpload}
                    setOptions={{
                      minHeight: "600px",
                      placeholder: "Start writing your blog here. Use the alignment tools in the toolbar to justify or align text.",
                      buttonList: [
                        ['undo', 'redo'],
                        ['font', 'fontSize', 'formatBlock'],
                        ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
                        ['removeFormat'],
                        '/',
                        ['fontColor', 'hiliteColor'],
                        ['outdent', 'indent'],
                        ['align', 'horizontalRule', 'list', 'lineHeight'],
                        ['table', 'link', 'image', 'video'],
                        ['fullScreen', 'showBlocks', 'codeView']
                      ]
                    }}
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="bg-primary text-white px-12 py-5 font-black uppercase tracking-[0.2em] hover:bg-secondary transition-all flex items-center space-x-3 rounded-md"
                >
                  <Save className="h-5 w-5" />
                  <span>Publish to Website</span>
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="bg-white border border-border divide-y divide-border">
            {posts.length === 0 ? (
              <div className="p-20 text-center">
                <p className="text-black font-normal italic">No blogs published via database yet. Use "Sync Defaults" to migrate your existing content.</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50 transition-colors">
                  <div className="max-w-2xl">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-xs font-black text-secondary uppercase tracking-widest">{post.category}</span>
                      <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                      <span className="text-xs font-bold text-black uppercase tracking-widest">{post.date}</span>
                    </div>
                    <h3 className="text-xl font-black text-primary tracking-tight">{post.title}</h3>
                    <p className="text-sm text-black mt-2 line-clamp-1">{post.excerpt}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setEditingPost(post)}
                      className="p-3 text-black hover:text-primary transition-colors flex items-center space-x-2 border border-transparent hover:border-slate-200"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    {confirmDeleteId === post.id ? (
                      <div className="flex items-center space-x-2 mr-2">
                        <span className="text-xs font-bold text-red-500 mr-2">Confirm?</span>
                        <button onClick={() => handleDelete(post.id)} className="px-3 py-1 bg-red-500 text-white font-bold text-xs">Yes</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1 bg-slate-200 text-black font-bold text-xs">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(post.id)}
                        className="p-3 text-black hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
