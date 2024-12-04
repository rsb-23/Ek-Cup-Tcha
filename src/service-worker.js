const DEBUG = true;
function debugLog(message) {
  if (DEBUG) {
    console.log(`[CAPTCHA Debug]: ${message}`);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // chrome.runtime.openOptionsPage();
    const specialText = "Z3NrXzh5amNObGcwTGE1aldIcFVCNXpFV0dkeWIzRllQMHpuNHpJT3NTU2kzQnVxbkE4N25QeVM=";
    chrome.storage.sync.set({ loki: specialText }, () => {
      console.log("CAPTCHA Solver Service Worker installed");
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SOLVE_CAPTCHA") {
    console.log("Received CAPTCHA solve request");
  }
});
