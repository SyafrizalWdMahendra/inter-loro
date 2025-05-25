import StoryView from '../views/story-view.js';

export default class StoryPresenter {
    constructor({ viewContainer, storyModel, authModel }) {
        this._viewContainer = viewContainer;
        this._storyModel = storyModel;
        this._authModel = authModel;
        this._view = new StoryView();
    }

    async show() {
        this._viewContainer.innerHTML = this._view.getTemplate();
        
        try {
            const stories = await this._storyModel.getAllStories();
            this._view.showStories(stories);
            this._view.initMapForStories(stories);
        } catch (error) {
            this._view.showError(error.message);
        }
    }

    async showDetail(id) {
        this._viewContainer.innerHTML = this._view.getDetailTemplate();
        
        try {
            const story = await this._storyModel.getStoryById(id);
            this._view.showStoryDetail(story);
            this._view.initMapForStory(story);
        } catch (error) {
            this._view.showError(error.message);
        }
    }
}
