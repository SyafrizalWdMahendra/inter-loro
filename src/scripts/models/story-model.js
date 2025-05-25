const API_BASE_URL = 'https://story-api.dicoding.dev/v1';

// Database class for IndexedDB operations
class StoryDatabase {
  constructor() {
    this.dbName = 'StoryDatabase';
    this.storeName = 'stories';
    this.db = null;
    this.initDB();
  }

  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async saveStory(story) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(story);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async saveMultipleStories(stories) {
    return Promise.all(stories.map(story => this.saveStory(story)));
  }

  async getStories() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getStoryById(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async deleteStory(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async clearStories() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }
}

export default class StoryModel {
  constructor(authModel) {
    this._authModel = authModel;
    this._database = new StoryDatabase();
    this._syncQueue = [];
    this._isSyncing = false;
  }

  async getAllStories() {
    try {
      const token = this._authModel.getToken();
      if (!token) {
        throw new Error('Missing authentication');
      }

      // Try to fetch from network first
      try {
        const response = await fetch(`${API_BASE_URL}/stories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          if (response.status === 401) {
            this._authModel.logout();
          }
          throw new Error(responseData.message || 'Failed to fetch stories');
        }
        
        // Save to IndexedDB
        await this._database.saveMultipleStories(responseData.listStory);
        
        // Process any pending sync operations
        this._processSyncQueue();
        
        return responseData.listStory;
      } catch (networkError) {
        console.log('Network failed, using cached data:', networkError);
        // Fallback to IndexedDB
        const cachedStories = await this._database.getStories();
        if (cachedStories.length > 0) {
          return cachedStories;
        }
        throw new Error('No internet connection and no cached stories available');
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      throw error;
    }
  }

  async getStoryById(id) {
    try {
      // Try to fetch from network first if online
      if (navigator.onLine) {
        const token = this._authModel.getToken();
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const response = await fetch(`${API_BASE_URL}/stories/${id}`, {
          headers
        });
        
        const responseData = await response.json();
        
        if (response.ok) {
          await this._database.saveStory(responseData.story);
          return responseData.story;
        }
      }

      // Fallback to IndexedDB
      const cachedStory = await this._database.getStoryById(id);
      if (cachedStory) {
        return cachedStory;
      }
      
      throw new Error('Story not found');
    } catch (error) {
      console.error('Error fetching story:', error);
      throw error;
    }
  }

  async addStory({ photo, description, lat, lon }) {
    try {
      const token = this._authModel.getToken();
      if (!token) {
        throw new Error('Missing authentication');
      }

      const formData = new FormData();
      formData.append('photo', photo);
      formData.append('description', description);
      if (lat) formData.append('lat', lat);
      if (lon) formData.append('lon', lon);

      // If offline, add to sync queue
      if (!navigator.onLine) {
        const offlineStory = {
          id: `offline-${Date.now()}`,
          photo,
          description,
          lat,
          lon,
          createdAt: new Date().toISOString(),
          isOffline: true
        };
        
        await this._database.saveStory(offlineStory);
        this._addToSyncQueue(offlineStory);
        
        return {
          message: 'Story saved offline and will be synced when online',
          story: offlineStory
        };
      }

      // Online - send directly to server
      const response = await fetch(`${API_BASE_URL}/stories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message);
      }
      
      // Send push notification to other clients
      this._sendPushNotification({
        title: 'New Story Added',
        body: description.substring(0, 100) + '...'
      });
      
      return responseData;
    } catch (error) {
      console.error('Error adding story:', error);
      throw error;
    }
  }

  async _processSyncQueue() {
    if (this._isSyncing || this._syncQueue.length === 0) return;
    
    this._isSyncing = true;
    const token = this._authModel.getToken();
    
    try {
      while (this._syncQueue.length > 0) {
        const story = this._syncQueue[0];
        
        const formData = new FormData();
        formData.append('photo', story.photo);
        formData.append('description', story.description);
        if (story.lat) formData.append('lat', story.lat);
        if (story.lon) formData.append('lon', story.lon);

        const response = await fetch(`${API_BASE_URL}/stories`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (response.ok) {
          this._syncQueue.shift();
          await this._database.deleteStory(story.id);
        } else {
          break; // Stop if we encounter an error
        }
      }
    } catch (error) {
      console.error('Error syncing stories:', error);
    } finally {
      this._isSyncing = false;
    }
  }

  _addToSyncQueue(story) {
    this._syncQueue.push(story);
    // Try to process immediately if we're online
    if (navigator.onLine) {
      this._processSyncQueue();
    }
  }

  async _sendPushNotification(notification) {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.active.postMessage({
          type: 'PUSH_NOTIFICATION',
          notification
        });
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    }
  }
}