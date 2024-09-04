'use strict';

var mongoose = require('../node_modules/mongoose');
var node = require('../is-primary.js');

// Start the mongoose db connection
mongoose.connect('mongodb://127.0.0.1:27017/test', function(err) {
    if (err) {
        console.error('\x1b[31m', 'Could not connect to MongoDB!');
        throw (err);
    }
});

// Start the is-primary worker
node.start();

// Check if this current process is the primary using the callback method
setInterval(function() {
    node.isPrimary().then(results => {
        console.log('Callback primary: ', results);
    });
}, 5000);

// Check if this current process is the primary using the variable method
setInterval(function() {
        console.log('Variable primary: ', node.primary);
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
