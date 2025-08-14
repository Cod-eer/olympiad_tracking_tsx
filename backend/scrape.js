import dotenv from "dotenv";
dotenv.config();

import puppeteer from "puppeteer";
import OpenAI from "openai";


const systemPrompt = `You are an intelligent extraction assistant designed to analyze and summarize academic competition webpages.

Your task is to extract and return the following categories from the provided text:

1. **NAME**
- Return only a single line with the name of the competition.

2. **DATES**
- Extract all relevant dates (e.g. registration deadlines, submission deadlines, result announcements, ceremonies).
- Return each as: dd-mm-yyyy – event description.
- If the date is in a different format, convert it to dd-mm-yyyy. If only a month/year is available, use 01 for the day.

3. **BILLING OR ENTRY FEES**
- Include any mention of costs, registration fees, or if participation is free.

4. **PARTICIPATION REQUIREMENTS**
- Include age, grade level, nationality, school level, or other restrictions.

5. **ORGANIZERS**
- Include any organizing bodies, institutional partners, sponsors, or hosts.
- Write down only the names of organizations.

6. **REWARDS FOR WINNERS**
- Include scholarships, cash prizes, certificates, publications, internships, or other awards.

Respond in clearly separated sections, using the following format:

CATEGORY_NAME (exact name):
- item 1
- item 2

If an item has subitems, shift them with a tab:
- item 1
    - item 1.1
    - item 1.2

ANSWER ONLY IN ENGLISH.

If any section is not mentioned in the text, respond with:
Not specified

Use concise and factual formatting. Do not invent or infer details not clearly stated.`;

const OpenaiRequest = `Here is the content of a competition webpage:\n\n{text}\n\nPlease extract and return:
1. Name of the olympiad
2. All important dates
3. Billing or entry fees
4. Participation requirements
5. Organizers and partners of the olympiad, or hosting institutions
6. Rewards for winners`;

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
    model: "gpt-4o-mini",  // or a bigger model if you want more tokens
    messages,
    temperature: 0.5,
  });

  return response.choices[0].message.content;
}

async function processAllChunks(chunks) {
  const results = {};
  for (const chunk of chunks) {
    const extraction = await extractFromChunk(chunk);
    const parsed = parseSections(extraction);
    for (const [key, value] of Object.entries(parsed)) {
      if (!results[key]) {
        results[key] = [];
      }
      results[key].push(...value);
    }
  }
  return results;
}


function parseSections(rawText) {
    // Split on headers like NAME:, DATES:, etc.
    let splitSections = rawText.trim().split(/\n?([A-Z ]+):\s*\n/);
    // Remove empty sections and trim whitespace
    splitSections = splitSections.filter((section) => section.trim() !== "");
    let parsed = {};
    for (let i = 1; i < splitSections.length; i += 2) {
        const title = splitSections[i].trim().toLowerCase();
        const content = splitSections[i + 1].trim();
        const lines = content
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        const sectionItems = lines.map((line) => line.replace(/^[-*]\s+/, ""));
        parsed[title] = sectionItems;
    }
    return parsed;
}

function transformUrl(url) {
    if (!url.startsWith("http")) {
        url = "https://www." + url;
    }
    return url;
}

async function ScrapeReturnDict(url) {
    url = transformUrl(url);

    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const text = await page.evaluate(() => {
        // Get all text content from the body
        let rawText = document.body.innerText;

        // Remove zero-width spaces & trim
        return rawText
          .replace(/\u200b/g, "")    // zero-width spaces
          .replace(/\u00a0/g, " ")   // non-breaking spaces
          .replace(/\s+/g, " ")      // collapse multiple spaces
          .trim();
    });
    await browser.close();

    // Prepare OpenAI client

    const chunks = chunkText(text, 6000);
    console.log(`Total chunks: ${chunks.length}`);
    const parsed = await processAllChunks(chunks);
    return {
        name: parsed["name"] || [],
        dates: parsed["dates"] || [],
        billing: parsed["billing or entry fees"] || [],
        requirements: parsed["participation requirements"] || [],
        organizers: parsed["organizers"] || [],
        rewards: parsed["rewards for winners"] || [],
        url: url || "",
    };
}

export { ScrapeReturnDict };

