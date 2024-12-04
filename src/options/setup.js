const browserAPI = typeof browser !== "undefined" ? browser : chrome;

document.getElementById("saveApiKey").addEventListener("click", () => {
  const apiKey = document.getElementById("apiKeyInput").value;

  if (apiKey) {
    browserAPI.storage.sync.set({ apiKey }, () => {
      document.getElementById("status").textContent = "API Key saved successfully!";
    });
  } else {
    document.getElementById("status").textContent = "Please enter a valid API Key.";
  }
});
