var express = require('express');
var halo = require('../halo');

module.exports = function (io) {
	var router = express.Router();
	// could use one line instead: var router = require('express').Router();
	
	router.get('/', function (req, res) {
	  var players = halo.players;
	  res.render( 'index', { thisPlayer: players["ILikeBlakGuys"], title: 'Halo SWAT Analyzer', players: players, showForm: false } );
	});

	router.get('/users/:name', function (req, res) {
	  var players = halo.players;
	  res.render( 'index', { thisPlayer: players[req.params.name], title: 'Halo SWAT Analyzer - ' + req.params.name, players: players, showForm: false } );
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

