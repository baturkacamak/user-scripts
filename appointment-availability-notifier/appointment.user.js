// ==UserScript==
// @id           appointment-availability-notifier@https://github.com/baturkacamak/userscripts
// @name         Appointment Availability Notifier
// @namespace    https://github.com/baturkacamak/userscripts
// @version      1.0.0
// @description  Notifies the user when an appointment becomes available on specified websites and solves CAPTCHA automatically.
// @author       Batur Kacamak
// @copyright    2024+, Batur Kacamak (https://batur.info/)
// @homepage     https://github.com/baturkacamak/user-scripts/tree/master/appointment-availability-notifier#readme
// @homepageURL  https://github.com/baturkacamak/user-scripts/tree/master/appointment-availability-notifier#readme
// @downloadURL  https://github.com/baturkacamak/user-scripts/raw/master/appointment-availability-notifier/appointment-availability-notifier.user.js
// @updateURL    https://github.com/baturkacamak/user-scripts/raw/master/appointment-availability-notifier/appointment-availability-notifier.user.js
// @match        https://service2.diplo.de/*
// @icon         https://service2.diplo.de/favicon.ico
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

GM_addStyle(`
  #custom-modal {
    background: white;
    color: black;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 20px;
    z-index: 10000;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    transition: transform 0.5s ease, opacity 0.5s ease;
    opacity: 1;
  }

  #custom-modal.closed {
    transform: translate(-50%, -50%) rotate(720deg) scale(0);
    opacity: 0;
  }

    #custom-modal, #reload-timer {
    background: white;
    color: black;
    position: fixed;
    padding: 20px;
    z-index: 10000;
    border-radius: 5px;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
  }
  #custom-modal {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    transition: transform 0.5s ease, opacity 0.5s ease;
    opacity: 1;
  }
  #custom-modal.closed {
    transform: translate(-50%, -50%) rotate(720deg) scale(0);
    opacity: 0;
  }
  #reload-timer {
    bottom: 20px;
    right: 20px;
  }
`);

(function() {
  'use strict';

  // Constants
  const NOTIFICATION_SOUND_URL = 'https://raw.githubusercontent.com/baturkacamak/user-scripts/master/appointment-availability-notifier/notification.wav'; // Replace with the actual URL of your notification sound
  const CAPTCHA_SELECTOR = '#appointment_captcha_month'; // The CSS selector for the CAPTCHA element
  const APPOINTMENT_TEXT_SELECTOR = 'h2'; // The CSS selector for the appointment text element
  const NO_APPOINTMENTS_TEXT = 'Unfortunately, there are no appointments available at this time. New appointments will be made available for booking at regular intervals.';
  const RELOAD_INTERVAL_MS = 60000; // 1 minute
  const NOTIFICATION_INTERVAL_MS = 30000; // 30 seconds
  let notificationInterval;

  // User activity tracking
  let userIsActive = false;
  let userActivityTimeout;

  function resetUserActivity() {
    userIsActive = true;
    clearTimeout(userActivityTimeout);
    userActivityTimeout = setTimeout(() => {
      userIsActive = false;
    }, 10000); // Consider user inactive after 10 seconds of no mouse movement
  }

  // Call this function when you want to potentially notify the user
  function notifyUserWithSound() {
    if (!userIsActive) { // Play sound only if user is considered inactive
      playNotificationSound();
    }
  }

  function playNotificationSound() {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.play().catch((err) => console.error('Error playing sound:', err));
  }

  // Add mouse movement listener to track user activity
  document.addEventListener('mousemove', resetUserActivity);

  // Function to create and show a modal dialog
  function showModal(message) {
    const modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.innerHTML = `
            <p>${message}</p>
            <button id="close-modal" style="margin-top: 10px;">Close</button>
        `;
    document.body.appendChild(modal);

    // Close button event
    document.getElementById('close-modal').addEventListener('click', function() {
      modal.classList.add('closed');
      setTimeout(() => modal.remove(), 500); // Wait for transition to finish before removing
    });
  }

  // Function to extract base64 data from the div's background image
  function extractBase64FromDiv(divId) {
    const div = document.getElementById(divId);
    const style = div.style.background;
    const regex = /url\("data:image\/jpg;base64,(.+?)"\)/;
    const matches = style.match(regex);
    return matches ? matches[1] : null;
  }

  // Function to perform OCR by sending the image to the Python server
  function performOCR(base64Data) {
    if (!base64Data) {
      console.error('No Base64 data found');
      return;
    }

    // Prepare the data to be sent
    const requestData = {
      image: base64Data,
    };

    // Send a POST request to the Python server
    fetch('http://localhost:5000/process-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })
        .then((response) => response.json())
        .then((data) => {
          console.log('Recognized text:', data.text);
          // Do something with the recognized text
        })
        .catch((err) => {
          console.error('OCR error:', err);
        });
  }

  // Add timer display to the page
  function createReloadTimer() {
    const timer = document.createElement('div');
    timer.id = 'reload-timer';
    timer.innerHTML = 'Page will reload in 60 seconds.';
    document.body.appendChild(timer);
    return timer;
  }

  // Update the timer display
  function updateReloadTimer(timer, timeLeft) {
    timer.innerHTML = `Page will reload in ${timeLeft} seconds.`;
  }

  // Modified reload logic with countdown
  function startReloadCountdown(duration) {
    const timer = createReloadTimer();
    let timeLeft = duration / 1000; // Convert to seconds for display
    updateReloadTimer(timer, timeLeft);

    const countdown = setInterval(() => {
      timeLeft--;
      updateReloadTimer(timer, timeLeft);

      if (0 >= timeLeft) {
        clearInterval(countdown);
        location.reload();
      }
    }, 1000); // Update every second
  }

  // Function to check for changes in appointment text or CAPTCHA presence
  function checkForChangesOrCaptcha() {
    // Check if CAPTCHA is present
    const isCaptchaPresent = null !== document.querySelector(CAPTCHA_SELECTOR);

    // If CAPTCHA is detected, display a message and stop the script
    if (isCaptchaPresent) {
      const message = '🕵️‍♂️ CAPTCHA detected! Solve it with your superpowers to continue. 🦸‍♀️';
      showModal(message);
      clearInterval(notificationInterval);
      setTimeout(() => {
        const captchaId = document.querySelector('div > captcha > div').getAttribute('id');
        const base64Data = extractBase64FromDiv(captchaId); // Use the actual ID of your div
      }, 2000);
      return;
    }

    // Get the current text from the appointment element
    const currentAppointmentText = document.querySelector(APPOINTMENT_TEXT_SELECTOR).innerText;

    // If the text has changed, play the notification sound and set an interval to repeat it
    if (currentAppointmentText !== NO_APPOINTMENTS_TEXT) {
      playNotificationSound();
      notificationInterval = setInterval(playNotificationSound, NOTIFICATION_INTERVAL_MS);
    } else {
      startReloadCountdown(RELOAD_INTERVAL_MS);
      // Reload the page after a defined interval if no changes are detected and CAPTCHA is not present
      setTimeout(() => location.reload(), RELOAD_INTERVAL_MS);
    }
  }

  // Add event listener for the window load event
  window.addEventListener('load', checkForChangesOrCaptcha);
})();
