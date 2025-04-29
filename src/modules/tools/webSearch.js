import axios from 'axios';
import { log } from '../../utils/logger.js';

export class WebSearch {
    constructor() {
        this.apiUrl = process.env.TAVILY_API_URL;
        this.apiKey = process.env.TAVILY_API_KEY;
        if (!this.apiKey) {
            throw new Error('TAVILY_API_KEY is not configured');
        }
    }

    async search(query, limit = 5) {
        try {
            const response = await axios.post(this.apiUrl, {
                api_key: this.apiKey,
                query: query,
                search_depth: "advanced",
                max_results: limit,
                include_domains: [],
                exclude_domains: [],
                include_answer: true,
                include_raw_content: false,
                include_images: false,
                include_summary: true
            });

            return response.data.results.map(result => ({
                title: result.title,
                link: result.url,
                snippet: result.content,
                source: 'Tavily Search'
            }));
        } catch (error) {
            log(`Tavily search error: ${error.message}`, 'error');
            return [];
        }
    }

    formatResults(results) {
        if (!results.length) return 'No search results found.';

        return results.map(result =>
            `[${result.title}](${result.link})\n${result.snippet}`
        ).join('\n\n');
    }
}
