import express from "express";
import cors from "cors";
import path from "path";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import { google } from "googleapis";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/callback";
  
  if (!clientId || !clientSecret) {
    return null;
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}

// API routes go here FIRST

// AI Financial Insights endpoint
app.post("/api/finance/ai-insights", async (req, res) => {
  try {
    const { records = [], accounts = [], customQuestion = "" } = req.body;

    // Verify if Gemini API Key is present
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your Secrets via Settings > Secrets."
      });
    }

    const ai = getAiClient();

    // Prepare comprehensive summaries of finances for context
    const incomes = records.filter((r: any) => r.type === "income");
    const expenses = records.filter((r: any) => r.type === "expense");
    const receivables = records.filter((r: any) => r.type === "receivable" || (r.type === "income" && r.status === "pending"));

    const totalIncome = incomes.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
    const totalExpense = expenses.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
    const netCashFlow = totalIncome - totalExpense;

    // Grouping by category
    const categoryBreakdown: Record<string, number> = {};
    records.forEach((r: any) => {
      if (r.category && r.amount) {
        const catKey = `${r.type === "income" ? "Income" : "Expense"}: ${r.category}`;
        categoryBreakdown[catKey] = (categoryBreakdown[catKey] || 0) + r.amount;
      }
    });

    // Accounts info
    const accountsSummary = accounts.map((a: any) => `${a.name}: ₹${a.openingBalance || 0}`).join(", ");

    const financialContext = `
--- FINANCIAL PERFORMANCE SUMMARY ---
- Total Income recorded: ₹${totalIncome.toLocaleString("en-IN")}
- Total Expenses recorded: ₹${totalExpense.toLocaleString("en-IN")}
- Net Surplus/Deficit: ₹${netCashFlow.toLocaleString("en-IN")}

--- ACCOUNT BALANCES ---
${accountsSummary || "No payment accounts recorded."}

--- CATEGORY BREAKDOWN ---
${Object.entries(categoryBreakdown).map(([cat, amt]) => `- ${cat}: ₹${amt.toLocaleString("en-IN")}`).join("\n")}

--- DETAILED RECORDS OVERVIEW ---
- Total recorded financial transactions: ${records.length}
- Total pending invoice receivables: ${receivables.length}
    `;

    let prompt = "";
    const systemInstruction = `You are an elite, certified corporate financial advisor and fractional CFO. 
Your tone is professional, pragmatic, highly supportive, and objective. 
You avoid generic platitudes. Always structure your responses beautifully in Markdown.
Always format currency figures as Indian Rupees (e.g., ₹5,000) using proper Indian comma placement.
Focus on giving clear, concrete, and highly actionable optimization strategies.`;

    if (customQuestion) {
      prompt = `Here is the current financial state of the firm:\n${financialContext}\n\nUser Question: ${customQuestion}\n\nBased on the financial records and current balances, provide a detailed, accurate, and supportive response to the user's question.`;
    } else {
      prompt = `Here is the current financial state of the firm:\n${financialContext}\n\nPlease generate a comprehensive financial review for the user. Structure the review into these sections:
1. **Executive Summary**: A high-level overview of their current cash flow, net cash flow health, and general status.
2. **Expense Optimization**: Analyze the highest expense categories and list exactly 3 concrete, realistic strategies to reduce or optimize overhead (e.g., software licensing, travel, rent).
3. **Invoicing & Collection Plan**: Offer 2 highly actionable recommendations to accelerate recovery of any pending invoice receivables or outstanding client balances.
4. **Three-Month Financial Forecast**: Estimate the financial trajectory of the next 3 months under current spending and earning patterns, highlighting key dates or budget milestones.

Make sure the markdown is visually delightful, with beautiful dividers and clean formatting.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
      }
    });

    res.json({
      insights: response.text || "No insights could be generated. Please try again."
    });
  } catch (error: any) {
    console.error("Error generating AI insights:", error);
    res.status(500).json({ error: error.message || "Failed to generate financial insights." });
  }
});

// Brevo mail endpoint
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, htmlContent, senderName, senderEmail } = req.body;
    
    if (!to || !subject || !htmlContent) {
      return res.status(400).json({ error: "Missing required fields (to, subject, htmlContent)" });
    }

    const API_KEY = process.env.BREVO_API_KEY;
    if (!API_KEY) {
       console.error("BREVO_API_KEY environment variable is not defined");
       return res.status(500).json({ error: "Server email configuration is missing." });
    }

    // Default sender if none provided
    const defaultSenderEmail = process.env.BREVO_SENDER_EMAIL || "connect@jyoshimanohar.com";
    const sender = senderEmail ? { name: senderName || "Jyoshi Manohar", email: senderEmail } : { name: "Jyoshi Manohar", email: defaultSenderEmail };

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender,
        to: [{ email: to }],
        subject,
        htmlContent
      },
      {
        headers: {
          "api-key": API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ success: true, messageId: response.data?.messageId });
  } catch (error: any) {
    console.error("Error dispatching email via Brevo:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to send email." });
  }
});

// Google Calendar OAuth & API Sync Endpoints
app.get("/api/calendar/auth-url", (req, res) => {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    return res.status(200).json({ 
      error: "Google OAuth credentials (GOOGLE_CLIENT_ID) not fully configured in environment.",
      configured: false
    });
  }
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    prompt: "consent"
  });
  res.json({ authUrl, configured: true });
});

app.get("/api/calendar/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    const oauth2Client = getOAuth2Client();
    if (!oauth2Client) {
      return res.status(500).send("OAuth client not configured.");
    }
    const { tokens } = await oauth2Client.getToken(code);
    const script = `
      <!DOCTYPE html>
      <html>
      <head><title>Google Calendar Sync</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #f8fafc;">
        <h2 style="color: #0f172a;">Google Calendar Connected!</h2>
        <p style="color: #64748b;">You have successfully granted Google Calendar permissions.</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'GOOGLE_CALENDAR_TOKENS', tokens: ${JSON.stringify(tokens)} }, '*');
            setTimeout(() => window.close(), 1500);
          } else {
            window.location.href = '/?calendar_synced=true';
          }
        </script>
      </body>
      </html>
    `;
    res.send(script);
  } catch (err: any) {
    console.error("Error exchanging OAuth code:", err);
    res.status(500).send("Failed to authenticate with Google Calendar.");
  }
});

app.post("/api/calendar/sync-event", async (req, res) => {
  try {
    const { tokens, accessToken, event } = req.body;
    if (!event || !event.title) {
      return res.status(400).json({ error: "Event title is required." });
    }

    const oauth2Client = getOAuth2Client() || new google.auth.OAuth2();
    if (tokens) {
      oauth2Client.setCredentials(tokens);
    } else if (accessToken) {
      oauth2Client.setCredentials({ access_token: accessToken });
    } else if (process.env.GOOGLE_ACCESS_TOKEN) {
      oauth2Client.setCredentials({ access_token: process.env.GOOGLE_ACCESS_TOKEN });
    } else {
      return res.status(401).json({ error: "Google OAuth tokens are required to sync to Google Calendar." });
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    
    const startDate = new Date(event.startDate || Date.now());
    const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
    const isAllDay = event.allDay ?? true;

    const calendarEvent: any = {
      summary: event.title,
      description: `${event.description || ''}\n\nClient: ${event.clientName || 'General'}\nCategory: ${event.category || 'Compliance'}\nSynced via CA Jyoshi Manohar Compliance Suite.`,
      location: event.location || 'CA Manohar Compliance Suite',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 },
          { method: 'popup', minutes: 2 * 60 },
          { method: 'email', minutes: 24 * 60 * 2 }
        ]
      }
    };

    if (isAllDay) {
      const startStr = startDate.toISOString().split("T")[0];
      const endStr = new Date(endDate.getTime() + 86400000).toISOString().split("T")[0];
      calendarEvent.start = { date: startStr };
      calendarEvent.end = { date: endStr };
    } else {
      calendarEvent.start = { dateTime: startDate.toISOString() };
      calendarEvent.end = { dateTime: endDate.toISOString() };
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: calendarEvent
    });

    res.json({ success: true, eventId: response.data.id, htmlLink: response.data.htmlLink });
  } catch (error: any) {
    console.error("Error creating Google Calendar event:", error?.response?.data || error);
    res.status(500).json({ error: error.message || "Failed to create Google Calendar event." });
  }
});

app.post("/api/calendar/batch-sync", async (req, res) => {
  try {
    const { tokens, accessToken, events = [] } = req.body;
    if (!events.length) {
      return res.status(400).json({ error: "No events provided for batch sync." });
    }

    const oauth2Client = getOAuth2Client() || new google.auth.OAuth2();
    if (tokens) {
      oauth2Client.setCredentials(tokens);
    } else if (accessToken) {
      oauth2Client.setCredentials({ access_token: accessToken });
    } else if (process.env.GOOGLE_ACCESS_TOKEN) {
      oauth2Client.setCredentials({ access_token: process.env.GOOGLE_ACCESS_TOKEN });
    } else {
      return res.status(401).json({ error: "Google OAuth tokens are required for API direct sync." });
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const results = [];

    for (const event of events) {
      try {
        const startDate = new Date(event.startDate || Date.now());
        const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
        const isAllDay = event.allDay ?? true;

        const calendarEvent: any = {
          summary: event.title,
          description: `${event.description || ''}\n\nCategory: ${event.category || 'Statutory Compliance'}\nSynced via CA Jyoshi Manohar Compliance Suite.`,
          location: event.location || 'CA Manohar Compliance Suite',
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 24 * 60 },
              { method: 'email', minutes: 24 * 60 * 2 }
            ]
          }
        };

        if (isAllDay) {
          const startStr = startDate.toISOString().split("T")[0];
          const endStr = new Date(endDate.getTime() + 86400000).toISOString().split("T")[0];
          calendarEvent.start = { date: startStr };
          calendarEvent.end = { date: endStr };
        } else {
          calendarEvent.start = { dateTime: startDate.toISOString() };
          calendarEvent.end = { dateTime: endDate.toISOString() };
        }

        const resItem = await calendar.events.insert({
          calendarId: "primary",
          requestBody: calendarEvent
        });
        results.push({ id: event.id, success: true, eventId: resItem.data.id, htmlLink: resItem.data.htmlLink });
      } catch (err: any) {
        results.push({ id: event.id, success: false, error: err.message });
      }
    }

    res.json({ success: true, count: results.filter(r => r.success).length, total: events.length, results });
  } catch (error: any) {
    console.error("Error in batch calendar sync:", error);
    res.status(500).json({ error: error.message || "Failed to batch sync calendar events." });
  }
});

// AI Daily/Weekly Standup & Executive Briefing endpoint
app.post("/api/ai/daily-standup", async (req, res) => {
  try {
    const {
      tasks = [],
      complianceEvents = [],
      invoices = [],
      briefingType = "daily", // "daily" | "weekly"
      focusGoal = "",
      userRole = "Client / Business Owner"
    } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY to environment secrets."
      });
    }

    const ai = getAiClient();

    // Summarize task state
    const completedTasks = tasks.filter((t: any) => t.completed || t.status === "Completed" || t.status === "Done");
    const pendingTasks = tasks.filter((t: any) => !t.completed && t.status !== "Completed" && t.status !== "Done");
    const urgentTasks = pendingTasks.filter((t: any) => t.priority === 1 || t.priority === "High" || t.priority === "urgent");

    // Summarize compliance state
    const pendingCompliance = complianceEvents.filter((c: any) => c.status !== "Filed" && c.status !== "Completed");
    const upcomingCompliance = pendingCompliance.slice(0, 5);

    // Summarize financial & invoice state
    const pendingInvoices = invoices.filter((i: any) => i.status === "pending" || i.status === "overdue" || i.status === "Unpaid");
    const overdueInvoices = invoices.filter((i: any) => i.status === "overdue");
    const totalPendingAmount = pendingInvoices.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
    const totalOverdueAmount = overdueInvoices.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);

    const contextData = `
