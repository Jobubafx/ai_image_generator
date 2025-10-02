// Application State
class AppState {
    constructor() {
        this.uploadedImages = [];
        this.selectedStyle = '';
        this.selectedRatio = '9:16';
        this.conceptPrompt = '';
        this.generatedImages = [];
        this.gallery = JSON.parse(localStorage.getItem('aiGallery') || '[]');
        this.currentGeneratedImage = null;
    }

    saveToGallery(imageData) {
        const galleryItem = {
            id: Date.now().toString(),
            imageUrl: imageData,
            style: this.selectedStyle,
            ratio: this.selectedRatio,
            concept: this.conceptPrompt,
            timestamp: new Date().toISOString()
        };
        
        this.gallery.unshift(galleryItem);
        localStorage.setItem('aiGallery', JSON.stringify(this.gallery));
        return galleryItem;
    }

    clearGallery() {
        this.gallery = [];
        localStorage.removeItem('aiGallery');
    }

    removeFromGallery(id) {
        this.gallery = this.gallery.filter(item => item.id !== id);
        localStorage.setItem('aiGallery', JSON.stringify(this.gallery));
    }
}

// Initialize app
const appState = new AppState();

// DOM Elements
const elements = {
    // Sections
    uploadSection: document.getElementById('upload-section'),
    styleSection: document.getElementById('style-section'),
    conceptSection: document.getElementById('concept-section'),
    progressSection: document.getElementById('progress-section'),
    resultsSection: document.getElementById('results-section'),
    refinementSection: document.getElementById('refinement-section'),
    gallerySection: document.getElementById('gallery-section'),
    
    // Upload elements
    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    imagePreview: document.getElementById('image-preview'),
    analyzeBtn: document.getElementById('analyze-btn'),
    generateDirectBtn: document.getElementById('generate-direct-btn'),
    
    // Style elements
    styleInputs: document.querySelectorAll('input[name="style"]'),
    ratioInputs: document.querySelectorAll('input[name="ratio"]'),
    backToUpload: document.getElementById('back-to-upload'),
    proceedToConcept: document.getElementById('proceed-to-concept'),
    
    // Concept elements
    conceptTypeInputs: document.querySelectorAll('input[name="concept-type"]'),
    conceptTopic: document.getElementById('concept-topic'),
    conceptPrompt: document.getElementById('concept-prompt'),
    generateConceptBtn: document.getElementById('generate-concept-btn'),
    backToStyle: document.getElementById('back-to-style'),
    generateImageBtn: document.getElementById('generate-image-btn'),
    
    // Progress elements
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    
    // Results elements
    generatedImagePlaceholder: document.getElementById('generated-image-placeholder'),
    downloadBtn: document.getElementById('download-btn'),
    generateVariationBtn: document.getElementById('generate-variation-btn'),
    refineBtn: document.getElementById('refine-btn'),
    saveToGalleryBtn: document.getElementById('save-to-gallery-btn'),
    
    // Refinement elements
    refinePreview: document.getElementById('refine-preview'),
    refinementPrompt: document.getElementById('refinement-prompt'),
    applyRefinement: document.getElementById('apply-refinement'),
    cancelRefinement: document.getElementById('cancel-refinement'),
    
    // Gallery elements
    galleryGrid: document.getElementById('gallery-grid'),
    clearGallery: document.getElementById('clear-gallery'),
    
    // Navigation
    navBtns: document.querySelectorAll('.nav-btn'),
    
    // Loading
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingMessage: document.getElementById('loading-message')
};

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
                throw new Error(`API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
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

const apiService = new ApiService();

// UI Management
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    elements.navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === sectionId);
    });

    if (sectionId === 'gallery-section') {
        renderGallery();
    }
}

function updateProgress(percent, message) {
    if (elements.progressFill) {
        elements.progressFill.style.width = `${percent}%`;
    }
    if (elements.progressText) {
        elements.progressText.textContent = message;
    }
}

function showLoading(message = 'Processing your request...') {
    if (elements.loadingMessage) {
        elements.loadingMessage.textContent = message;
    }
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.add('show');
    }
}

function hideLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.remove('show');
    }
}

// Image Handling
function handleFileSelect(files) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    Array.from(files).forEach(file => {
        if (!validTypes.includes(file.type)) {
            alert('Please upload only JPEG, PNG, or WebP images.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            appState.uploadedImages.push({
                data: imageData,
                name: file.name,
                type: file.type
            });
            renderImagePreviews();
            updateActionButtons();
        };
        reader.readAsDataURL(file);
    });
}

function renderImagePreviews() {
    elements.imagePreview.innerHTML = '';
    
    appState.uploadedImages.forEach((image, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img src="${image.data}" alt="Preview ${index + 1}">
            <button class="remove-image" onclick="removeUploadedImage(${index})">×</button>
        `;
        elements.imagePreview.appendChild(previewItem);
    });
}

