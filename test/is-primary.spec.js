'use strict';

const test = require("assert");
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const node = require('../is-primary');

describe("is-primary", function () {

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
        await node.start({
            collection: 'testcol',
            hostname: 'testhost',
            timeout: 120
        });
        node.stop();
    });
    it("should return if it is the primary", async function () {
        const results = await node.isPrimary();
        test(typeof result, 'boolean');
    });
});
