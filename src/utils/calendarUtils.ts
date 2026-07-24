export interface CalendarEventItem {
  id: string;
  title: string;
  description?: string;
  startDate: Date | string | number;
  endDate?: Date | string | number;
  allDay?: boolean;
  category?: 'gst' | 'income_tax' | 'tds' | 'audit' | 'roc' | 'task' | 'invoice' | 'general';
  location?: string;
  status?: string;
  clientName?: string;
}

// Convert Date or timestamp or date string into YYYYMMDDTHHMMSSZ format for iCal / Google / Outlook
export function formatCalendarDate(dateInput: Date | string | number, isEnd = false, allDay = false): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  if (allDay) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate() + (isEnd ? 1 : 0)).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Format ISO string with offset for Outlook (YYYY-MM-DDTHH:mm:ss)
export function formatOutlookDate(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toISOString().split('.')[0];
  return d.toISOString().split('.')[0];
}

/**
 * Generate Google Calendar Web Link for quick one-click event creation
 */
export function getGoogleCalendarUrl(event: CalendarEventItem): string {
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(
    (event.description || '') +
      (event.clientName ? `\nClient: ${event.clientName}` : '') +
      (event.category ? `\nCategory: ${event.category.toUpperCase()}` : '') +
      `\n\nSynced via CA Jyoshi Manohar Compliance Suite.`
  );
  const location = encodeURIComponent(event.location || 'CA Manohar Compliance Portal');

  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

  const startFormatted = formatCalendarDate(startDate, false, event.allDay ?? true);
  const endFormatted = formatCalendarDate(endDate, true, event.allDay ?? true);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startFormatted}/${endFormatted}&details=${details}&location=${location}`;
}

/**
 * Generate Outlook.com / Live Web Link
 */
export function getOutlookCalendarUrl(event: CalendarEventItem, isOffice365 = false): string {
  const baseUrl = isOffice365
    ? 'https://outlook.office.com/calendar/0/deeplink/compose'
    : 'https://outlook.live.com/calendar/0/deeplink/compose';

  const title = encodeURIComponent(event.title);
  const body = encodeURIComponent(
    (event.description || '') +
      (event.clientName ? `\nClient: ${event.clientName}` : '') +
      (event.category ? `\nCategory: ${event.category.toUpperCase()}` : '') +
      `\n\nSynced via CA Jyoshi Manohar Compliance Suite.`
  );
  const location = encodeURIComponent(event.location || 'CA Manohar Compliance Portal');

  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

  const startIso = formatOutlookDate(startDate);
  const endIso = formatOutlookDate(endDate);

  return `${baseUrl}?path=/calendar/action/compose&rru=addevent&subject=${title}&body=${body}&location=${location}&startdt=${startIso}&enddt=${endIso}&allday=${event.allDay ? 'true' : 'false'}`;
}

/**
 * Generate standard .ics (iCalendar) file string for Apple Calendar, Outlook Desktop, etc.
 */
export function generateIcsContent(events: CalendarEventItem[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CA Jyoshi Manohar//Compliance & Advisory Suite//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Statutory Compliance & Audit Schedule'
  ];

  events.forEach((evt) => {
    const startDate = new Date(evt.startDate);
    const endDate = evt.endDate ? new Date(evt.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
    const isAllDay = evt.allDay ?? true;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:evt-${evt.id}-${Date.now()}@jyoshimanohar.com`);
    lines.push(`DTSTAMP:${formatCalendarDate(new Date())}`);
    
    if (isAllDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatCalendarDate(startDate, false, true)}`);
      lines.push(`DTEND;VALUE=DATE:${formatCalendarDate(endDate, true, true)}`);
    } else {
      lines.push(`DTSTART:${formatCalendarDate(startDate)}`);
      lines.push(`DTEND:${formatCalendarDate(endDate)}`);
    }

    lines.push(`SUMMARY:${evt.title.replace(/\n/g, ' ')}`);
    
    const descParts = [
      evt.description || '',
      evt.clientName ? `Client: ${evt.clientName}` : '',
      evt.category ? `Category: ${evt.category.toUpperCase()}` : '',
      'Synced from CA Jyoshi Manohar Compliance Suite'
    ].filter(Boolean);

    lines.push(`DESCRIPTION:${descParts.join('\\n')}`);
    lines.push(`LOCATION:${(evt.location || 'CA Manohar Office & Portal').replace(/[,;]/g, ' ')}`);
    lines.push('STATUS:CONFIRMED');
    
    // Add 1-day advance alarm trigger
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-P1D');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Reminder: ${evt.title}`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Trigger .ics download in browser
 */
export function downloadIcsFile(events: CalendarEventItem[], filename = 'compliance_schedule.ics') {
  const content = generateIcsContent(events);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Preset statutory compliance events for current financial year
 */
export function getStatutoryCompliancePresets(year = new Date().getFullYear()): CalendarEventItem[] {
  return [
    {
      id: 'preset-gst3b-monthly',
      title: 'GSTR-3B Monthly Tax Return Filing',
      description: 'Mandatory monthly summary return filing and GST tax payment for registered taxpayers.',
      startDate: new Date(year, new Date().getMonth(), 20),
      category: 'gst',
      allDay: true,
      location: 'GST Portal (gst.gov.in)'
    },
    {
      id: 'preset-gstr1-monthly',
      title: 'GSTR-1 Outward Supplies Return Filing',
      description: 'Filing of monthly outward sales and B2B invoice details.',
      startDate: new Date(year, new Date().getMonth(), 11),
      category: 'gst',
      allDay: true,
      location: 'GST Portal (gst.gov.in)'
    },
    {
      id: 'preset-tds-chalan',
      title: 'TDS Monthly Payment Deposit Due Date',
      description: 'Deposit of Tax Deducted at Source (TDS) collected in preceding month.',
      startDate: new Date(year, new Date().getMonth(), 7),
      category: 'tds',
      allDay: true,
      location: 'Income Tax e-Filing Portal'
    },
    {
      id: 'preset-adv-tax-q2',
      title: 'Advance Income Tax Installment (Q2 - 45%)',
      description: 'Payment of second installment of estimated advance income tax for corporates & individuals.',
      startDate: `${year}-09-15`,
      category: 'income_tax',
      allDay: true,
      location: 'Income Tax e-Filing Portal'
    },
    {
      id: 'preset-adv-tax-q3',
      title: 'Advance Income Tax Installment (Q3 - 75%)',
      description: 'Payment of third installment of advance tax.',
      startDate: `${year}-12-15`,
      category: 'income_tax',
      allDay: true,
      location: 'Income Tax e-Filing Portal'
    },
    {
      id: 'preset-adv-tax-q4',
      title: 'Advance Income Tax Installment (Q4 - 100%)',
      description: 'Final installment deposit for advance income tax.',
      startDate: `${year + 1}-03-15`,
      category: 'income_tax',
      allDay: true,
      location: 'Income Tax e-Filing Portal'
    },
    {
      id: 'preset-statutory-audit',
      title: 'Annual Statutory Audit & Final Accounts Review',
      description: 'Draft balance sheet, audit verification, and auditor sign-off milestone.',
      startDate: `${year}-09-30`,
      category: 'audit',
      allDay: true,
      location: 'CA Jyoshi Manohar Office'
    },
    {
      id: 'preset-roc-aoc4',
      title: 'ROC Filing AOC-4 (Financial Statements)',
      description: 'Annual ROC filing of audited balance sheet and P&L with MCA.',
      startDate: `${year}-10-30`,
      category: 'roc',
      allDay: true,
      location: 'MCA V3 Portal'
    }
  ];
}
