export default class HomeView {
    getLoadingTemplate() {
        return `
            <div class="loading">
                <p>Loading stories...</p>
            </div>
        `;
    }

    getTemplate() {
        return `
            <section class="hero">
                <h2>Share Your Stories</h2>
                <p>Discover amazing experiences from people around the world</p>
                <a href="#/stories" class="btn">Explore Stories</a>
                <a href="#/add-story" class="btn secondary">Share Your Story</a>
            </section>
            
            <section class="featured-stories">
                <h3>Featured Stories</h3>
                <div id="stories-map" class="map-container" style="height: 400px; margin-bottom: 2rem;"></div>
                <div id="stories-list" class="stories-grid"></div>
                <div id="error-container"></div>
            </section>
        `;
    }

    showStories(stories) {
        const storiesList = document.getElementById('stories-list');
        if (!storiesList) return;
        
        storiesList.innerHTML = stories.map(story => `
            <article class="story-card">
                <a href="#/stories/${story.id}">
                    <img src="${story.photoUrl}" alt="${story.description.substring(0, 50)}" class="story-image">
                    <div class="story-content">
                        <h4>${story.name}'s Story</h4>
                        <p>${story.description.substring(0, 100)}...</p>
                        <time datetime="${story.createdAt}">${new Date(story.createdAt).toLocaleDateString()}</time>
                    </div>
                </a>
            </article>
        `).join('');

        this.initMapForStories(stories);
    }

    initMapForStories(stories) {
        const mapContainer = document.getElementById('stories-map');
        if (!mapContainer || stories.length === 0) return;

        const map = L.map(mapContainer).setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const storiesWithLocation = stories.filter(story => story.lat && story.lon);
        
        if (storiesWithLocation.length > 0) {
            const bounds = [];
            
            storiesWithLocation.forEach(story => {
                const marker = L.marker([story.lat, story.lon]).addTo(map);
                marker.bindPopup(`
                    <b>${story.name}'s Story</b><br>
                    ${story.description.substring(0, 100)}...
                    <a href="#/stories/${story.id}">Read more</a>
                `);
                bounds.push([story.lat, story.lon]);
            });
            
            map.fitBounds(bounds);
        }
    }

    showError(message) {
        const errorContainer = document.getElementById('error-container') || 
                             document.getElementById('stories-list');
        
        if (!errorContainer) return;

        errorContainer.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                ${message.includes('login') || message.includes('authentication') 
                    ? '<a href="#/login" class="btn">Login to View Stories</a>' 
                    : ''}
            </div>
        `;
    }
}