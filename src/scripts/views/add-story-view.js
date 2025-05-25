class AddStoryView {
    getTemplate() {
        return `
            <section class="add-story-section">
                <h2>Share Your Story</h2>
                <form id="story-form" class="story-form">
                    <div class="form-group">
                        <label for="story-photo">Story Photo</label>
                        <div class="camera-preview" id="camera-preview" style="position: relative; border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem;">
                            <video id="camera-view" autoplay playsinline style="width: 100%; max-height: 300px;"></video>
                            <canvas id="photo-canvas" style="display: none;"></canvas>
                            <img id="photo-preview" style="display: none; width: 100%; max-height: 300px; object-fit: contain;">
                            <button type="button" id="capture-btn" class="btn" style="margin-top: 1rem;">Capture Photo</button>
                        </div>
                        <input type="file" id="photo-upload" accept="image/*" capture="camera" style="display: none;">
                    </div>
                    
                    <div class="form-group">
                        <label for="story-description">Description</label>
                        <textarea id="story-description" required placeholder="Tell your story..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Location (click on the map to set)</label>
                        <div id="location-map" class="map-container" style="height: 300px;"></div>
                        <div class="coordinates" style="margin-top: 0.5rem;">
                            <span>Latitude: <span id="latitude-display">Not set</span></span>
                            <span style="margin-left: 1rem;">Longitude: <span id="longitude-display">Not set</span></span>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn">Share Story</button>
                </form>
            </section>
            
            <div id="notification" class="notification hidden"></div>
        `;
    }

    initCamera() {
        const video = document.getElementById('camera-view');
        const canvas = document.getElementById('photo-canvas');
        const preview = document.getElementById('photo-preview');
        const captureBtn = document.getElementById('capture-btn');
        const photoUpload = document.getElementById('photo-upload');
        let stream = null;

        // Try to access camera
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(mediaStream => {
                    stream = mediaStream;
                    video.srcObject = stream;
                })
                .catch(error => {
                    console.error('Camera access error:', error);
                    // Fallback to file upload
                    photoUpload.style.display = 'block';
                    captureBtn.style.display = 'none';
                });
        } else {
            // Fallback to file upload
            photoUpload.style.display = 'block';
            captureBtn.style.display = 'none';
        }

        // Capture photo
        captureBtn.addEventListener('click', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Show preview
            preview.src = canvas.toDataURL('image/jpeg');
            preview.style.display = 'block';
            video.style.display = 'none';
            captureBtn.style.display = 'none';
            
            // Stop camera stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        });

        // Handle file upload
        photoUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    preview.src = event.target.result;
                    preview.style.display = 'block';
                    video.style.display = 'none';
                    captureBtn.style.display = 'none';
                    
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }


    initMap() {
        const mapContainer = document.getElementById('location-map');
        if (!mapContainer) return;

        const map = L.map(mapContainer).setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        let marker = null;
        
        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            
            document.getElementById('latitude-display').textContent = lat.toFixed(4);
            document.getElementById('longitude-display').textContent = lng.toFixed(4);
            
            if (marker) {
                map.removeLayer(marker);
            }
            
            marker = L.marker([lat, lng]).addTo(map)
                .bindPopup('Story location')
                .openPopup();
        });
    }

    setSubmitHandler(handler) {
        const form = document.getElementById('story-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const canvas = document.getElementById('photo-canvas');
            const description = document.getElementById('story-description').value;
            const lat = parseFloat(document.getElementById('latitude-display').textContent);
            const lon = parseFloat(document.getElementById('longitude-display').textContent);
            
            if (!canvas || canvas.width === 0) {
                this.showError('Please capture or upload a photo');
                return;
            }
            
            if (!description) {
                this.showError('Please enter a description');
                return;
            }
            
            canvas.toBlob(async (blob) => {
                try {
                    await handler({
                        photo: blob,
                        description,
                        lat: isNaN(lat) ? null : lat,
                        lon: isNaN(lon) ? null : lon
                    });
                } catch (error) {
                    this.showError(error.message);
                }
            }, 'image/jpeg');
        });
    }

    showSuccess(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.remove('error');
        notification.classList.remove('hidden');
        notification.classList.add('success');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }

    showError(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.remove('success');
        notification.classList.remove('hidden');
        notification.classList.add('error');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

export default AddStoryView;