--- BRIEFING PERIOD: ${briefingType.toUpperCase()} STANDUP ---
User Profile: ${userRole}
Specific Focus Note / Goal: ${focusGoal || "Overall Operational & Financial Excellence"}

1. WORKSPACE TASKS & MILESTONES:
- Total Tasks Tracked: ${tasks.length}
- Completed Tasks (${completedTasks.length}): ${completedTasks.slice(0, 5).map((t: any) => `"${t.title}"`).join(", ") || "None recorded"}
- Pending Active Tasks (${pendingTasks.length}): ${pendingTasks.slice(0, 7).map((t: any) => `"${t.title}" (Priority: ${t.priority || "Normal"}, Due: ${t.dueDate || t.deadline || "Unscheduled"})`).join(", ") || "All tasks clear!"}
- High Priority / Urgent Items (${urgentTasks.length}): ${urgentTasks.map((t: any) => `"${t.title}"`).join(", ") || "None"}

2. STATUTORY COMPLIANCE & TAX DATES:
- Total Pending Filings: ${pendingCompliance.length}
- Upcoming Due Dates: ${upcomingCompliance.map((c: any) => `"${c.title}" (Due: ${c.dueDate ? new Date(c.dueDate).toLocaleDateString("en-IN") : "Upcoming"})`).join(", ") || "No urgent filings pending"}

