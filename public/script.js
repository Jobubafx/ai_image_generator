// API Service
class ApiService {
    constructor() {
        this.baseUrl = window.location.origin;
    }

    async makeApiCall(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || `API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            throw new Error(`Network error: ${error.message}`);
        }
    }

    async generateConcept(style, topic, aspectRatio) {
        return this.makeApiCall('/api/generate-concept', {
            style,
            topic,
            aspectRatio
        });
    }

    async removeBackground(imageData) {
        return this.makeApiCall('/api/remove-background', {
            imageData
        });
    }

    async generateImage(prompt, style, aspectRatio) {
        return this.makeApiCall('/api/generate-image', {
            prompt,
            style,
            aspectRatio
        });
    }
}
