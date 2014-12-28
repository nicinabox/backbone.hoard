'use strict';

var Backbone = require('backbone');
var Policy = require('src/policy');

describe("Policy", function () {
  describe("backbone configuration", function () {
    beforeEach(function () {
      this.Model = Backbone.Model.extend({url: 'url'});
      this.model = new this.Model({ id: 1, value: 1 });
      this.policy = new Policy();
    });

    it("getKey should return the result of the url, by default", function () {
      expect(this.policy.getKey(this.model)).to.equal(this.model.url);
    });

    it("getUrl should return the result of the url, by default", function () {
      expect(this.policy.getUrl(this.model)).to.equal(this.model.url);
    });

    it("getData should return the attributes of the given model", function () {
      expect(this.policy.getData(this.model)).to.deep.eql({ id: 1, value: 1 });
    });
  });

  describe("getMetadata", function () {
    describe("cache expiration", function () {
      beforeEach(function () {
        this.clock = this.sinon.useFakeTimers(5);
      });

      afterEach(function () {
        this.clock.restore();
      });

      it("sets expiration based on the expires property", function () {
        var policy = new Policy({ expires: 1234 });
        expect(policy.getMetadata()).to.eql({ expires: 1234 });
      });

      it("uses the timeToLive property to calculate expires", function () {
        var policy = new Policy({ timeToLive: 10 });
        var meta = policy.getMetadata();
        expect(meta).to.eql({ expires: 15 });
      });

      it("prefers expires to timeToLive", function () {
        var policy = new Policy({ expires: 100, timeToLive: 10 });
        var meta = policy.getMetadata();
        expect(meta).to.eql({ expires: 100 });
      });
    });
  });
});
