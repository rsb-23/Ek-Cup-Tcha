const browserAPI = typeof browser !== "undefined" ? browser : chrome;

async function checkApiKey() {
  const { loki } = await browserAPI.storage.sync.get("loki");
  if (!loki) {
    document.getElementById("status").textContent = "internal error, Reinstall.";
    document.getElementById("solveCaptcha").disabled = true;
    return false;
  }
  return true;
}

async function fetchCaptcha() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await browserAPI.tabs.sendMessage(tab.id, { action: "getCaptcha" });

    if (response && response.captchaImage) {
      document.getElementById("captchaPreview").src = response.captchaImage;
      document.getElementById("captchaPreview").style.display = "block";
      document.getElementById("status").textContent = "CAPTCHA detected!";
    } else {
      document.getElementById("status").textContent = "No CAPTCHA found on this page.";
    }
  } catch (error) {
    console.log("fetch error -", error);
    document.getElementById("status").textContent = "Error fetching CAPTCHA.";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  checkApiKey();
  fetchCaptcha();
});

document.getElementById("captchaCopy").addEventListener("click", async function () {
  await navigator.clipboard.writeText(this.textContent);
  console.log("Copied:", this.textContent);
});

document.getElementById("refreshButton").addEventListener("click", fetchCaptcha);

document.getElementById("solveCaptcha").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  document.getElementById("status").textContent = "Solving CAPTCHA...";
  imageUrl = document.getElementById("captchaPreview").src;
  browserAPI.tabs.sendMessage(tab.id, { action: "solveCaptcha", imageUrl: imageUrl }, (response) => {
    if (response && response.success) {
      document.getElementById("status").textContent = "CAPTCHA solved!";
      let captchaText = document.getElementById("captchaCopy");
      captchaText.textContent = response.answer;
      captchaText.hidden = false;
    } else {
      document.getElementById("status").textContent = "Failed to solve CAPTCHA.";
    }
  });
});
