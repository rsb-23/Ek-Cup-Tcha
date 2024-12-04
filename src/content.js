const browserAPI = typeof browser !== "undefined" ? browser : chrome;

function findCaptchaImage() {
  console.log("finding Captcha image");
  const captchaImg =
    document.querySelector('img[src*="captcha" i]') ||
    document.querySelector('img[id*="captcha" i]') ||
    document.querySelector('img[name*="captcha" i]') ||
    document.querySelector('img[alt*="captcha" i]') ||
    document.querySelector('img[class*="captcha" i]');
  if (captchaImg) {
    return captchaImg.src;
  }
  return null;
}

function findCaptchaInput() {
  return (
    document.querySelector('input[type="text"][name*="captcha" i]') ||
    document.querySelector('input[type="text"][id*="captcha" i]')
  );
}

async function getApiKey() {
  return new Promise((resolve) => {
    browserAPI.storage.sync.get(["loki"], (result) => {
      resolve(atob(result.loki));
    });
  });
}

async function solveCaptchaWithLLM(imageUrl) {
  const API_KEY = await getApiKey();
  console.log(API_KEY);
  if (!API_KEY) {
    throw new Error("API key not configured");
  }

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64Image = await convertBlobToBase64(blob);

    const result = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Read this captcha text image and answer in 1 word. text is alpha-numeric only",
              },
              { type: "image_url", image_url: { url: base64Image } },
            ],
          },
        ],
        model: "llama-3.2-90b-vision-preview",
        temperature: 1,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
        stop: null,
      }),
    });

    const data = await result.json();
    console.log(data.choices[0].message.content);
    const captchaText = data.choices[0].message.content;

    const inputField = findCaptchaInput();
    if (inputField) {
      inputField.value = captchaText;
      inputField.textContent = captchaText;
    }
  } catch (error) {
    console.error("Error solving CAPTCHA:", error);
  }
}

function convertBlobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCaptcha") {
    console.log("get Captcha");
    const captchaImage = findCaptchaImage();
    sendResponse({ captchaImage });
  } else if (request.action === "solveCaptcha") {
    const captchaImage = request.imageUrl;
    if (captchaImage) {
      solveCaptchaWithLLM(captchaImage)
        .then(() => sendResponse({ success: true }))
        .catch(() => sendResponse({ success: false }));
      return true;
    }
    sendResponse({ success: false });
  }
});
