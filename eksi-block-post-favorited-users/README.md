# EksiSözlük - Block Multiple Users in Bulk
A Tampermonkey script that is designed for the Eksi Sözlük website and allows users to block multiple users who favorited a post in bulk. It makes the process more efficient and easy to use than manually blocking users one by one.

## Installation Guide

To install the EksiSözlük - Block Multiple Users in Bulk userscript, follow these steps:

1. Install a userscript manager like [Tampermonkey](https://tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/). These programs allow you to manage userscripts and run them on websites.
2. Click on the following link to install the script: [eksi-block-post-favorited-users.user.js](https://github.com/baturkacamak/userscripts/raw/master/eksi-block-post-favorited-users/eksi-block-post-favorited-users.user.js)
3. Your userscript manager should open and display information about the script. Click on the "Install" button to install the script.

## How to use

1. Navigate to a page where posts are listed, such as a topic page or a user's profile page.
2. Click on the three dots (...) next to an username.
3. A new menu item titled "favorileyenleri engelle" (block favorites) will appear in the menu.
4. Click on the "favorileyenleri engelle" button to block all users who have favorited the post. A pop-up will appear to show the current progress of the bulk block process, including the number of users blocked and the total number of users on the list.

## Features

- Blocks multiple users in bulk by fetching the list of users who have favorited a specific post.
- Shows the number of blocked users, total number of users in the list, and the username of the user being blocked.
- Easy to use and lightweight script.

## Technical TODO
- Apply decorator pattern for `EksiHtmlParser`
- Separate `EksiNotification` into smaller classes

## Notes

- This script only works on the Eksi Sözlük website and may not work if the website's structure changes.
- Please use this script responsibly and block users only if they have violated the terms of service of Eksi Sözlük.
- **Please note that this script is intended for personal use only and use of this script is at your own risk. The developer of this script cannot be held responsible for any damages or issues that may arise from its use. Use at your own discretion.**

