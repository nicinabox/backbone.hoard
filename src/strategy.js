'use strict';

var _ = require('underscore');
var Hoard = require('./backbone.hoard');
var Lock = require('./lock');

var mergeOptions = ['store', 'policy'];

// A Strategy is tied to a particular sync method on a Control
// The execute method will be called by the Control with the model and options being synced.
// It is abstract by default, and it's implementations get access to the Store and Policy
// provided by the Controller
var Strategy = function (options) {
  _.extend(this, _.pick(options || {}, mergeOptions));
  this.initialize.apply(this, arguments);
};

_.extend(Strategy.prototype, Hoard.Events, {
  initialize: function () {},

  execute: function (model, options) {
    throw new Error("Strategy#execute must be implemented");
  },

  //When the cache is full, evict items from the cache
  //and try to store the item again
  //or just return the value if storage fails
  onCacheFull: function (cacheFull) {
    var key = cacheFull.key;
    var value = cacheFull.value;
    var meta = cacheFull.meta;
    var error = cacheFull.error;
    var options = cacheFull.options;

    // lock access to keep knowledge of cache consistent
    return Lock.withLock('store-write', _.bind(function () {
      return this.store.getAllMetadata().then(_.bind(function (metadata) {
        var keysToEvict = this.policy.getKeysToEvict(metadata, key, value, error);
        if (!_.isEmpty(keysToEvict)) {
          var evictions = _.map(keysToEvict, function (key) {
            return this.store.invalidate(key, options);
          }, this);
          return Hoard.Promise.all(evictions);
        } else {
          return Hoard.Promise.reject();
        }
      }, this));
    }, this)).then(
      _.bind(this.store.set, this.store, key, value, meta, options),
      function () { return Hoard.Promise.reject(value); }
    );
  },

  // Cache the response when the success callback is called
  _wrapSuccessWithCache: function (method, model, options) {
    return this._wrapMethod(method, model, _.extend({
      targetMethod: 'success',
      responseHandler: _.bind(this._storeResponse, this)
    }, options));
  },

  // invalidate the key when the success callback is called
  _wrapErrorWithInvalidate: function (method, model, options) {
    return this._wrapMethod(method, model, _.extend({
      targetMethod: 'error',
      responseHandler: _.bind(this._invalidateResponse, this)
    }, options));
  },

  _wrapMethod: function (method, model, options) {
    var key = this.policy.getKey(model, method, options);
    return _.wrap(options[options.targetMethod], _.bind(function (targetMethod, response) {
      if (targetMethod) {
        targetMethod(response);
      }
      if (options.generateKeyFromResponse) {
        key = this.policy.getKey(model, method, options);
      }
      if (options.responseHandler) {
        options.responseHandler(key, response, options);
      }
    }, this));
  },

  _invalidateResponse: function (key, response, options) {
    this.store.invalidate(key).then(
      this._storeAction('onStoreSuccess', options, response),
      this._storeAction('onStoreError', options, response)
    );
  },

  _storeResponse: function (key, response, options) {
    var meta = this.policy.getMetadata(key, response, options);
    this.store.set(key, response, meta).then(
      _.identity,
      _.bind(this.onCacheFull, this)
    ).then(
      this._storeAction('onStoreSuccess', options, response),
      this._storeAction('onStoreError', options, response)
    );
  },

  _storeAction: function (method, options, response) {
    var callback = options[method] || function () { return response };
    return function () { return callback(response); }
  }
});

Strategy.extend = Hoard.extend;

module.exports = Strategy;
