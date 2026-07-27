import React, { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { invoiceService } from '../services/invoiceService';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import StatementGeneratorModal from './StatementGeneratorModal';

export default function StatementsTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const clientsData = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        setClients(clientsData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchClients();

    const unsubscribe = invoiceService.subscribeToAllInvoices((data) => {
      setInvoices(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading statements data...</div>;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-primary tracking-tight mb-2">Account Statements</h3>
      <p className="text-sm text-slate-500 mb-6">Generate and view detailed account statements for clients.</p>
      <div className="relative">
        <StatementGeneratorModal isOpen={true} onClose={() => {}} invoices={invoices} clients={clients} isEmbedded={true} />
      </div>
    </div>
  );
}
