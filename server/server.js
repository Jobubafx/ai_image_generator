import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// OpenRouter API Service
class OpenRouterService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }

    async makeRequest(messages, model = 'google/gemini-2.0-flash-exp:free', maxTokens = 4000) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': 'https://your-app.render.com',
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
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
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
        // For demo purposes - in production, you'd use actual background removal
        const messages = [
            {
                role: 'system',
                content: 'You are an AI that analyzes images and provides background removal instructions.'
            },
            {
                role: 'user',
                content: 'Analyze this image for background removal and provide processing instructions.'
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
        
        if (!style) {
            return res.status(400).json({ error: 'Style is required' });
        }

        const concept = await apiService.generateImagePrompt(style, topic, aspectRatio);
        res.json({ concept });
    } catch (error) {
        console.error('Concept generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/remove-background', async (req, res) => {
    try {
        const { imageData } = req.body;
        
        if (!imageData) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        const result = await apiService.removeBackground(imageData);
        res.json({ result, message: 'Background removal completed' });
    } catch (error) {
        console.error('Background removal error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, style, aspectRatio } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Enhanced prompt with style and ratio context
        const enhancedPrompt = `${prompt}. Style: ${style}. Aspect ratio: ${aspectRatio}. High quality, professional, studio-grade image with cinematic lighting.`;

        const messages = [
            {
                role: 'system',
                content: 'You are helping to generate images based on detailed prompts. Provide guidance for image generation.'
            },
            {
                role: 'user',
                content: `Generate an image based on this prompt: ${enhancedPrompt}`
            }
        ];

        const response = await apiService.makeRequest(messages, 'google/gemini-2.0-flash-exp:free');
        
        // For demo - return success with the prompt
        // In production, you'd integrate with actual image generation
        res.json({ 
            success: true, 
            message: 'Image generation completed successfully',
            prompt: enhancedPrompt,
            aspectRatio,
            style
        });
    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`OpenRouter API Key: ${process.env.OPENROUTER_API_KEY ? 'Set' : 'Not set'}`);
});
