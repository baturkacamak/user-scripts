# [Youtube Comments Sidebar](https://github.com/baturkacamak/userscripts/tree/master/youtube-comments-sidebar)

Here is a markdown documentation and description for the `AdsFilter` class:

AdsFilter
=========

The `AdsFilter` class is used to remove ads that have been bumped from the page on the Wallapop website. It provides a static method for initializing the filter and starting an interval that calls a method for removing the bumped ads.

Properties
----------

*   `DELAY`: The time to wait before checking for the ads again (in milliseconds). This is set to `5000` by default.
*   `BUMPED_AD_SELECTOR`: A string representing the selector for ads that have been bumped. This is set to `'tsl-svg-icon.ItemCardWide__icon--bumped'` by default.
*   `ALL_ADS_SELECTOR`: A string representing the selector for all ads. This is set to `'[tsladslotshopping] > a'` by default.

Methods
-------

### `handleAd(ad)`

This method is used to handle a single ad. If the ad has a `'tsl-svg-icon.ItemCardWide__icon--bumped'` child element, it is removed from the page.

#### Parameters

*   `ad`: The ad element to handle.

### `removeBumpedAds()`

This method is used to remove ads that have been bumped from the page. It does this by getting all ads that have a `'tsladslotshopping'` attribute and then checking if each ad has a `'tsl-svg-icon.ItemCardWide__icon--bumped'` child element. If it does, the ad is removed from the page.

### `init()`

This method initializes the filter by starting an interval that calls the `removeBumpedAds()` method every `DELAY` milliseconds.

Usage
-----

To use the `AdsFilter` class, you can simply call the `init()` method to initialize the filter and start the interval that will remove bumped ads on the Wallapop website. Here is an example:

Copy code

`AdsFilter.init();`

Alternatively, you can customize the `DELAY`, `BUMPED_AD_SELECTOR`, and `ALL_ADS_SELECTOR` properties before calling `init()` to change the behavior of the filter. Here is an example:

Copy code

`AdsFilter.DELAY = 10000; AdsFilter.BUMPED_AD_SELECTOR = '.my-bumped-ad-class'; AdsFilter.ALL_ADS_SELECTOR = '.my-ad-class'; AdsFilter.init();`
