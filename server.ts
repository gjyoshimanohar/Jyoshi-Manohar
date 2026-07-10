import express from "express";
import cors from "cors";
import path from "path";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

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
      model: "gemini-3.5-flash",
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
