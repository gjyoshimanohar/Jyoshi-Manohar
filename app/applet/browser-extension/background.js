chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'STORE_CREDENTIALS') {
    // Store credentials in local storage temporarily
    chrome.storage.local.set({ storedCredentials: request.data }, () => {
      console.log('Credentials stored for upcoming autofill operation.');
    });
  }
});
