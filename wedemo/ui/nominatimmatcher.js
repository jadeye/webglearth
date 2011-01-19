
/**
 * @fileoverview Class that retrieves autocomplete matches from Nominatim
 * geocoder service.
 *
 * @author petr.pridal@klokantech.com (Petr Pridal)
 *
 * Copyright 2011 Klokan Technologies Gmbh (www.klokantech.com)
 */

goog.provide('wedemo.ui.NominatimMatcher');

goog.require('goog.net.Jsonp');



/**
 * An array matcher that requests matches via JSONP.
 * @param {string=} opt_url The Uri of the web service.
 * @param {Object.<string, string>=} opt_payload The list of extra parameters
     for the Jsonp request.
 * @constructor
 */
wedemo.ui.NominatimMatcher = function(opt_url, opt_payload) {

  /**
   * The url of the Nominatim instance
   * @type {string}
   * @private
   */
  this.url_ = opt_url || 'http://open.mapquestapi.com/nominatim/v1/search';

  /**
   * The list of extra parameters for the Jsonp request
   * @type {!Object}
   * @private
   */
  this.payload_ = opt_payload || {};

  /**
   * The Jsonp object used for making remote requests.  When a new request
   * is made, the current one is aborted and the new one sent instead.
   * @type {!goog.net.Jsonp}
   * @private
   */
  this.jsonp_ = new goog.net.Jsonp(this.url_, 'json_callback');
};


/**
 * Retrieve a set of matching rows from the server via JSONP and convert them
 * into rich rows.
 * @param {string} token The text that should be matched; passed to the server
 *     as the 'token' query param.
 * @param {number} maxMatches The maximum number of matches requested from the
 *     server; passed as the 'max_matches' query param.  The server is
 *     responsible for limiting the number of matches that are returned.
 * @param {Function} matchHandler Callback to execute on the result after
 *     matching.
 */
wedemo.ui.NominatimMatcher.prototype.requestMatchingRows =
    function(token, maxMatches, matchHandler) {

  this.payload_['q'] = token;
  this.payload_['format'] = 'json';
  this.payload_['addressdetails'] = 1;
  this.payload_['limit'] = maxMatches;

  // Ignore token which is empty or just one letter
  if (!token || token.length == 1) {
    matchHandler(token, []);
    return;
  }

  // After direct request cancel autocomplete
  if (maxMatches == 1) this.oldtoken_ = token;
  if (maxMatches > 1 && token === this.oldtoken_) return;

  // Cancel old request when we have a new one
  if (this.request_ !== null) this.jsonp_.cancel(this.request_);

  this.request_ = this.jsonp_.send(this.payload_, function(e) {

    // If there is one or more "place" then return only these
    var places = goog.array.filter(e,
        function(r) { return r['class'] == 'place'; });

    if (places.length > 0) {
      // Fix the "display_name"
      goog.array.forEach(places, function(r) {
        if (r['address']['country_code'] == 'us')
          var country = r['address']['state']; // + ', USA';
        else
          var country = r['address']['country'];
        if (r['type'] == 'suburb')
          var country = r['address']['city'] + ', ' + country;
        if (r['address'][r['type']])
          var s = r['address'][r['type']] + ', ' + country;
        else {
          var s = r['display_name'];
        }
        r['display_name'] = s;
      });
      matchHandler(token, places);
    } else {
      matchHandler(token, e);
    }
  });
};
