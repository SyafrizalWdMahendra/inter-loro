import HomePresenter from "./presenters/home-presenter.js";
import StoryPresenter from "./presenters/story-presenter.js";
import AddStoryPresenter from "./presenters/add-story-presenter.js";
import AuthPresenter from "./presenters/auth-presenter.js";
import StoryModel from "./models/story-model.js";
import AuthModel from "./models/auth-model.js";
import "../styles/main.css";

// Database Class for IndexedDB
class Database {
  constructor() {
    this.dbName = "StoryShareDB";
    this.storeName = "stories";
    this.db = null;
    this.initDB();
  }

  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  async saveStory(story) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(story);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getStories() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async deleteStory(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }
}

// Helper function for push notifications
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default class App {
  constructor() {
    // Initialize core components
    this._authModel = new AuthModel();
    this._storyModel = new StoryModel(this._authModel);
    this._database = new Database(); // Initialize IndexedDB

    // Setup application
    this._initPresenters();
    this._setupEventHandlers();
    this._checkAuthState();

    // Register service worker and init push notifications
    this._registerServiceWorker();

    console.log("[APP] Application initialized");
    this._setupInstallButton();
  }

  _setupInstallButton() {
    // Create just one button
    this.installButton = document.createElement("button");
    this.installButton.id = "install-btn";
    this.installButton.textContent = "Install App";
    this.installButton.style.display = "none";
    document.querySelector(".app-header").appendChild(this.installButton);

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.installButton.style.display = "block";
    });

    this.installButton.addEventListener("click", async () => {
      if (!this.deferredPrompt) return;

      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === "accepted") {
        this.installButton.style.display = "none";
      }
      this.deferredPrompt = null;
    });

    window.addEventListener("appinstalled", () => {
      this.installButton.style.display = "none";
    });
  }

  async _registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          "/service-worker.js"
        );
        console.log("ServiceWorker registration successful");

        // Initialize push notifications after successful registration
        if (this._authModel.getToken()) {
          this._initPushNotifications(registration);
        }
      } catch (error) {
        console.log("ServiceWorker registration failed: ", error);
      }
    }
  }

  async _initPushNotifications(registration) {
    if ("Notification" in window && "PushManager" in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk"
            ), // Replace with your VAPID key
          });

          // Send subscription to your server
          await fetch("https://story-api.dicoding.dev/v1/push-subscriptions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this._authModel.getToken()}`,
            },
            body: JSON.stringify(subscription),
          });
        }
      } catch (error) {
        console.error("Push notification error:", error);
      }
    }
  }

  _initPresenters() {
    const commonDependencies = {
      storyModel: this._storyModel,
      authModel: this._authModel,
      database: this._database,
      viewContainer: document.getElementById("app-view"),
      onNavigation: (route) => this._navigateTo(route),
    };

    this._presenters = {
      home: new HomePresenter(commonDependencies),
      story: new StoryPresenter({
        ...commonDependencies,
        onStoryLoaded: () => this._updateNavIndicator(),
      }),
      addStory: new AddStoryPresenter(commonDependencies),
      auth: new AuthPresenter({
        ...commonDependencies,
        onAuthSuccess: () => {
          this._checkAuthState();
          this._navigateTo("home");
          // Re-init push notifications after auth
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              this._initPushNotifications(registration);
            });
          }
        },
      }),
    };
  }

  _setupEventHandlers() {
    // Handle navigation
    this._hashChangeHandler = () => {
      const hash = window.location.hash;
      console.log("[ROUTE] Hash changed:", hash);
      this._route();
    };
    window.addEventListener("hashchange", this._hashChangeHandler);

    // Visual feedback for nav links
    this._clickHandler = (e) => {
      const navLink = e.target.closest(".nav-link");
      if (navLink) {
        navLink.classList.add("active");
        setTimeout(() => navLink.classList.remove("active"), 100);
      }
    };
    document.addEventListener("click", this._clickHandler);

    // Initial route
    this._route();

    // Listen for beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      this._deferredPrompt = e;
      // this._showInstallPrompt();
    });
  }

  // _showInstallPrompt() {
  //   if (this._deferredPrompt) {
  //     const installButton = document.createElement('button');
  //     installButton.textContent = 'Install App';
  //     installButton.className = 'install-button';
  //     installButton.addEventListener('click', () => {
  //       this._deferredPrompt.prompt();
  //       this._deferredPrompt.userChoice.then((choiceResult) => {
  //         if (choiceResult.outcome === 'accepted') {
  //           console.log('User accepted the install prompt');
  //         } else {
  //           console.log('User dismissed the install prompt');
  //         }
  //         this._deferredPrompt = null;
  //       });
  //     });

  //     const header = document.querySelector('.app-header');
  //     if (header) {
  //       header.appendChild(installButton);
  //     }
  //   }
  // }

  _cleanupEventHandlers() {
    window.removeEventListener("hashchange", this._hashChangeHandler);
    document.removeEventListener("click", this._clickHandler);
  }

  async _route() {
    try {
      const hash = window.location.hash;
      // Handle empty hash case
      if (!hash || hash === "#") {
        return this._navigateTo("home");
      }

      const [, route, id] = hash.split("/");
      console.log("[ROUTE] Navigating to:", route || "home", id);

      // Check if we're offline
      const isOnline = navigator.onLine;
      if (!isOnline && route !== "home") {
        this._presenters.home.showError(
          "You are offline. Some features may not be available."
        );
        return this._navigateTo("home");
      }

      if (document.startViewTransition) {
        await document.startViewTransition(() => {
          return this._handleRoute(route, id);
        }).finished;
      } else {
        await this._handleRoute(route, id);
      }
    } catch (error) {
      console.error("[ROUTE] Error:", error);
      this._presenters.home.showError("Failed to load page");
    }
  }

  async _handleRoute(route, id) {
    // Handle undefined route (empty hash)
    if (!route) {
      return this._navigateTo("home");
    }

    // Route guards
    const protectedRoutes = ["add-story", "stories"];
    if (protectedRoutes.includes(route)) {
      if (!this._authModel.getToken()) {
        console.log("[AUTH] Redirecting to login");
        return this._navigateTo("login");
      }
    }

    // Route handling
    switch (route) {
      case "":
      case "home":
        await this._presenters.home.show();
        break;

      case "stories":
        if (id) {
          await this._presenters.story.showDetail(id);
        } else {
          await this._presenters.story.show();
        }
        break;

      case "add-story":
        await this._presenters.addStory.show();
        break;

      case "login":
        await this._presenters.auth.showLogin();
        break;

      case "register":
        await this._presenters.auth.showRegister();
        break;

      case "logout":
        await this._authModel.logout();
        this._navigateTo("home");
        break;

      default:
        console.warn("[ROUTE] Unknown route:", route);
        await this._presenters.home.show();
    }

    this._updateNavIndicator();
  }

  _navigateTo(route) {
    window.location.hash = `#/${route}`;
  }

  async _checkAuthState() {
    try {
      const isAuthenticated = await this._authModel.checkAuthState();
      this._updateAuthUI(isAuthenticated);
    } catch (error) {
      console.error("[AUTH] Check failed:", error);
      this._updateAuthUI(false);
    }
  }

  _updateAuthUI(isAuthenticated) {
    const authLink = document.getElementById("auth-link");
    if (authLink) {
      authLink.textContent = isAuthenticated ? "Logout" : "Login";
      authLink.setAttribute("href", isAuthenticated ? "#/logout" : "#/login");
    }
  }

  _updateNavIndicator() {
    document.querySelectorAll(".nav-link").forEach((link) => {
      const linkPath = link.getAttribute("href");
      const currentPath = window.location.hash;

      // Handle root path
      const isActive =
        (linkPath === "#/home" &&
          (currentPath === "#" ||
            currentPath === "#/" ||
            currentPath === "")) ||
        linkPath === currentPath;

      link.setAttribute("aria-current", isActive ? "page" : "false");
      link.classList.toggle("active", isActive);
    });
  }

  destroy() {
    this._cleanupEventHandlers();
  }
}

// Application bootstrap with enhanced error handling
document.addEventListener("DOMContentLoaded", () => {
  let appInstance;

  try {
    if (!document.getElementById("app-view")) {
      throw new Error("Missing app-view container");
    }

    appInstance = new App();
  } catch (error) {
    console.error("[BOOT] Failed to start:", error);
    document.body.innerHTML = `
      <div class="error-screen">
        <h1>Application Error</h1>
        <p>${error.message}</p>
        <button onclick="window.location.reload()">Reload</button>
      </div>
    `;
  }

  // Handle hot module replacement
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      appInstance?.destroy();
    });
  }
});
