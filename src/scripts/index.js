import "../styles/main.css";
import App from "./app";

document.addEventListener("DOMContentLoaded", async () => {
  const app = new App({
    content: document.querySelector("#main-content"),
    drawerButton: document.querySelector("#drawer-button"),
    navigationDrawer: document.querySelector("#navigation-drawer"),
  });
  await app._route();
  await app._registerServiceWorker();

  console.log("Berhasil mendaftarkan service worker.");

  window.addEventListener("hashchange", async () => {
    await app._route();
  });
});
