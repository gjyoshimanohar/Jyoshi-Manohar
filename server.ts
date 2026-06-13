import express from "express";
import cors from "cors";
import path from "path";
import axios from "axios";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API routes go here FIRST

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
    const sender = senderEmail ? { name: senderName || "Manohar Business Consulting", email: senderEmail } : { name: "Manohar Business Consulting", email: "gjyoshimanohar@gmail.com" }; // Change to the actual verified Brevo sender email if different.

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
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
