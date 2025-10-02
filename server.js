import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// OpenRouter API Service
class OpenRouterService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }

    async makeRequest(messages, model = 'google/gemini-2.0-flash-exp:free', maxTokens = 2000) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.');
        }

        console.log('Making API request to OpenRouter with model:', model);
        
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
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async generateImagePrompt(style, topic = '', aspectRatio = '1:1') {
        const prompt = `Create a detailed image generation prompt for a ${style} in ${aspectRatio} aspect ratio. ${topic ? `Topic: ${topic}` : ''} Make it professional and high quality.`;
        
        const messages = [
            {
                role: 'system',
                content: 'You are a creative AI assistant that generates detailed image generation prompts.'
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
        
        console.log('Generating concept:', { style, topic, aspectRatio });
        
        if (!style) {
            return res.status(400).json({ error: 'Style is required' });
        }

        const concept = await apiService.generateImagePrompt(style, topic, aspectRatio);
        res.json({ concept });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, style, aspectRatio } = req.body;
        
        console.log('Generating image guidance:', { style, aspectRatio });
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const enhancedPrompt = `${prompt}. Style: ${style}. Aspect ratio: ${aspectRatio}. High quality professional image.`;

        const messages = [
            {
                role: 'user',
                content: `Provide guidance for creating this image: ${enhancedPrompt}`
            }
        ];

        const response = await apiService.makeRequest(messages);
        
        res.json({ 
            success: true, 
            message: 'Image generation guidance created',
            prompt: enhancedPrompt,
            guidance: response
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        apiKey: process.env.OPENROUTER_API_KEY ? 'Set' : 'Not set',
        nodeVersion: process.version
    });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'Server is running!',
        message: 'API endpoints are working',
        timestamp: new Date().toISOString()
    });
});

// Serve the main application
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health: http://0.0.0.0:${PORT}/health`);
    console.log(`🔑 API Key: ${process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Missing'}`);
});
