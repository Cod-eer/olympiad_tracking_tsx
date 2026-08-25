import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI, Type } from "@google/genai";
import { chromium } from "playwright-core";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3.5-flash-lite";
const MIN_INTERVAL_MS = 4500;

const systemPrompt = `You are an information extraction engine.

Extract information from the provided webpage text and respond ONLY with valid JSON.
Do NOT include explanations, comments, or markdown.
Do NOT include trailing commas.
Do NOT wrap the response in backticks.

Use this exact JSON schema:

{
  "name": string,
  "dates": [
    {
      "dateStart": "dd-mm-yyyy",
      "dateEnd": "dd-mm-yyyy",
      "description": string
    }
  ],
  "billing": string[],
  "requirements": string[],
  "organizers": string[],
  "rewards": string[]
}

Rules:
- ALWAYS answer in English. If you encounter text in another language, translate it to English.
- DO NOT use any other languages.
- If a section is not mentioned, return an empty array (or empty string for name).
- Convert all dates to dd-mm-yyyy.
- If starting or ending date is missing, use the available one for both dateStart and dateEnd.
- If only month/year is available, use day = 01.
- Do not infer or guess missing data.
- Be concise and factual.
- Do not include any additional information.`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    dates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dateStart: { type: Type.STRING },
          dateEnd: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["dateStart", "dateEnd", "description"],
      },
    },
    billing: { type: Type.ARRAY, items: { type: Type.STRING } },
    requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
    organizers: { type: Type.ARRAY, items: { type: Type.STRING } },
    rewards: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["name", "dates", "billing", "requirements", "organizers", "rewards"],
};

const systemInstruction = `You are an information extraction engine.
Extract information from the provided webpage text according to the given schema.
Rules:
- ALWAYS answer in English. If you encounter text in another language, translate it to English.
- DO NOT use any other languages.
- If a section is not mentioned, return an empty array (or empty string for name).
- Convert all dates to dd-mm-yyyy.
- If starting or ending date is missing, use the available one for both dateStart and dateEnd.
- If only month/year is available, use day = 01.
- Do not infer or guess missing data. Be concise and factual.`;


function estimateTokens(text) {
    return Math.ceil(text.split(/\s+/).length * 1.3);
}

function chunkText(text, maxTokens) {
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
    let chunks = [];
    let currentChunk = "";

    for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);
        const currentTokens = estimateTokens(currentChunk);

        if (currentTokens + sentenceTokens > maxTokens) {
            chunks.push(currentChunk);
            currentChunk = sentence;
        } else {
            currentChunk += " " + sentence;
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    return chunks;
}

async function extractFromChunk(chunkText, attempt = 0) {
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Extract the required information from the following webpage text:\n\n${chunkText}`,
      config: { systemInstruction, responseMimeType: "application/json", responseSchema, temperature: 0.2 },
    });
    return JSON.parse(response.text);
  } catch (err) {
    if (err.status === 429 && attempt < 5) {
      await sleep(2 ** attempt * 1000);
      return extractFromChunk(chunkText, attempt + 1);
    }
    throw err;
  }
}

function mergeUnique(arr) {
  return [...new Set(arr.map(x => x.trim()))];
}

async function processAllChunks(chunks) {
  const result = { name: "", dates: [], billing: [], requirements: [], organizers: [], rewards: [] };

  for (let i = 0; i < chunks.length; i++) {
    const data = await extractFromChunk(chunks[i]);

    if (!result.name && data.name) result.name = data.name;
    result.dates.push(...(data.dates || []));
    result.billing.push(...(data.billing || []));
    result.requirements.push(...(data.requirements || []));
    result.organizers.push(...(data.organizers || []));
    result.rewards.push(...(data.rewards || []));

    if (i < chunks.length - 1) await sleep(MIN_INTERVAL_MS);
  }

  result.billing = mergeUnique(result.billing);
  result.requirements = mergeUnique(result.requirements);
  result.organizers = mergeUnique(result.organizers);
  result.rewards = mergeUnique(result.rewards);

  result.dates = Array.from(
    new Map(result.dates.map(d => [`${d.dateStart}-${d.dateEnd}-${d.description}`, d])).values()
  );

  return result;
}

function transformUrl(url) {
  try {
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    return new URL(url).toString();
  } catch {
    throw new Error("Invalid URL");
  }
}

export async function ScrapeReturnDict(url) {
  try {
      const browser = await chromium.connect(
        `wss://production-sfo.browserless.io/chromium/playwright?token=${process.env.BROWSERLESS_TOKEN}`
      );
      url = transformUrl(url);
      const context = browser.contexts()[0] || await browser.newContext();
      const page = await context.newPage();
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });

      const text = await page.evaluate(() => {
        return document.body.innerText
          .replace(/\u200b/g, "")
          .replace(/\u00a0/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      });
      // close browser
      if (browser.isConnected()) {
      await browser.close();
    }

      // Prepare OpenAI client
      const chunks = chunkText(text, 6000);
      const parsed = await processAllChunks(chunks);
      return {
        name: parsed.name,
        dates: parsed.dates,
        billing: parsed.billing,
        requirements: parsed.requirements,
        organizers: parsed.organizers,
        rewards: parsed.rewards,
        url,
      };
  } catch (error) {
      console.error(error);
      throw error;
  }
}
