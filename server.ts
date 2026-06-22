import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON parsing with a large size limit so students can paste long articles
app.use(express.json({ limit: "15mb" }));

// Lazy init Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined in Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Simple helper to fetch a URL and strip HTML tags to get clean core text
async function scrapeUrlText(url: string): Promise<{ title: string; content: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to load URL: Server returned status ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Extract page title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "Fetched Web Page";

  // Clean script, style, nav, canvas, footer, svg, and comment blocks
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "") // comments
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // scripts
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "") // styles
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "") // nav layouts
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "") // footer layout
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "") // header layout
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "") // svgs
    .replace(/<canvas\b[^<]*(?:(?!<\/canvas>)<[^<]*)*<\/canvas>/gi, ""); // canvas

  // Strip other HTML elements
  cleaned = cleaned.replace(/<[^>]+>/g, " ");

  // Reduce redundant whitespace and decode common HTML entities briefly
  cleaned = cleaned
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  // Return limited characters to keep context size healthy
  const content = cleaned.substring(0, 45000);
  if (!content) {
    throw new Error("No readable text found on the page. Try pasting the text manually.");
  }

  return { title, content };
}

// 1. Scrape Endpoint
app.post("/api/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const data = await scrapeUrlText(url);
    res.json(data);
  } catch (err: any) {
    console.error("Scraping error:", err.message);
    res.status(500).json({
      error: err.message || "Unable to retrieve webpage content, possibly due to bot protection. Please copy and paste the text directly into the custom text box below instead!",
    });
  }
});

// 2. Summarize & Study Prep Endpoint
app.post("/api/summarize", async (req, res) => {
  const { text, style, level } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: "Content text is required to generate study material." });
  }

  try {
    const ai = getAi();
    const prompt = `
      You are an expert academic educator, summarizer, and study companion.
      I will provide you with the extracted content of a web page/article.
      Your task is to analyze the content and generate a comprehensive study, exam preparation, and retention package based on these parameters:
      - Study Guide Style focus: "${style || 'standard'}" (e.g., standard educational, Feynman technique analogy, Cornell structured Q&As, or Exam-focused)
      - Detail Depth level: "${level || 'comprehensive'}" (e.g., comprehensive breakdown, targeted outline, or high-level overview)

      Please strictly output a structured study suite in JSON that fits the requested schema exactly.

      Here is the raw extracted content to build the study guide from:
      ---
      ${text.substring(0, 40000)}
      ---
    `;

    // Define strict response JSON Schema for study guides
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A highly concise, clean title summarizing this study material." },
            description: { type: Type.STRING, description: "A high-level 2-3 sentence academic overview explaining what this topic covers." },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 4-6 high-impact core golden nuggets/takeaways from the text. Great for quick retention before an exam."
            },
            terminology: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING, description: "The term, keyword, concept name, formula, or acronym." },
                  definition: { type: Type.STRING, description: "A clear, concise definition." },
                  context: { type: Type.STRING, description: "A short sentence showing its direct context or real-world application." }
                },
                required: ["term", "definition", "context"]
              },
              description: "List of key terms, definitions, equations, or jargon introduced in this content."
            },
            outline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING, description: "Main topic or chapter section title." },
                  keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "High-level summary summary bullets for this section." },
                  subtopics: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        heading: { type: Type.STRING, description: "Sub-section or specific subtopic title." },
                        keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed sub-bullets or explanations." }
                      },
                      required: ["heading", "keyPoints"]
                    },
                    description: "Optional subtopics under this main section."
                  }
                },
                required: ["heading", "keyPoints"]
              },
              description: "A complete multi-tier study outline summarizing the core concepts hierarchically."
            },
            feynmanExplanation: {
              type: Type.STRING,
              description: "An intuitive explanation of the most complex concepts using the Feynman Technique (Explain Like I'm 5, using a simple real-world analogy and avoiding heavy academic jargon)."
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING, description: "An active-recall question testing understanding of a core concept." },
                  answer: { type: Type.STRING, description: "A concise, complete, accurate answer." },
                  hint: { type: Type.STRING, description: "A helpful single-sentence hint to prompt the brain before turning." }
                },
                required: ["question", "answer", "hint"]
              },
              description: "8-12 interactive student flashcards designed for quick self-testing and spaced repetition."
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique short identifier (e.g. q1, q2)." },
                  question: { type: Type.STRING, description: "A multiple-choice question designed to mimic potential test conditions." },
                  options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 4 options to choose from." },
                  correctAnswerIndex: { type: Type.INTEGER, description: "0-indexed index of the correct option (0, 1, 2, or 3)." },
                  explanation: { type: Type.STRING, description: "A encouraging, helpful explanation of why this answer is correct and why other choices are incorrect." }
                },
                required: ["id", "question", "options", "correctAnswerIndex", "explanation"]
              },
              description: "5-8 high-quality multiple choice mock exam questions to practice. This facilitates active testing."
            }
          },
          required: ["title", "description", "keyTakeaways", "terminology", "outline", "feynmanExplanation", "flashcards", "quiz"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.error("Gemini AI API Error:", err.message);
    res.status(500).json({ error: err.message || "Failed to generate study materials using Gemini AI. Please check your API secrets key." });
  }
});

// Setup Vite Dev server vs Production assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve static SPA index for any client-side routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web Page Study Notes Generator server active at http://localhost:${PORT}`);
  });
}

startServer();
