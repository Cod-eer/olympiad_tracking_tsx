import dotenv from "dotenv";
dotenv.config();
import OpenAI from "openai";
import { chromium } from "playwright";

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
- ALWAYS answer in English.
- DO NOT use any other languages.
- If a section is not mentioned, return an empty array (or empty string for name).
- Convert all dates to dd-mm-yyyy.
- If starting or ending date is missing, use the available one for both dateStart and dateEnd.
- If only month/year is available, use day = 01.
- Do not infer or guess missing data.
- Be concise and factual.
- Do not include any additional information.`;

const OpenaiRequest = `Extract the required information from the following webpage text:

{text}`;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://models.github.ai/inference",
});

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

async function extractFromChunk(chunkText) {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: OpenaiRequest.replace("{text}", chunkText) },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4.1",  // or a bigger model if you want more tokens
    messages,
    temperature: 0.2,
  });

  return JSON.parse(response.choices[0].message.content);
}

function mergeUnique(arr) {
  return [...new Set(arr.map(x => x.trim()))];
}

async function processAllChunks(chunks) {
  const result = {
    name: "",
    dates: [],
    billing: [],
    requirements: [],
    organizers: [],
    rewards: [],
  };

  for (let i = 0; i < chunks.length; i++) {
    const data = await extractFromChunk(chunks[i]);

    if (!result.name && data.name) {
      result.name = data.name;
    }

    result.dates.push(...(data.dates || []));
    result.billing.push(...(data.billing || []));
    result.requirements.push(...(data.requirements || []));
    result.organizers.push(...(data.organizers || []));
    result.rewards.push(...(data.rewards || []));
  }

  // Deduplicate
  result.billing = mergeUnique(result.billing);
  result.requirements = mergeUnique(result.requirements);
  result.organizers = mergeUnique(result.organizers);
  result.rewards = mergeUnique(result.rewards);

  // Deduplicate dates by (date + description)
  result.dates = Array.from(
    new Map(
      result.dates.map(d => [`${d.date}-${d.description}`, d])
    ).values()
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
