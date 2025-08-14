import express from 'express';
import dotenv from 'dotenv';
import cors from "cors";
import { ScrapeReturnDict } from './scrape.js'; // Adjust the import path as necessary

dotenv.config();

const app = express();
const port = 4000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.post('/api/call_result', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    try {
        const result = await ScrapeReturnDict(url);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error scraping URL:', error);
        return res.status(500).json({ error: 'Failed to scrape URL' });
    }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
