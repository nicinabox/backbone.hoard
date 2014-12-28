'use strict';

var Hoard = require('./backbone.hoard');
var Strategy = require('./strategy');

// The Delete Strategy aggressively clears a cached item
var Delete = Strategy.extend({
  execute: function (model, options) {
    var key = this.policy.getKey(model, 'delete');
    options.url = this.policy.getUrl(model, 'delete', options);
    var invalidatePromise = this.store.invalidate(key, options);
    var syncPromise = Hoard.sync('delete', model, options);
    var returnSync = function () { return syncPromise; };
    return invalidatePromise.then(returnSync);
  }
});

module.exports = Delete;