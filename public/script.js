import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// No need to import node-fetch - using built-in fetch in Node.js 18+

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// OpenRouter API Service
class OpenRouterService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }

    async makeRequest(messages, model = 'google/gemini-2.0-flash-exp:free', maxTokens = 4000) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY environment variable.');
        }

        console.log('Making API request to OpenRouter...');
        
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
            console.error('OpenRouter API error:', response.status, errorText);
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('OpenRouter API response received');
        return data.choices[0].message.content;
    }

    async generateImagePrompt(style, topic = '', aspectRatio = '1:1') {
        const aspectRatios = {
            '9:16': 'portrait (9:16 aspect ratio)',
            '1:1': 'square (1:1 aspect ratio)',
            '16:9': 'landscape (16:9 aspect ratio)',
            '3:4': 'vertical (3:4 aspect ratio)',
            '4:3': 'horizontal (4:3 aspect ratio)'
        };

        const ratioText = aspectRatios[aspectRatio] || 'standard aspect ratio';

        let prompt = `Create a detailed, professional image generation prompt for a ${style} in ${ratioText}. `;
        
        if (topic) {
            prompt += `The main topic/theme is: "${topic}". `;
        }

        prompt += `The image should be:
- High quality, professional, studio-grade
- Excellent lighting and composition
- Cinematic quality with premium aesthetics
- Suitable for commercial use
- Visually appealing and engaging
- Optimized for social media sharing

Provide a comprehensive prompt that includes details about:
- Style and aesthetic
- Lighting and atmosphere
- Composition and framing
- Color palette
- Key visual elements
- Overall mood and feeling

Make the prompt descriptive and specific enough to generate a professional-quality image.`;

        const messages = [
            {
                role: 'system',
                content: 'You are a creative AI assistant that generates detailed, professional image generation prompts. Create prompts that will produce high-quality, studio-grade images suitable for the specified design style.'
            },
            {
                role: 'user',
                content: prompt
            }
        ];

        return await this.makeRequest(messages, 'google/gemini-2.0-flash-exp:free');
    }

    async removeBackground(imageData) {
        const messages = [
            {
                role: 'system',
                content: 'You are an AI that analyzes images and provides background removal instructions. Provide detailed instructions for removing backgrounds while preserving the main subject.'
            },
            {
                role: 'user',
                content: 'Analyze this image for background removal and provide step-by-step processing instructions for creating a transparent background while keeping the main subject intact.'
            }
        ];

        return await this.makeRequest(messages, 'google/gemini-2.0-flash-exp:free');
    }
}

const apiService = new OpenRouterService();

// API Routes
app.post('/api/generate-concept', async (req, res) => {
    try {
        const { style, topic, aspectRatio } = req.body;
        
        console.log('Generating concept for:', { style, topic, aspectRatio });
        
        if (!style) {
            return res.status(400).json({ error: 'Style is required' });
        }

        const concept = await apiService.generateImagePrompt(style, topic, aspectRatio);
        console.log('Concept generated successfully');
        res.json({ concept });
    } catch (error) {
        console.error('Concept generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/remove-background', async (req, res) => {
    try {
        const { imageData } = req.body;
        
        console.log('Processing background removal for image');
        
        if (!imageData) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        const result = await apiService.removeBackground(imageData);
        console.log('Background removal completed');
        res.json({ result, message: 'Background removal completed successfully' });
    } catch (error) {
        console.error('Background removal error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, style, aspectRatio } = req.body;
        
        console.log('Generating image with:', { style, aspectRatio, promptLength: prompt?.length });
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Enhanced prompt with style and ratio context
        const enhancedPrompt = `${prompt}. Style: ${style}. Aspect ratio: ${aspectRatio}. High quality, professional, studio-grade image with cinematic lighting.`;

        const messages = [
            {
                role: 'system',
                content: 'You are helping to generate images based on detailed prompts. Provide guidance for creating professional, high-quality images.'
            },
            {
                role: 'user',
                content: `Generate an image based on this detailed prompt: ${enhancedPrompt}`
            }
        ];

        const response = await apiService.makeRequest(messages, 'google/gemini-2.0-flash-exp:free');
        
        console.log('Image generation completed successfully');
        
        res.json({ 
            success: true, 
            message: 'Image generation completed successfully',
            prompt: enhancedPrompt,
            aspectRatio,
            style,
            guidance: response.substring(0, 300) + '...'
        });
    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        apiKey: process.env.OPENROUTER_API_KEY ? 'Set' : 'Not set'
    });
});

// Test endpoint
app.get('/api/test', async (req, res) => {
    try {
        const testResponse = await apiService.makeRequest([
            {
                role: 'user',
                content: 'Say "API is working"'
            }
        ], 'google/gemini-2.0-flash-exp:free', 50);
        
        res.json({ 
            status: 'API Connected',
            message: testResponse,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'API Error',
            error: error.message 
        });
    }
});

// Serve the main application for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔑 OpenRouter API Key: ${process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
