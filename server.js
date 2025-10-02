import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - IMPORTANT: Serve static files BEFORE other middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// OpenRouter API Service
class OpenRouterService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }

    async makeRequest(messages, model = 'google/gemini-2.0-flash-exp:free', maxTokens = 2000) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': 'https://ai-image-generator.onrender.com',
                'X-Title': 'AI Image Generator'
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: maxTokens,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async generateImagePrompt(style, topic = '', aspectRatio = '1:1') {
        const prompt = `Create detailed prompt for ${style} in ${aspectRatio} ratio. ${topic ? `Topic: ${topic}` : ''}`;
        
        const messages = [
            {
                role: 'system',
                content: 'You generate image prompts.'
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        return await this.makeRequest(messages);
    }
}

const apiService = new OpenRouterService();

// API Routes
app.post('/api/generate-concept', async (req, res) => {
    try {
        const { style, topic, aspectRatio } = req.body;
        
        if (!style) {
            return res.status(400).json({ error: 'Style required' });
        }

        const concept = await apiService.generateImagePrompt(style, topic, aspectRatio);
        res.json({ concept });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, style, aspectRatio } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt required' });
        }

        const enhancedPrompt = `${prompt}. Style: ${style}. Ratio: ${aspectRatio}`;

        const messages = [
            {
                role: 'user',
                content: `Guide for: ${enhancedPrompt}`
            }
        ];

        const response = await apiService.makeRequest(messages);
        
        res.json({ 
            success: true, 
            guidance: response
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        time: new Date().toISOString(),
        apiKey: process.env.OPENROUTER_API_KEY ? 'Set' : 'Not set'
    });
});

// Serve main app - This should be LAST
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