3. FINANCIALS & INVOICE RECEIVABLES:
- Total Outstanding Invoices / Receivables: ${pendingInvoices.length} (Total Value: ₹${totalPendingAmount.toLocaleString("en-IN")})
- Overdue Invoices: ${overdueInvoices.length} (Overdue Value: ₹${totalOverdueAmount.toLocaleString("en-IN")})
- Sample Invoices: ${pendingInvoices.slice(0, 5).map((i: any) => `"${i.title || i.category || 'Invoice'}" - ₹${i.amount || 0} (${i.status})`).join(", ") || "No pending invoices"}
`;

    const systemInstruction = `You are an elite Executive Chief of Staff and AI Performance Advisor for CA Jyoshi Manohar's corporate financial and compliance platform.
Your task is to generate an inspiring, highly practical, crisp, and beautifully formatted ${briefingType} standup summary and executive briefing.

Formatting & Style Instructions:
- Always use Markdown with clear section headers, bold bullet points, and clean spacing.
- Format all currency figures in Indian Rupees (₹) with proper Indian numbering.
- Keep the tone highly professional, encouraging, objective, and sharp.
- Include exact productivity metrics / highlights.

Required Briefing Structure:
1. 🌅 **${briefingType === "weekly" ? "Weekly Executive Briefing & Focus" : "Morning Standup Snapshot"}**
   - A 2-sentence executive summary highlighting overall operational momentum, key wins, and top priorities.
   - **Productivity Score**: Provide an estimated productivity rating (e.g., 92% / High Velocity) based on completion ratio and pending workload.

