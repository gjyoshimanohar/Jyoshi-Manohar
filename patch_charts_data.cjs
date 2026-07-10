const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /  const overdueInvoiced = invoices.reduce\(\(sum, i\) => \{\n    const isOverdue = \(i\.status === 'sent' \|\| i\.status === 'overdue' \|\| i\.status === 'partial'\) && isAfter\(new Date\(\), parseISO\(i\.dueDate\)\);\n    return sum \+ \(isOverdue \? Math\.max\(0, i\.total - \(i\.amountPaid \|\| 0\)\) : 0\);\n  \}, 0\);/;

const replacement = `  const overdueInvoiced = invoices.reduce((sum, i) => {
    const isOverdue = (i.status === 'sent' || i.status === 'overdue' || i.status === 'partial') && isAfter(new Date(), parseISO(i.dueDate));
    return sum + (isOverdue ? Math.max(0, i.total - (i.amountPaid || 0)) : 0);
  }, 0);

  // Revenue Chart Data (Last 6 months)
  const chartData = React.useMemo(() => {
    const months: Record<string, { name: string, invoiced: number, paid: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = format(d, 'yyyy-MM');
      months[key] = { name: format(d, 'MMM'), invoiced: 0, paid: 0 };
    }
    
    invoices.forEach(inv => {
      const monthKey = inv.issueDate.substring(0, 7);
      if (months[monthKey]) {
        months[monthKey].invoiced += inv.total;
        if (inv.status === 'paid' || inv.status === 'partial') {
           months[monthKey].paid += (inv.amountPaid || (inv.status === 'paid' ? inv.total : 0));
        }
      }
    });
    return Object.values(months);
  }, [invoices]);

  // Aging Report Data
  const agingData = React.useMemo(() => {
    let current = 0, thirty = 0, sixty = 0, ninetyPlus = 0;
    const now = new Date();
    
    invoices.forEach(inv => {
      if (inv.status !== 'paid' && inv.status !== 'draft' && inv.status !== 'cancelled') {
        const outstanding = Math.max(0, inv.total - (inv.amountPaid || 0));
        const due = parseISO(inv.dueDate);
        
        if (!isAfter(now, due)) {
          current += outstanding;
        } else {
          const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 3600 * 24));
          if (diffDays <= 30) thirty += outstanding;
          else if (diffDays <= 60) sixty += outstanding;
          else ninetyPlus += outstanding;
        }
      }
    });
    
    return [
      { name: 'Current', amount: current },
      { name: '1-30 Days', amount: thirty },
      { name: '31-60 Days', amount: sixty },
      { name: '60+ Days', amount: ninetyPlus },
    ];
  }, [invoices]);`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
