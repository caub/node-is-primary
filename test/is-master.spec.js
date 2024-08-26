'use strict';

const test = require("assert");
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const sinon = require('sinon');

const im = require('../is-master');

describe("is-master", function () {

    let mongoServer;

    beforeEach(async function () {
        mongoServer = await MongoMemoryServer.create();
        console.log('Using memory DB:', mongoServer.getUri());
        await mongoose.connect(mongoServer.getUri());
    });

    afterEach(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    it("should start the worker", async function () {
        await im.start({
            collection: 'testcol',
            hostname: 'testhost',
            timeout: 120
        });
    });
    it("should return if it is the master", async function () {
        const results = await im.isMaster();
        test(typeof result, 'boolean');
    });
});
