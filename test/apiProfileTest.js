var HaloAPI = require("../js/index");
var chai = require('chai'),
    expect = chai.expect;

chai.use(require("chai-as-promised"));
chai.use(require("chai-string"));

describe("h5.profile", function () {
    var h5 = new HaloAPI(process.env.HALOAPI_KEY);
    
    // leniant 10 second timemout
    this.timeout(10000);

    describe(".spartanImage(player: string)", function () {
        var player = "Frankie";
        var promise = h5.profile.spartanImage(player);
        it("should succeed", function () {
            return expect(promise).to.be.fulfilled;
        });
        it("should be a url", function (done) {
            promise.then(function (url) {
                expect(url).to.be.a('string');
                expect(url).to.startsWith('http');
                done();
            });
        });

        it("should 4xx on bad gamertag", function () {
            var badPlayer = "this gameratag is too long";
            return expect(h5.profile.spartanImage(badPlayer))
                .to.be.rejectedWith(/4../);
        })
    });

    describe(".spartanImage(params: IProfileParams)", function () {
        var params = {
            player: "Frankie",
            crop: "portrait",
            size: 512
        };
        var promise = h5.profile.spartanImage(params);
        it("should succeed", function () {
            return expect(promise).to.be.fulfilled;
        });
        it("should be a url", function (done) {
            promise.then(function (url) {
                expect(url).to.be.a('string');
                expect(url).to.startsWith('http');
                expect(url.indexOf(String(params.size))).to.not.equal(-1);
                done();
            });
        });
    });

    describe(".emblemImage(player: string)", function () {
        var player = "Frankie";
        var promise = h5.profile.emblemImage(player);
        it("should succeed", function () {
            return expect(promise).to.be.fulfilled;
        });
        it("should be a url", function (done) {
            promise.then(function (url) {
                expect(url).to.be.a('string');
                expect(url).to.startsWith('http');
                done();
            });
        });

        it("should 4xx on bad gamertag", function () {
            var badPlayer = "this gameratag is too long";
            return expect(h5.profile.emblemImage(badPlayer))
                .to.be.rejectedWith(/4../);
        });
    });

    describe(".emblemImage(params: IProfileParams)", function () {
        var params = {
            player: "Frankie",
            size: 128
        };
        var promise = h5.profile.spartanImage(params);
        it("should succeed", function () {
            return expect(promise).to.be.fulfilled;
        });
        it("should be a url", function (done) {
            promise.then(function (url) {
                expect(url).to.be.a('string');
                expect(url).to.startsWith('http');
                expect(url.indexOf(String(params.size))).to.not.equal(-1);
                done();
            });
        });
    });

});