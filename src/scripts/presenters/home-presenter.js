import HomeView from '../views/home-view.js';

export default class HomePresenter {
    constructor({ viewContainer, storyModel, authModel }) {
        this._view = new HomeView();
        this._viewContainer = viewContainer;
        this._storyModel = storyModel;
        this._authModel = authModel;
    }

    async show() {
        try {
            // Render template dasar SEKALI SAJA
            this._viewContainer.innerHTML = this._view.getTemplate();
            
            // Cek auth dengan cara yang lebih reliable
            const token = this._authModel.getToken();
            if (!token) {
                this._view.showError('Silakan login terlebih dahulu');
                setTimeout(() => window.location.hash = '#/login', 1500);
                return;
            }

            // Tampilkan loading
            document.getElementById('stories-list').innerHTML = '<p>Memuat cerita...</p>';
            
            // Ambil data
            const stories = await this._storyModel.getAllStories();
            this._view.showStories(stories);

        } catch (error) {
            console.error('Error:', error);
            this._view.showError(error.message.includes('auth') ? 
                'Sesi habis, silakan login ulang' : 
                'Gagal memuat cerita');
            
            if (!this._authModel.getToken()) {
                window.location.hash = '#/login';
            }
        }
    }
}