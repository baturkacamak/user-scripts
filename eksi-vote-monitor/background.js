let userNick = ''; // Store username globally

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.username) {
    userNick = message.username; // Update global username
    chrome.storage.local.set({'userNick': userNick}); // Optionally store it in local storage
  }
});

chrome.runtime.onInstalled.addListener(() => {
  // Set up an alarm to check for new votes periodically
  chrome.alarms.create('checkForNewVote', {
    periodInMinutes: 1, // Set the interval for 1 minute
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if ('checkForNewVote' === alarm.name) {
    chrome.storage.local.get(['userNick'], function(result) {
      if (result.userNick) {
        userNick = result.userNick; // Ensure userNick is always up to date
        checkForNewVote(userNick);
      }
    });
  }
});

function checkForNewVote() {
  const baseUrl = `https://eksisozluk.com/son-oylananlari?nick=${userNick}&p=1`;
  const timestamp = new Date().getTime(); // Gets the current time in milliseconds
  const urlWithTimestamp = `${baseUrl}&_=${timestamp}`;

  fetch(urlWithTimestamp, {
    headers: {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9,tr;q=0.8,nl;q=0.7',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest',
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    body: null,
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
  })
      .then((response) => response.text())
      .then((html) => {
        const match = html.match(/<h1 id="title" data-title="([^"]+)" data-id="\d+"/);
        if (match && match[1]) {
          const currentTitle = match[1];

          chrome.storage.local.get(['previousTitle'], function(result) {
            const previousTitle = result.previousTitle || '';

            if (previousTitle && currentTitle !== previousTitle) {
              // If there's a change, show a notification
              chrome.notifications.create('', {
                type: 'basic',
                iconUrl: 'icon.png',
                title: 'New Vote Detected',
                message: `New vote on: ${currentTitle}`,
              });
            }

            // Update the previousTitle in storage
            chrome.storage.local.set({'previousTitle': currentTitle});
          });
        }
      })
      .catch(console.error);
}
