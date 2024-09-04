'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    util = require('util'),
    EventEmitter = require("events").EventEmitter,
    os = require('os');

var itv;

function im() {
    EventEmitter.call(this);
}

// Inherit the EventEmitter into our im prototype
util.inherits(im, EventEmitter);

/**
 * Sets the default variables
 */
im.prototype.master = false;
im.prototype.collection = 'node';
im.prototype.hostname = os.hostname();
im.prototype.pid = process.pid;
im.prototype.versions = process.versions;
im.prototype.id = null;
im.prototype.timeout = 60;

/**
 * Function initializes options, does some basic option verification and starts is-master
 */
im.prototype.start = function(options) {
    if (options) {
        if (options.timeout) {
            options.timeout = parseInt(options.timeout, 10);
            if (isNaN(options.timeout)) throw 'im: timeout is not a number!';
        }

        util._extend(this, options);
    }
    this.mongooseInit();
    return this.startWorker();
};

im.prototype.stop = function () {
    clearInterval(itv);
};

/**
 * Function initializes the mongoose table, schema, and model
 */
im.prototype.mongooseInit = function() {
    var imSchema = new Schema({
        hostname: {
            type: String,
            trim: true,
            default: '',
        },
        pid: {
            type: Number,
        },
        versions: {
            type: Object,
        },
        memory: {
            type: Object,
        },
        uptime: {
            type: Number,
        },
        startDate: {
            type: Date,
            default: Date.now,
            index: {
                unique: true
            }
        },
        updateDate: {
            type: Date,
            default: Date.now,
            index: {
                expires: this.timeout + 60
            }
        }
    });

    // ensure we aren't attempting to redefine a collection that already exists
    if (mongoose.models.hasOwnProperty(this.collection)) {
        this.imModel = mongoose.model(this.collection);
    } else{
        this.imModel = mongoose.model(this.collection, imSchema);
    }

    this.worker = new this.imModel({
        hostname: this.hostname,
        pid: this.pid,
        versions: this.versions,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        startDate: new Date(),
        updateDate: new Date()
    });
};

/**
 * Function saves the worker in the db and updates it
 */
im.prototype.startWorker = async function() {
    return this.worker.save()
        .then(worker => {
            this.id = worker._id;
            return this.isMaster();
        })
        .then(results => {
            this.master = results;
            this.emit('connected');
            if (this.master) {
                this.emit('master');
            } else {
                this.emit('slave');
                this.emit('secondary');
            }
            this.process();
         })
        .catch(err => {
            if (err.code === 11000) {
                this.worker.startDate = new Date();
                this.worker.updateDate = new Date();
                return this.startWorker();
            } else {
                throw err;
            }
        });
};

/**
 * Function that runs the worker that checks in whith the DB
 */
im.prototype.process = function() {
    // Update this node in the cluster every x timeout
    itv = setInterval(() => {
        this.imModel.updateOne({
            _id: this.id
        }, {
            hostname: this.hostname,
            pid: this.pid,
            versions: this.versions,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            updateDate: new Date()
        }, {
            upsert: true, // handle event where document was deleted
            setDefaultsOnInsert: true, // on insert, make sure to set default values
        })
            .then(() => {
                this.emit('synced');
                return this.isMaster();
            })
            .then(results => {
                if (results !== this.master) {
                    this.master = results;
                    this.emit('changed');
                    if (this.master) {
                        this.emit('master');
                    } else {
                        this.emit('slave');
                        this.emit('secondary');
                    }
                }
            })
            .catch(err => {
                console.error(err);
            });
    }, this.timeout * 1000);
};

/**
 * Function resolves with true/false if the node proc is the master (the oldest node in the cluster)
 */
im.prototype.isMaster = function() {
    if (this.id) {
        return this.imModel.findOne({}, {
            id: 1
        }, {
            sort: {
                startDate: 1
            }
        })
            .then(results => {
                if (!results) return false;
                return results._id.toString() === this.id.toString();
            });
    } else {
        return false;
    }
};

/**
 * Expose im
 */
module.exports = new im();
