'use strict';

var _ = require('underscore');
var Backbone = require('backbone');

var Hoard = require('src/backbone.hoard');
var Store = require('src/store');
var Policy = require('src/policy');
var CreateStrategyClass = require('src/strategies/create');
var ReadStrategyClass = require('src/strategies/read');
var UpdateStrategyClass = require('src/strategies/update');
var PatchStrategyClass = require('src/strategies/patch');
var DeleteStrategyClass = require('src/strategies/delete');

var strategies = {
  create: {
    klass: CreateStrategyClass,
    classProperty: 'createStrategyClass',
    property: 'strategy'
  },

  read: {
    klass: ReadStrategyClass,
    classProperty: 'readStrategyClass',
    property: 'readStrategy'
  },

  update: {
    klass: UpdateStrategyClass,
    classProperty: 'updateStrategyClass',
    property: 'updateStrategy'
  },

  patch: {
    klass: PatchStrategyClass,
    classProperty: 'patchStrategyClass',
    property: 'patchStrategy'
  },

  'delete': {
    klass: DeleteStrategyClass,
    classProperty: 'deleteStrategyClass',
    property: 'deleteStrategy'
  }
};

var mergeOptions = _.union(['storeClass', 'policyClass'],
  _.pluck(strategies, 'classProperty'));

var strategyClasses = {};
_.each(strategies, function (strategy) {
  strategyClasses[strategy.classProperty] = strategy.klass;
});

var Control = function (options) {
  _.extend(this, _.pick(options || {}, mergeOptions));
  var defaultClasses = _.extend({
    storeClass: Store,
    policyClass: Policy
  }, strategyClasses);
  _.defaults(this, defaultClasses);

  this.store = new this.storeClass(options);
  this.policy = new this.policyClass(options);
  var strategyOptions = _.extend({}, options, {
    store: this.store,
    policy: this.policy
  });

  _.each(strategies, function (strategy) {
    this[strategy.property] = new this[strategy.classProperty](strategyOptions);
  }, this);

  this.initialize.apply(this, arguments);
};

_.extend(Control.prototype, Backbone.Events, {
  initialize: function () {},

  sync: function (method, model, options) {
    var strategyProperty = strategies[method];
    var strategy = this[strategyProperty];
    return strategy.execute(model, options);
  },

  getModelSync: function () {
    return _.bind(this.sync, this);
  }
});

Control.extend = Backbone.Model.extend;

module.exports = Control;
