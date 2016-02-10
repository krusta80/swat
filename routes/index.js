var express = require('express');
var tweetBank = require('../tweetBank');

module.exports = function (io) {
	var router = express.Router();
	// could use one line instead: var router = require('express').Router();
	
	router.get('/', function (req, res) {
	  var tweets = tweetBank.list();
	  res.render( 'index', { title: 'Twitter.js', tweets: tweets, showForm: true } );
	});

	router.get('/users/:name', function (req, res) {
	  var tweets = tweetBank.find({name : req.params.name});
	  res.render( 'index', { name: req.params.name, title: 'Twitter.js - Posts by ' + req.params.name, tweets: tweets, showForm: true } );
	});

	router.get('/tweets/:tweetID', function (req, res) {
	  var tweets = tweetBank.find({tweetID : req.params.tweetID});
	  res.render( 'index', { title: 'Twitter.js', tweets: tweets } );
	});

	router.post('/tweets', function(req, res) {
	  var name = req.body.name;
	  var text = req.body.text;
	  var tweetID = tweetBank.add(name, text);
	  io.sockets.emit('new_tweet', { id: tweetID, name: name, text: text });
	  res.redirect('/');
	});

	return router;
}

