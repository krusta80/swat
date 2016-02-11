var express = require('express');
var halo = require('../halo');

module.exports = function (io) {
	var router = express.Router();
	// could use one line instead: var router = require('express').Router();
	
	router.get('/users/:name', function (req, res) {
	  var players = halo.players;
	  res.render( 'index', { 
	  						 tag: req.params.name, 
	  						 avatar: players[req.params.name].avatar, 
	  						 swat: players[req.params.name].stats.career.swat, 
	  						 swatnums: players[req.params.name].stats.career.swatnums, 
	  						 total: players[req.params.name].stats.career.total, 
	  						 title: 'Halo SWAT Analyzer (CAREER) - ' + req.params.name, 
	  						 players: players, 
	  						 seasonNames: halo.seasonNames,
	  						 seasons: halo.usedSeasons,
	  						 showForm: false 
	  						});
	});
	
	router.get('/users/:name/:season', function (req, res) {
	  var players = halo.players;
	  var thisSeason = {};
	  for(var s in halo.usedSeasons) {
	  	thisSeason[s] = "";
	  }
	  thisSeason[req.params.season] = "selected";
	  res.render( 'index', { 
	  						 thisSeason: thisSeason, 
	  						 tag: req.params.name, 
	  						 avatar: players[req.params.name].avatar, 
	  						 swat: players[req.params.name].stats[req.params.season].swat, 
	  						 swatnums: players[req.params.name].stats[req.params.season].swatnums, 
	  						 total: players[req.params.name].stats[req.params.season].total, 
	  						 title: 'Halo SWAT Analyzer ('+halo.seasonNames[req.params.season]+') - ' + req.params.name, 
	  						 players: players, 
	  						 seasonNames: halo.seasonNames,
	  						 seasons: halo.usedSeasons,
	  						 showForm: false 
	  						});
	});

	router.get('/', function (req, res) {
	  res.redirect('/users/ILikeBlakGuys');
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

