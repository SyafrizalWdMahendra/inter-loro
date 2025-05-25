import AddStoryView from '../views/add-story-view.js';

 class AddStoryPresenter {
    constructor({ viewContainer, storyModel, authModel }) {
        this._viewContainer = viewContainer;
        this._storyModel = storyModel;
        this._authModel = authModel;
        this._view = new AddStoryView();
    }

    async show() {
        const isAuthenticated = await this._authModel.checkAuthState();
        
        if (!isAuthenticated) {
            window.location.hash = '#/login';
            return;
        }

        this._viewContainer.innerHTML = this._view.getTemplate();
        
        this._view.initCamera();
        this._view.initMap();
        
        this._view.setSubmitHandler(async (storyData) => {
            try {
                const token = this._authModel.getToken();
                await this._storyModel.addStory(storyData, token);
                this._view.showSuccess('Story added successfully!');
                setTimeout(() => {
                    window.location.hash = '#/stories';
                }, 1500);
            } catch (error) {
                this._view.showError(error.message);
            }
        });
    }
}

export default AddStoryPresenter;