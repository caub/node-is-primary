const mongoose = require('mongoose');
const { EventEmitter } = require('events');
const os = require('os');


class Node extends EventEmitter {
  constructor() {
    super();
    this.itv = null; // interval instance
    /**
     * Sets the default variables
     */
    this.primary = false;
    this.collection = 'node';
    this.hostname = os.hostname();
    this.pid = process.pid;
    this.versions = process.versions;
    this.id = null;
    this.timeout = 60;
  }

  /**
   * Function initializes options, does some basic option verification and starts is-primary
   */
  start(options) {
    if (options?.timeout) {
      options.timeout = parseInt(options.timeout, 10);
      if (isNaN(options.timeout)) throw new Error('timeout is not a number!');
    }
    Object.assign(this, options);
    this.mongooseInit();
    return this.startWorker();
  }

  stop() {
    clearInterval(this.itv);
  }

  /**
   * Function initializes the mongoose table, schema, and model
   */
  mongooseInit() {
    const schema = new mongoose.Schema({
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
    if (mongoose.models[this.collection]) {
      throw new Error('Model already loaded');
    }

    this.model = mongoose.model(this.collection, schema);

    this.worker = new this.model({
      hostname: this.hostname,
      pid: this.pid,
      versions: this.versions,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      startDate: new Date(),
      updateDate: new Date()
    });
  }

  /**
   * Function saves the worker in the db and updates it
   */
  startWorker() {
    return this.worker.save()
      .then(worker => {
        this.id = worker._id;
        return this.isPrimary();
      })
      .then(results => {
        this.primary = results;
        this.emit('connected');
        this.emit(this.primary ? 'primary' : 'secondary');
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
  }

  /**
   * Function that runs the worker that checks in whith the DB
   */
  process() {
    // Update this node in the cluster every x timeout
    this.itv = setInterval(() => {
      this.model.updateOne({
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
          return this.isPrimary();
        })
        .then(results => {
          if (results !== this.primary) {
            this.primary = results;
            this.emit('changed');
            this.emit(this.primary ? 'primary' : 'secondary');
          }
        })
        .catch(err => {
          console.error(err);
        });
    }, this.timeout * 1000);
  }

  /**
   * Function resolves with true/false if the node proc is the primary (the oldest node in the cluster)
   */
  isPrimary() {
    if (this.id) {
      return this.model.findOne({}, { id: 1 }, { sort: { startDate: 1 }})
        .then(results => {
          if (!results) return false;
          return results._id.toString() === this.id.toString();
        });
    } else {
      return false;
    }
  }
}

/**
 * Expose node
 */
module.exports = new Node();
