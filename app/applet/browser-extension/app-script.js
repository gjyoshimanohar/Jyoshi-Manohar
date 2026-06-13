// This script listens for messages dispatched by the main React application.
window.addEventListener('message', function(event) {
  // Only accept messages from the same window
  if (event.source !== window || !event.data || event.data.type !== 'PORTAL_LOGIN_AUTOFILL') {
    return;
  }
  
  // Forward the credentials securely to the extension's background script
  chrome.runtime.sendMessage({
    type: 'STORE_CREDENTIALS',
    data: event.data
  });
});
