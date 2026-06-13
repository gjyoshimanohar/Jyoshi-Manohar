// This script runs on the target government portal websites.
chrome.storage.local.get(['storedCredentials'], (result) => {
  const creds = result.storedCredentials;
  
  if (creds && window.location.href.includes(new URL(creds.url).hostname)) {
    // Wait for the exact login form elements to render
    setTimeout(() => attemptAutofill(creds), 1500);
    setTimeout(() => attemptAutofill(creds), 3000);
    setTimeout(() => attemptAutofill(creds), 5000); // extra backup for slow portals
  }
});

function attemptAutofill(creds) {
  const { username, password } = creds;
  let filled = false;
  
  // Generic selector targeting likely username or ID fields
  const userInput = document.querySelector('input[name*="user" i], input[id*="user" i], input[name*="login" i], input[id*="login" i], input[name*="pan" i], input[name*="gstin" i], input[type="text"]:not([readonly])');
  
  // Target password field
  const passInput = document.querySelector('input[type="password"]');

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

  if (userInput && username) {
    nativeInputValueSetter.call(userInput, username);
    userInput.dispatchEvent(new Event('input', { bubbles: true }));
    userInput.dispatchEvent(new Event('change', { bubbles: true }));
    filled = true;
  }

  if (passInput && password) {
    nativeInputValueSetter.call(passInput, password);
    passInput.dispatchEvent(new Event('input', { bubbles: true }));
    passInput.dispatchEvent(new Event('change', { bubbles: true }));
    filled = true;
  }

  // If filled successfully on first or retry attempt, clear the credentials
  if (filled) {
    console.log("Credentials autofilled successfully.");
    setTimeout(() => {
        chrome.storage.local.remove(['storedCredentials']);
    }, 6000);
  }
}
