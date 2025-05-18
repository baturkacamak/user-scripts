// Assuming the username is in an element with a specific ID or class that can be targeted
const usernameElement = document.querySelector('a[href^="/biri/"]');

if (usernameElement) {
  const hrefAttribute = usernameElement.getAttribute('href');
  const username = hrefAttribute.split('/biri/')[1]; // Extract username from the href attribute

  // Send username to background script
  chrome.runtime.sendMessage({username: username});
}
