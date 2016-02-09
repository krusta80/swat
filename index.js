var HaloStats = function() {
	this.util = require('util');
	this.swatID = "2323b76a-db98-4e03-aa37-e171cfbdd1a4";
	this.swatVariants = {
							"0991c821-5e05-47a9-a5ae-70fdab11f9d0" : "SWAT",
							"e4680d6f-2980-4f4a-9f95-c6a52f54cfd4" : "SWATnums"
						};
	this.h5 = new (require("haloapi"))('61feef943ae34573aaedac21defa3ced');
	this.threads = 0;
	this.playerTags = ["Thor1330","ILikeBlakGuys","PicturMeRollin2","NDmajor"];
	this.players = {};
	for(var i = 0; i < this.playerTags.length; i++) {
		this.players[this.playerTags[i]] = {tag : this.playerTags[i]};
	}
	this.URLFuncs = {
						emblem : this.h5.profile.emblemImage,
						avatar : this.h5.profile.spartanImage
					};
	this.getPlayerURLs(this.URLFuncs);
	this.getMatchBatch("Thor1330",0,25);
	
	//setInterval(function(){if(this.threads == 0) {console.log(this.players); process.exit(0);}}.bind(this),100);
	//this.h5.metadata.csrDesignations().then(console.log);
	
	
/**
	this.h5.stats.serviceRecordArena("Thor1330").then(function(data) {
		console.log(this.util.inspect(data, false, null));
	}.bind(this));
*/
};

HaloStats.prototype.getMatchBatch = function(playerTag,start,count) {
	this.h5.stats.playerMatches({
	    player: playerTag,
	    modes: "arena",
	    start: start,
	    count: count
	}).then(function(data) {
		this.parseGameVariants(data,playerTag);
		setTimeout(this.parseGameMatches.bind(this),25000,data,playerTag);
	}.bind(this));
};

HaloStats.prototype.parseGameMatches = function(matchData,playerTag) {
	for(var i = 0; i < matchData.Results.length; i++) {
		var match = matchData.Results[i];
		console.log(match.Id.MatchId+"|"+match.Id.GameMode+"|"+this.swatVariants[match.GameVariant.ResourceId]);
	}
}

HaloStats.prototype.parseGameVariants = function(matchData,playerTag) {
	for(var i = 0; i < matchData.Results.length; i++) {
		var match = matchData.Results[i];
		
		this.h5.metadata.gameVariantById(match.GameVariant.ResourceId)
		    .then(function (gameVariant) {
		        this.swatVariants[gameVariant.id] = gameVariant.name;
		    }.bind(this));
	}
};

HaloStats.prototype.getPlayerURLs = function(URLFuncs) {
	this.URLIndeces = {};

	for(var func in URLFuncs) {
		this.URLIndeces[func] = 0;
		this.getNextUrl(func,URLFuncs[func])
	}
};

HaloStats.prototype.getNextUrl = function(thisType,func) {
	var URLIndex = this.URLIndeces[thisType];
	if(URLIndex == this.playerTags.length) {
		return;
	}
	var player = this.playerTags[URLIndex];
	
	this.threads++;															//	for async
	func.call(this.h5.profile,player).then(function (url) { 
		    this.players[player][thisType] = url;
		 	this.URLIndeces[thisType]++;
		 	this.threads--;													//	for async
		 	this.getNextUrl(thisType,func);
	}.bind(this));
};


var haloStats = new HaloStats();

