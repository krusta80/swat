var HaloStats = function() {
	this.util = require('util');
	this.fs = require("fs");
	this.swatID = "2323b76a-db98-4e03-aa37-e171cfbdd1a4";
	this.swatVariants = {
							"0991c821-5e05-47a9-a5ae-70fdab11f9d0" : "SWAT",
							"e4680d6f-2980-4f4a-9f95-c6a52f54cfd4" : "SWATnums"
						};
	
	this.h5 = new (require("haloapi"))('61feef943ae34573aaedac21defa3ced');
	this.secondsSinceLastWrite = 0;
	this.threads = 0;
	this.playerTags = ["Thor1330","ILikeBlakGuys","PicturMeRollin2","NDmajor"];
	this.players = {};
	for(var i = 0; i < this.playerTags.length; i++) {
		this.players[this.playerTags[i]] = {tag : this.playerTags[i], matches : {}, syncSpot : -1};
	}
	
	this.loadJSONFiles();

	this.URLFuncs = {
						emblem : this.h5.profile.emblemImage,
						avatar : this.h5.profile.spartanImage
					};
	this.getPlayerURLs(this.URLFuncs);
	this.syncAllMatches();
	setInterval(this.syncAllMatches.bind(this),5000);
	//setInterval(function(){if(this.threads == 0) {console.log(this.util.inspect(this.players,false,null)); process.exit();}}.bind(this),100);
	//this.h5.metadata.csrDesignations().then(console.log);
	
	
/**
	this.h5.stats.serviceRecordArena("Thor1330").then(function(data) {
		console.log(this.util.inspect(data, false, null));
	}.bind(this));
*/
};

HaloStats.prototype.syncAllMatches = function() {
	this.writeJSONWhenReady(3600);
	for(var p in this.playerTags) {
		if(this.players[this.playerTags[p]].syncSpot == -1) this.syncMatches(this.playerTags[p]);	
	}
	this.secondsSinceLastWrite += 5;
}

HaloStats.prototype.writeJSONWhenReady = function(threshHold) {
	if(this.secondsSinceLastWrite >= threshHold) {
		var allSynced = true;
		for(var p in this.playerTags) {
			allSynced &= (this.players[this.playerTags[p]].syncSpot == -1);	
		}	
		if(allSynced) {
			console.log("Saving objects to hard drive...");
			this.fs.writeFileSync('./players.json', JSON.stringify(this.players) , 'utf-8'); 
			this.fs.writeFileSync('./variants.json', JSON.stringify(this.swatVariants) , 'utf-8'); 
			this.secondsSinceLastWrite = 0;
		}
	}
}

HaloStats.prototype.loadJSONFiles = function() {
		console.log("Loading objects from hard drive...");
		this.players = JSON.parse(this.fs.readFileSync('./players.json', 'utf8'));
		this.variants = JSON.parse(this.fs.readFileSync('./variants.json', 'utf8'));
}

HaloStats.prototype.syncMatches = function(playerTag) {
	this.players[playerTag].syncSpot = 0;
	this.getMatchBatch(playerTag,0,25);
}

HaloStats.prototype.getMatchBatch = function(playerTag,start,count) {
	console.log("syncing " + playerTag + " at "+start);
	this.threads++;
	this.h5.stats.playerMatches({
	    player: playerTag,
	    modes: "arena",
	    start: start,
	    count: count
	}).then(function(data) {
		this.parseMatchBatch(data,playerTag);
		//setTimeout(this.parseGameMatches.bind(this),25000,data,playerTag);
	}.bind(this))
	.catch(function(error) {
		console.log(error);
		console.log("previous error for player "+playerTag);
		console.log(data);
	});
};

HaloStats.prototype.parseGameMatches = function(matchData,playerTag) {
	for(var i = 0; i < matchData.Results.length; i++) {
		var match = matchData.Results[i];
		console.log(match.Id.MatchId+"|"+match.Id.GameMode+"|"+this.swatVariants[match.GameVariant.ResourceId]);
	}
}

HaloStats.prototype.parseMatchBatch = function(matchData,playerTag) {
	var syncDone = (matchData.Results.length == 0);
	//console.log("entered parseMatchBatch");
			
	for(var i = 0; i < matchData.Results.length; i++) {
		if(this.hasMatch(matchData.Results[i],playerTag)) {
			console.log("has match "+matchData.Results[i].Id);
			syncDone = true;
			break;
		}
		this.addMatch(matchData.Results[i],playerTag);

		this.threads++;
		this.h5.metadata.gameVariantById(matchData.Results[i].GameVariant.ResourceId)
		    .then(function (gameVariant) {
		        this.swatVariants[gameVariant.id] = gameVariant.name;
		        this.threads--;
		    }.bind(this));
	}
	this.threads--;
	if(!syncDone) {
		//console.log(this.threads);
		this.getMatchBatch(playerTag,this.players[playerTag].syncSpot+=25,25);
	}
	else {
		this.players[playerTag].syncSpot = -1;
	}
};

HaloStats.prototype.hasMatch = function(match,playerTag) {
	var player = match.Players[0];
	return !!this.players[playerTag].matches[match.Id.MatchId];
}

HaloStats.prototype.addMatch = function(match,playerTag) {
	var player = match.Players[0];
	this.players[playerTag].matches[match.Id.MatchId] = {
		MatchId : match.Id.MatchId,
		SeasonId : match.SeasonId,
		HopperId : match.HopperId,
		MapId : match.MapId,
		GameVariantId : match.GameVariant.ResourceId,
		MatchDuration : match.MatchDuration,
		MatchCompletedDate : match.MatchCompletedDate.ISO8601Date,
		Teams : {},
		TeamId : player.TeamId,
		Rank : player.Rank,
		Result : player.Result,
		TotalKills : player.TotalKills,
		TotalDeaths : player.TotalDeaths,
		TotalAssists : player.TotalAssists
	};	
	for(var t in match.Teams) {
		this.players[playerTag].matches[match.Id.MatchId].Teams[match.Teams[t].Id] = match.Teams[t].Score;
	}
	//console.log(match.Id.MatchId);
}

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

