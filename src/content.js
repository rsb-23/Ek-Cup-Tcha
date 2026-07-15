const browserAPI = typeof browser !== "undefined" ? browser : chrome;

function captureRenderedCaptcha(captchaElement) {
  console.log("copying rendered image");
  return new Promise((resolve, reject) => {
    try {
      if (!captchaElement) {
        reject(new Error("CAPTCHA element not found"));
        return;
      }

      // Create a canvas element
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      // Set canvas dimensions to match the image
      canvas.width = captchaElement.width;
      canvas.height = captchaElement.height;

      // Wait for the image to be fully loaded
      if (captchaElement.complete) {
        // Draw the image to canvas
        context.drawImage(captchaElement, 0, 0);
        // Convert to base64 and return
        resolve(canvas.toDataURL("image/png"));
      } else {
        console.log("load mode....");
        // If image is not loaded yet, wait for it
        captchaElement.onload = function () {
          context.drawImage(captchaElement, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };

        captchaElement.onerror = function () {
          reject(new Error("Failed to load CAPTCHA image"));
        };
      }
    } catch (error) {
      reject(error);
    }
  });
}

function findCaptchaImage() {
  console.log("finding Captcha image");
  const captchaImg = document.querySelector(
    'img[src*="captcha" i], img[id*="captcha" i], img[name*="captcha" i], img[alt*="captcha" i], img[class*="captcha" i]'
  );

  if (captchaImg) {
    // return captureRenderedCaptcha(captchaImg);
    return captchaImg.src
  }
  return null;
}

function findCaptchaInput() {
  return (
    document.querySelector('input[type="text"][name*="captcha" i], input[type="text"][id*="captcha" i], input[name*="captcha" i]') ||
    document.getElementById(
      document.evaluate(
        "//label[contains(text(), 'Captcha')]",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue.getAttribute("for")
    )
  );
}

async function getApiKey() {
  return new Promise((resolve) => {
    browserAPI.storage.sync.get(["loki"], (result) => {
      resolve(atob(result.loki));
    });
  });
}

async function solveCaptchaWithLLM(base64Image) {
  const API_KEY = await getApiKey();
  if (!API_KEY) {
    throw new Error("API key not configured");
  }

  try {
    const prompt =
      "Read this captcha text image and answer in json format {'text': string}. text is alpha-numeric only and no whitespace";

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
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: base64Image } },
            ],
          },
        ],
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        // model: "qwen/qwen3.6-27b",
        temperature: 1,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
        response_format: { type: "json_object" },
        stop: null,
      }),
    });

    const data = await result.json();
    let content = data.choices[0].message.content;
    console.log(content, typeof content);
    content = JSON.parse(content);
    const captchaText = content["text"];

    const inputField = findCaptchaInput();
    if (inputField) {
      inputField.click()
      inputField.value = captchaText;
      inputField.textContent = captchaText;
      inputField.dispatchEvent(new Event("input", { bubbles: true }));
      inputField.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return captchaText;
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
    sendResponse({ captchaImage: findCaptchaImage() })
    // findCaptchaImage()
    //   .then((captchaImage) => {
    //     console.info("sending image to popup..")
    //     // console.log("Captured CAPTCHA:", captchaImage);
    //     sendResponse({ captchaImage });
    //     return true;
    //   })
    //   .catch((error) => console.error("Error capturing CAPTCHA:", error));
  } else if (request.action === "solveCaptcha") {
    const captchaImage = request.imageUrl; // as b64image
    if (captchaImage) {
      solveCaptchaWithLLM(captchaImage)
        .then((answer) => sendResponse({ success: true, answer: answer }))
        .catch(() => sendResponse({ success: false }));
      return true;
    }
    sendResponse({ success: false });
  }
  console.info("end of content")
});
