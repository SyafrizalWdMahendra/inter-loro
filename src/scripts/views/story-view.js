class StoryView {
    getTemplate() {
        return `
            <section class="stories-section">
                <h2>All Stories</h2>
                <div id="stories-list" class="stories-list"></div>
                <div id="map-container" class="map-container"></div>
            </section>
        `;
    }

    getDetailTemplate() {
        return `
            <section class="story-detail-section">
                <div id="story-detail"></div>
                <div id="story-map" class="map-container"></div>
                <a href="#/stories" class="btn back-button">Back to Stories</a>
            </section>
        `;
    }

    showStories(stories) {
        const storiesList = document.getElementById('stories-list');
        storiesList.innerHTML = stories.map(story => `
            <article class="story-item">
                <a href="#/stories/${story.id}">
                    <img src="${story.photoUrl}" alt="${story.description.substring(0, 50)}" class="story-image">
                    <div class="story-info">
                        <h3>${story.name}'s Story</h3>
                        <p>${story.description.substring(0, 150)}...</p>
                        <div class="story-meta">
                            <time datetime="${story.createdAt}">${new Date(story.createdAt).toLocaleDateString()}</time>
                            <span>${story.lat ? '📍 Has Location' : ''}</span>
                        </div>
                    </div>
                </a>
            </article>
        `).join('');
    }

    showStoryDetail(story) {
        const storyDetail = document.getElementById('story-detail');
        storyDetail.innerHTML = `
            <article class="story-detail">
                <img src="${story.photoUrl}" alt="${story.description}" class="detail-image">
                <div class="detail-content">
                    <h3>${story.name}'s Story</h3>
                    <p>${story.description}</p>
                    <div class="detail-meta">
                        <time datetime="${story.createdAt}">Posted on ${new Date(story.createdAt).toLocaleDateString()}</time>
                    </div>
                </div>
            </article>
        `;
    }

    initMapForStories(stories) {
        const mapContainer = document.getElementById('map-container');
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

    initMapForStory(story) {
        const storyMap = document.getElementById('story-map');
        if (!storyMap || !story.lat || !story.lon) return;

        const map = L.map(storyMap).setView([story.lat, story.lon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const marker = L.marker([story.lat, story.lon]).addTo(map);
        marker.bindPopup(`
            <b>Story Location</b><br>
            ${story.description.substring(0, 100)}...
        `).openPopup();
    }

    showError(message) {
        const container = document.getElementById('stories-list') || document.getElementById('story-detail');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>${message}</p>
                </div>
            `;
        }
    }
}

export default StoryView;