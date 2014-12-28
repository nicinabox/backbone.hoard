'use strict';

var PositiveWriteStrategy = require('./positive-write-strategy');

module.exports = PositiveWriteStrategy.extend({
  _method: 'patch',

  // A reasonable response for a PATCH call is to return the delta of the update.
  // Provide the original information so the cached data makes sense
  cacheOptions: function (model, options) {
    return { original: this.policy.getData(model, options) };
  }
});
