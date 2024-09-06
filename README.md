is-primary
=========
Find the primary node process in a multi server cluster.

This module finds the primary node in a cluster by inserting the nodes in a mongodb and choosing the primary by which node is the oldest. Each node checks into mongodb on a set timeout (default 1 minute). If the primary node dies for whatever reason, mongodb will expire the record and the next node in line will become the primary. Mongoose and a connection to a mongodb database is REQUIRED for is-primary to work.

Use cases for this module:
* If you run your node app with a cluster manager like PM2 or Heroku dynos or even if you run your clusters on multiple servers (they just need to all report into the same mongodb), you can find which node process is the primary.
* This will allow you to assign one node process as the primary so that it can run tasks that should only be ran by one process, such as scheduled tasks and database cleanup.

## Installation

    npm install is-primary

## Usage / Examples
```
var mongoose = require('mongoose');
var node = require('is-primary');

// Start the mongoose db connection
mongoose.connect('mongodb://127.0.0.1:27017/test')
  .catch(err => {
    console.error('\x1b[31m', 'Could not connect to MongoDB!');
  });

// Start the is-primary worker
node.start();

// Check if this current process is the primary using the callback method
setInterval(function() {
  node.isPrimary().then(results => {
    console.log('Promise Primary:', results);
  });
}, 5000);

// Check if this current process is the primary using the variable method
setInterval(function() {
    console.log('Variable primary:', node.primary);
}, 5000);

// Event Emitters that you can listen for
node.on('connected', function() {
  console.log('The is-primary worker has connected and insterted into mongodb.');
});

node.on('synced', function() {
  console.log('The is-primary worker has synced to mongodb.');
});

node.on('changed', function() {
  console.log('The primary value has changed');
});

node.on('primary', function() {
  console.log('The process has been promoted to primary');
});

node.on('secondary', function(){
  console.log('The process has been demoted to secondary');
});

```

## Options

When starting the worker, you can specify options in an object to update the default values.

    node.start({
      timeout: 120, // How often the nodes check into the database. This value is in seconds, default 60.
      hostname: 'devServer1', // Sets the hostname of the node, without this value it will get the hostname using os.hostname.
      collection: 'proc' // The mongodb collection is-primary will use. Please note that by default mongoose adds an 's' to the end to make it plural. Default value is 'node'.
    });

## FAQ

Q. I updated the timeout option, but mongodb is not expiring the node in that timeout specified.

A. 60 seconds is added to the mongodb expire timeout to ensure the primary has time to checkin. Also please note, if this value is changed from the initial creation of the table, it will not be able to update the index. You will need to delete the table and then restart your server to re-create it.


## Compatibility

For backward compatibility, the `secondary` event was also emitted with the historical name `slave`.
This is now removed

## More info

http://mattpker.com/2015/08/07/How-to-schedule-jobs-in-NodeJS/

## Tests

    npm test

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 1.3.0 Deprecating slave terminolgy for secondary [#18](https://github.com/mattpker/node-is-master/pull/18), mongoose security update [#19](https://github.com/mattpker/node-is-master/pull/19), and fix for mongoose deprecation warnings [#17](https://github.com/mattpker/node-is-master/pull/17)
* 1.2.2 Fix [#11](https://github.com/mattpker/node-is-master/issues/11), issue with inserts/upserts duplicate key errors
* 1.2.1 Added blog posting to README.md for more information
* 1.2.0 Added EventEmitter's for more functionality
* 1.1.4 Better performance and resliancy in high-concurrency settings ([#5](https://github.com/mattpker/node-is-master/pull/6), Thanks to @bendalton)
* 1.1.3 Fixed critical infinite loop when there are duplicate start dates, resulting in elevated CPU and rapid log growth. All users are urged to upgrade. ([#4](https://github.com/mattpker/node-is-master/issues/4), Thanks to @markstos)
* 1.1.2 Removed unnecessary dev dependencies
* 1.1.1 Fixed the tests to mock mongoose
* 1.1.0 Added option for changing the collection
* 1.0.0 Initial release
