# AI Image Generator

A modern, responsive AI image generator using Nano Banana model through OpenRouter API.

## Features

- 🎨 Multiple design styles (Birthday, Wedding, Social Media, etc.)
- 📐 5 aspect ratios (9:16, 1:1, 16:9, 3:4, 4:3)
- 🖼️ Multiple image upload with background removal
- 🤖 AI concept generation
- 🎯 Image refinement and variations
- 💾 Gallery for saving creations
- 📱 Fully responsive design

## Setup Instructions

### 1. Upload to GitHub

1. Create a new repository on GitHub
2. Upload all files to your repository
3. Commit and push the changes

### 2. Deploy to Render.com

1. Go to [render.com](https://render.com) and sign up/login
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure deployment:
   - **Name**: `ai-image-generator`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. Configure Environment Variables on Render

1. In your Render dashboard, go to your web service
2. Click "Environment" tab
3. Add environment variable:
   - **Key**: `OPENROUTER_API_KEY`
   - **Value**: Your OpenRouter API key

### 4. Get Your OpenRouter API Key

1. Go to [OpenRouter](https://openrouter.ai)
2. Sign up/login to your account
3. Go to API Keys section
4. Create a new API key
5. Copy the key and add it to Render environment variables

## File Structure


## API Configuration

The application uses OpenRouter API with these models:
- **Gemini 2.0 Flash** for concept generation and analysis
- **Nano Banana** for image generation (via OpenRouter)

## Usage Workflow

1. **Upload Images**: Drag & drop or click to upload reference images
2. **Analyze**: Remove backgrounds from uploaded images
3. **Select Style**: Choose from various design styles and aspect ratios
4. **Generate Concept**: Let AI create a creative prompt or use your own
5. **Generate Image**: Create your AI-powered image
6. **Refine**: Make adjustments and generate variations
7. **Save**: Download or save to your gallery

## Security Notes

- API keys are stored securely in environment variables
- Never commit API keys to version control
- Render provides secure environment variable management

## Support

For deployment issues:
1. Check Render deployment logs
2. Verify environment variables are set correctly
3. Ensure all files are properly committed to GitHub

For API issues:
1. Verify your OpenRouter API key is valid
2. Check OpenRouter documentation for rate limits
3. Ensure you have sufficient credits in your OpenRouter account
