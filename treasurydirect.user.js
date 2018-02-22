// ==UserScript==
// @name         Treasurydirect enable autofill
// @namespace    http://gregcochard.com/
// @updateURL    https://github.gregcochard.com/userscripts/treasurydirect.user.js
// @version      1.0
// @description  Enable autofill on the treasurydirect password entry
// @author       You
// @match        https://www.treasurydirect.gov/RS/PW-Display.do
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    // ugh, stupid treasury website
    $('input[type="password"]').removeAttr('readonly');
    $('input[type="password"]').removeAttr('autocomplete');
})();