function removeUploadedImage(index) {
    appState.uploadedImages.splice(index, 1);
    renderImagePreviews();
    updateActionButtons();
}

function updateActionButtons() {
    const hasImages = appState.uploadedImages.length > 0;
    elements.analyzeBtn.disabled = !hasImages;
    elements.generateDirectBtn.disabled = !hasImages;
}

// Event Handlers
function setupEventListeners() {
    // File upload
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files));

    // Drag and drop
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });

    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
    });

    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
        handleFileSelect(e.dataTransfer.files);
    });

    // Analyze button
    elements.analyzeBtn.addEventListener('click', async () => {
        if (appState.uploadedImages.length === 0) return;

        showLoading('Analyzing images and removing backgrounds...');
        try {
            // Process each image for background removal
            for (let i = 0; i < appState.uploadedImages.length; i++) {
                const result = await apiService.removeBackground(
                    appState.uploadedImages[i].data
                );
                console.log('Background removal result:', result);
            }
            
            showSection('style-section');
        } catch (error) {
            alert('Error during image analysis: ' + error.message);
        } finally {
            hideLoading();
        }
    });

    // Direct generation
    elements.generateDirectBtn.addEventListener('click', () => {
        showSection('style-section');
    });

    // Style selection
    elements.styleInputs.forEach(input => {
        input.addEventListener('change', () => {
            appState.selectedStyle = input.value;
            elements.proceedToConcept.disabled = !appState.selectedStyle;
        });
    });

    // Aspect ratio selection
    elements.ratioInputs.forEach(input => {
        input.addEventListener('change', () => {
            appState.selectedRatio = input.value;
        });
    });

    // Navigation
    elements.backToUpload.addEventListener('click', () => showSection('upload-section'));
    elements.proceedToConcept.addEventListener('click', () => showSection('concept-section'));

    // Concept generation
    elements.generateConceptBtn.addEventListener('click', generateConcept);
    elements.generateImageBtn.addEventListener('click', generateImage);

    // Concept type toggle
    elements.conceptTypeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const isManual = e.target.value === 'manual';
            elements.generateConceptBtn.disabled = isManual;
            if (isManual) {
                elements.conceptPrompt.placeholder = 'Enter your custom prompt here...';
                elements.conceptPrompt.readOnly = false;
            } else {
                elements.conceptPrompt.placeholder = 'AI will generate a creative concept based on your images and selected style...';
                elements.conceptPrompt.readOnly = true;
            }
        });
    });

    // Back to style
    elements.backToStyle.addEventListener('click', () => showSection('style-section'));

    // Image actions
    elements.downloadBtn.addEventListener('click', downloadGeneratedImage);
    elements.generateVariationBtn.addEventListener('click', generateVariation);
    elements.refineBtn.addEventListener('click', () => {
        showSection('refinement-section');
    });
    elements.saveToGalleryBtn.addEventListener('click', saveToGallery);

    // Refinement
    elements.applyRefinement.addEventListener('click', applyRefinement);
    elements.cancelRefinement.addEventListener('click', () => showSection('results-section'));

    // Gallery
    elements.clearGallery.addEventListener('click', clearGallery);

    // Navigation
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => showSection(btn.dataset.target));
    });

    // Suggestions dropdown
    setupSuggestionsDropdown();
}

function setupSuggestionsDropdown() {
    const toggle = document.querySelector('.suggestions-toggle');
    const menu = document.querySelector('.suggestions-menu');
    const textarea = elements.refinementPrompt;

    if (toggle && menu) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
        });

        // Close when clicking outside
        document.addEventListener('click', () => {
            menu.classList.remove('show');
        });

        // Handle suggestion selection
        menu.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                textarea.value = item.textContent;
                menu.classList.remove('show');
            });
        });
    }
}