2. 🎉 **Recent Completed Work & Wins**
   - 2-4 bullet points highlighting completed tasks, filings, or milestones achieved.

3. ⏳ **Critical Upcoming Deadlines & Statutory Obligations**
   - Highlighting key task deadlines and statutory compliance dates (GST, Income Tax, TDS, ROC) that need attention this ${briefingType === "weekly" ? "week" : "day or next 48 hours"}.

4. 💸 **Receivables, Invoices & Cashflow Vigilance**
   - Brief analysis of pending and overdue invoices, with direct recommendations on follow-ups to maximize collection.

5. 🎯 **Actionable Top 3 Priorities for Today**
   - Exactly 3 concrete, sequential action items for the user or team to focus on first to ensure maximum throughput.`;

    const prompt = `Please generate the ${briefingType} Standup Summary briefing based on the following real-time workspace data:\n\n${contextData}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
      }
    });

    res.json({
      summary: response.text || "Daily standup briefing generated successfully.",
      stats: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        urgentTasks: urgentTasks.length,
        pendingCompliance: pendingCompliance.length,
        pendingInvoices: pendingInvoices.length,
        totalPendingAmount,
        totalOverdueAmount
      }
    });
  } catch (error: any) {
    console.error("Error generating daily standup briefing:", error);
    res.status(500).json({ error: error.message || "Failed to generate standup summary briefing." });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the dist folder
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      // Return 404 for missing static assets instead of serving index.html
      const ext = path.extname(req.path);
      if (ext || req.path.startsWith('/assets/') || req.path.startsWith('/src/')) {
        return res.status(404).send('Not Found');
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