// Core Functions
async function generateConcept() {
    if (!appState.selectedStyle) {
        alert('Please select a design style first.');
        return;
    }

    showLoading('Generating creative concept...');
    try {
        const topic = elements.conceptTopic.value;
        const response = await apiService.generateConcept(
            appState.selectedStyle,
            topic,
            appState.selectedRatio
        );

        elements.conceptPrompt.value = response.concept;
        appState.conceptPrompt = response.concept;
    } catch (error) {
        alert('Error generating concept: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function generateImage() {
    let finalPrompt = '';

    if (document.querySelector('input[name="concept-type"]:checked').value === 'manual') {
        finalPrompt = elements.conceptPrompt.value;
    } else {
        finalPrompt = appState.conceptPrompt;
    }

    if (!finalPrompt.trim()) {
        alert('Please generate or enter a concept prompt first.');
        return;
    }

    showSection('progress-section');
    
    try {
        updateProgress(10, 'Initializing image generation...');
        
        updateProgress(30, 'Generating image with AI...');
        const response = await apiService.generateImage(
            finalPrompt,
            appState.selectedStyle,
            appState.selectedRatio
        );
        
        updateProgress(90, 'Finalizing image...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For demo purposes - in production, you'd display the actual generated image
        elements.generatedImagePlaceholder.innerHTML = `
            <div style="text-align: center;">
                <h3>Image Generated Successfully!</h3>
                <p>Style: ${appState.selectedStyle}</p>
                <p>Aspect Ratio: ${appState.selectedRatio}</p>
                <p>Prompt used: ${finalPrompt.substring(0, 100)}...</p>
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); height: 300px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; margin: 20px 0;">
                    <span>Generated Image Preview</span>
                </div>
            </div>
        `;
        
        updateProgress(100, 'Complete!');
        setTimeout(() => showSection('results-section'), 500);
        
    } catch (error) {
        alert('Error generating image: ' + error.message);
        showSection('concept-section');
    }
}

async function generateVariation() {
    showLoading('Generating variation...');
    try {
        // For variation, modify the existing prompt slightly
        const variationPrompt = appState.conceptPrompt + ' Create a variation with different colors and composition.';
        await apiService.generateImage(
            variationPrompt,
            appState.selectedStyle,
            appState.selectedRatio
        );
        
        // Show success message
        alert('Variation generated successfully!');
    } catch (error) {
        alert('Error generating variation: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function applyRefinement() {
    const refinementText = elements.refinementPrompt.value.trim();
    if (!refinementText) {
        alert('Please enter refinement instructions.');
        return;
    }

    showLoading('Applying refinements...');
    try {
        // Enhanced prompt with refinements
        const refinedPrompt = `${appState.conceptPrompt}. Refinements: ${refinementText}. Maintain high quality and professional appearance.`;
        await apiService.generateImage(
            refinedPrompt,
            appState.selectedStyle,
            appState.selectedRatio
        );
        
        showSection('results-section');
        alert('Refinements applied successfully!');
    } catch (error) {
        alert('Error applying refinements: ' + error.message);
    } finally {
        hideLoading();
    }
}

function downloadGeneratedImage() {
    // For demo purposes - in production, this would download the actual image
    alert('Download functionality would save the generated image in production.');
}

function saveToGallery() {
    // For demo purposes - in production, this would save the actual image data
    const galleryItem = appState.saveToGallery('demo-image-data');
    alert('Image saved to gallery!');
    renderGallery();
}

function renderGallery() {
    if (!elements.galleryGrid) return;
    
    if (appState.gallery.length === 0) {
        elements.galleryGrid.innerHTML = '<p class="no-images" style="text-align: center; padding: 40px; color: #666;">No images in gallery yet.</p>';
        return;
    }

    elements.galleryGrid.innerHTML = appState.gallery.map(item => `
        <div class="gallery-item">
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); height: 150px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; margin-bottom: 10px;">
                <span>Saved Image</span>
            </div>
            <div style="padding: 10px;">
                <p style="font-weight: bold; margin-bottom: 5px;">${item.style}</p>
                <p style="font-size: 0.8rem; color: #666;">${new Date(item.timestamp).toLocaleDateString()}</p>
            </div>
            <div class="gallery-item-actions">
                <button onclick="downloadGalleryImage('${item.id}')" title="Download">📥</button>
                <button onclick="deleteGalleryImage('${item.id}')" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

function downloadGalleryImage(id) {
    const item = appState.gallery.find(img => img.id === id);
    if (item) {
        alert(`Downloading image: ${item.style}`);
    }
}

function deleteGalleryImage(id) {
    if (confirm('Are you sure you want to delete this image from the gallery?')) {
        appState.removeFromGallery(id);
        renderGallery();
    }
}

function clearGallery() {
    if (confirm('Are you sure you want to clear all images from the gallery? This cannot be undone.')) {
        appState.clearGallery();
        renderGallery();
    }
}

// Global functions for HTML event handlers
window.removeUploadedImage = removeUploadedImage;
window.downloadGalleryImage = downloadGalleryImage;
window.deleteGalleryImage = deleteGalleryImage;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateActionButtons();
    renderGallery();
    
    console.log('AI Image Generator initialized');
});
