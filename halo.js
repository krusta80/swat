var HaloStats = function() {
	this.initializeClassVariables();
	this.initializePlayerStatEngine();
	this.scanForNewMatches();
};

HaloStats.prototype.initializeClassVariables = function() {
	this.writeThreshold = 3600;
	this.secondsSinceLastWrite = 0;
	this.syncInterval = 5;
	this.threads = 0; this.seasonThreads = 1; this.isReady = false;

	this.initializeImports();
	this.initializeSWATVariables();
	this.initializePlayerVariables();
	setInterval(this.getSeasons.bind(this),this.syncInterval*1000);
}

HaloStats.prototype.initializePlayerStatEngine = function() {
	this.generateAllPlayerStats();
	this.syncAllMatches();
	setInterval(this.updateAllPlayerStats.bind(this),this.syncInterval*1000);
}

HaloStats.prototype.scanForNewMatches = function() {
	if(this.isReady = (this.hasClearQueues() && this.seasonThreads == 0)) {
		setInterval(this.syncAllMatches.bind(this),this.syncInterval*1000);
	}
	else {
		console.log(this.getQueuedMatchLength() + ' matches queued');
		setTimeout(this.scanForNewMatches.bind(this),this.syncInterval*1000);
	}
};

HaloStats.prototype.initializeImports = function() {
	this.https = require('https');
	this.util = require('util');
	this.fs = require("fs");
	this.apiKey = '61feef943ae34573aaedac21defa3ced';
	this.h5 = new (require("haloapi"))(this.apiKey);
	this.io = null;
}

HaloStats.prototype.initializeSWATVariables = function() {
	this.swatID = "2323b76a-db98-4e03-aa37-e171cfbdd1a4";
	this.swatVariants = {
							"0991c821-5e05-47a9-a5ae-70fdab11f9d0" : "SWAT",
							"e4680d6f-2980-4f4a-9f95-c6a52f54cfd4" : "SWATnums"
						};
	this.seasonNames = {career : "CAREER"}; 
	this.stats = {
						Games: {field: "Games", label: "Games"},
						Kills: {field: "Kills", label: "Kills"},
						Deaths: {field: "Deaths", label: "Deaths"},
						Assists: {field: "Assists", label: "Assists"},
						KD: {field: "KD", label: "K/D"},
						KPG: {field: "KPG", label: "KPG"},
						Headshots: {field: "TotalHeadshots", label: "Headshots"},
						HsPG: {field: "HsPG", label: "HS per Game"},
						HsPer: {field: "HsPer", label: "HS %"},
						Wins: {field: "Wins", label: "Wins"},
						Losses: {field: "Losses", label: "Losses"},
						WinPer: {field: "WinPer", label: "Win %"}
				 };
}

HaloStats.prototype.initializePlayerVariables = function() {
	this.playerTags = ["Thor1330","ILikeBlakGuys","PicturMeRollin2","ndmajor"];
	this.players = {};
	for(var i = 0; i < this.playerTags.length; i++) {
		this.players[this.playerTags[i]] = {tag : this.playerTags[i], matches : {}, syncSpot : -1, usedSeasons: {career: "career"}};	
	}
	try {this.loadJSONFiles();} catch (error){console.log("Problem reading file(s)");}
	for(var i = 0; i < this.playerTags.length; i++) {
		this.players[this.playerTags[i]].usedSeasons = {career: "career"};	
		this.players[this.playerTags[i]].statQueue = {};	
	}
	this.URLFuncs = {
		emblem : this.h5.profile.emblemImage,
		avatar : this.h5.profile.spartanImage
	};
	this.getPlayerURLs(this.URLFuncs);
}

HaloStats.prototype.generateAllPlayerStats = function() {
	for(var p in this.playerTags) {
		this.populateStatQueue(this.playerTags[p]);
		this.resetPlayerStats(this.playerTags[p]);
	}
	this.updateAllPlayerStats();
}

HaloStats.prototype.syncAllMatches = function() {
	if(this.hasClearQueues()) this.writeJSONWhenReady(this.writeThreshold);
	for(var p in this.playerTags) {
		if(this.players[this.playerTags[p]].syncSpot == -1) {
			this.syncMatches(this.playerTags[p]);	
		}
	}
	this.secondsSinceLastWrite += this.syncInterval;
}

HaloStats.prototype.hasClearQueues = function() {
	return this.getQueuedMatchLength() == 0;
}

HaloStats.prototype.getQueuedMatchLength = function() {
	var ret = 0;
	for(var p in this.playerTags) {
		ret += Object.keys(this.players[this.playerTags[p]].statQueue).length;
	}
	return ret;
}

HaloStats.prototype.updateAllPlayerStats = function() {
	for(var p in this.playerTags) {
		this.updatePlayerStats(this.playerTags[p]);
	}
}

HaloStats.prototype.populateStatQueue = function(playerTag) {
	for(var m in this.players[playerTag].matches) {
		this.players[playerTag].statQueue[m] = 2;
	}
}

HaloStats.prototype.updatePlayerStats = function(playerTag) {
	var statKeys = Object.keys(this.players[playerTag].statQueue);
	if(this.isReady && statKeys.length > 0) console.log(playerTag + " queue is size "+statKeys.length);
	for(var i in statKeys) {
		if(this.players[playerTag].statQueue[statKeys[i]] == 2) {
			this.addMatchToPlayerStats(playerTag,this.players[playerTag].matches[statKeys[i]]);	
			delete this.players[playerTag].statQueue[statKeys[i]];
		}	
	}
	this.performCalculations(playerTag);
	if(this.io) this.io.sockets.emit('match_update', {[playerTag]: this.players[playerTag].stats});
}

HaloStats.prototype.performCalculations = function(playerTag) {
	for(var s in this.players[playerTag].stats) {
		for(var i in this.players[playerTag].stats[s]) {
			this.players[playerTag].stats[s][i].KD = parseFloat(this.players[playerTag].stats[s][i].Kills/this.players[playerTag].stats[s][i].Deaths).toFixed(2);
			this.players[playerTag].stats[s][i].KPG = parseFloat(this.players[playerTag].stats[s][i].Kills/this.players[playerTag].stats[s][i].Games).toFixed(2);
			this.players[playerTag].stats[s][i].HsPG = parseFloat(this.players[playerTag].stats[s][i].TotalHeadshots/this.players[playerTag].stats[s][i].Games).toFixed(2);
			this.players[playerTag].stats[s][i].HsPer = parseFloat(this.players[playerTag].stats[s][i].TotalHeadshots/this.players[playerTag].stats[s][i].Kills*100).toFixed(2);
			this.players[playerTag].stats[s][i].WinPer = parseFloat(this.players[playerTag].stats[s][i].Wins/this.players[playerTag].stats[s][i].Games*100).toFixed(2);
		}
	}
}

HaloStats.prototype.addMatchToPlayerStats = function(playerTag,match) {
	this.addMatchToPlayerBySeason(playerTag,match,"career");
	this.players[playerTag].usedSeasons[match.SeasonId] = match.SeasonId;
	this.addMatchToPlayerBySeason(playerTag,match,match.SeasonId);
}

HaloStats.prototype.addMatchToPlayerBySeason = function(playerTag,match,season) {
	this.initializePlayerStats(playerTag,season);
	if(!this.swatVariants[match.GameVariantId]) return;
	var matchVariant = this.swatVariants[match.GameVariantId].toLowerCase();

	if(matchVariant.indexOf('swat') == 0) {
		var wins = [0,0,0,1];
		var losses = [0,1,0,0];
		this.players[playerTag].stats[season].total.Games++;
		this.players[playerTag].stats[season].total.Kills += match.TotalKills;
		this.players[playerTag].stats[season].total.Deaths += match.TotalDeaths;
		this.players[playerTag].stats[season].total.Assists += match.TotalAssists;
		this.players[playerTag].stats[season].total.Wins += wins[match.Result];
		this.players[playerTag].stats[season].total.Losses += losses[match.Result];
		this.players[playerTag].stats[season].total.TotalHeadshots += match.TotalHeadshots;
		this.players[playerTag].stats[season].total.TotalShots += match.TotalShotsFired;
		this.players[playerTag].stats[season].total.TotalLanded += match.TotalShotsLanded;
		this.players[playerTag].stats[season][matchVariant].Games++;
		this.players[playerTag].stats[season][matchVariant].Kills += match.TotalKills;
		this.players[playerTag].stats[season][matchVariant].Deaths += match.TotalDeaths;
		this.players[playerTag].stats[season][matchVariant].Assists += match.TotalAssists;
		this.players[playerTag].stats[season][matchVariant].Wins += wins[match.Result];
		this.players[playerTag].stats[season][matchVariant].Losses += losses[match.Result];
		this.players[playerTag].stats[season][matchVariant].TotalHeadshots += match.TotalHeadshots;
		this.players[playerTag].stats[season][matchVariant].TotalShots += match.TotalShotsFired;
		this.players[playerTag].stats[season][matchVariant].TotalLanded += match.TotalShotsLanded;
	}
}

HaloStats.prototype.initializePlayerStats = function(playerTag,season) {
	//console.log("season is "+this.seasons[season]);
	if(!this.players[playerTag].stats) this.players[playerTag].stats = {};
	if(!this.players[playerTag].stats[season]) {
		this.players[playerTag].stats[season] =  {
													total:{Games:0,Kills:0,Deaths:0,Assists:0,Wins:0,Losses:0,TotalHeadshots:0,TotalShots:0,TotalLanded:0},
													swat:{Games:0,Kills:0,Deaths:0,Assists:0,Wins:0,Losses:0,TotalHeadshots:0,TotalShots:0,TotalLanded:0},
													swatnums:{Games:0,Kills:0,Deaths:0,Assists:0,Wins:0,Losses:0,TotalHeadshots:0,TotalShots:0,TotalLanded:0}
												 };
	}
}

HaloStats.prototype.resetPlayerStats = function(playerTag) {
	delete this.players[playerTag].stats; 
}

HaloStats.prototype.syncMatches = function(playerTag) {
	this.players[playerTag].syncSpot = 0;
	this.getMatchBatch(playerTag,0,25);
}

HaloStats.prototype.getMatchBatch = function(playerTag,start,count) {
	//console.log("syncing " + playerTag + " at "+start);
	this.threads++;
	this.h5.stats.playerMatches({
	    player: playerTag,
	    modes: "arena",
	    start: start,
	    count: count
	}).then(function(data) {
		this.parseMatchBatch(data,playerTag);
	}.bind(this))
	.catch(function(error) {
		console.log(error.stack);
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
			
	for(var i = 0; i < matchData.Results.length; i++) {
		if(this.hasMatch(matchData.Results[i],playerTag)) {
			//console.log("has match "+matchData.Results[i].Id);
			syncDone = true;
			break;
		}
		this.addMatch(matchData.Results[i],playerTag);

		if(!this.swatVariants[matchData.Results[i].GameVariant.ResourceId]) {
			this.threads++;
			this.h5.metadata.gameVariantById(matchData.Results[i].GameVariant.ResourceId)
			    .then(function (gameVariant) {
			        this.swatVariants[gameVariant.id] = gameVariant.name;
			        this.threads--;
			    }.bind(this));	
		}
	}
	this.threads--;
	if(!syncDone) {
		this.getMatchBatch(playerTag,this.players[playerTag].syncSpot+=25,25);
	}
	else {
		this.players[playerTag].syncSpot = -1;
	}
};

HaloStats.prototype.hasMatch = function(match,playerTag) {
	return this.players[playerTag]["matches"][match.Id.MatchId] && this.players[playerTag]["matches"][match.Id.MatchId]["HopperId"];	
}

HaloStats.prototype.addMatch = function(match,playerTag) {
	var player = match.Players[0];
	if(!this.players[playerTag].matches[match.Id.MatchId]) {
		this.players[playerTag].matches[match.Id.MatchId] = {};
	}
	this.players[playerTag].matches[match.Id.MatchId].MatchId = match.Id.MatchId;
	this.players[playerTag].matches[match.Id.MatchId].SeasonId = match.SeasonId;
	this.players[playerTag].matches[match.Id.MatchId].HopperId = match.HopperId;
	this.players[playerTag].matches[match.Id.MatchId].MapId = match.MapId;
	this.players[playerTag].matches[match.Id.MatchId].GameVariantId = match.GameVariant.ResourceId;
	this.players[playerTag].matches[match.Id.MatchId].MatchDuration = match.MatchDuration;
	this.players[playerTag].matches[match.Id.MatchId].MatchCompletedDate = match.MatchCompletedDate.ISO8601Date;
	this.players[playerTag].matches[match.Id.MatchId].Teams = {};
	this.players[playerTag].matches[match.Id.MatchId].TeamId = player.TeamId;
	this.players[playerTag].matches[match.Id.MatchId].Rank = player.Rank;
	this.players[playerTag].matches[match.Id.MatchId].Result = player.Result;
	this.players[playerTag].matches[match.Id.MatchId].TotalKills = player.TotalKills;
	this.players[playerTag].matches[match.Id.MatchId].TotalDeaths = player.TotalDeaths;
	this.players[playerTag].matches[match.Id.MatchId].TotalAssists = player.TotalAssists;
	
	for(var t in match.Teams) {
		this.players[playerTag].matches[match.Id.MatchId].Teams[match.Teams[t].Id] = match.Teams[t].Score;
	}
	this.incrementMatchStatCounter(playerTag,match.Id.MatchId);
	if(!this.players[playerTag].matches[match.Id.MatchId].TotalXP) {
		this.addCarnageDetails(match.Id.MatchId);	
	}
}

HaloStats.prototype.addCarnageDetails = function(matchId) {
	this.h5.stats.arenaMatchById(matchId)
    .then(function (match) {
        this.parseCarnageDetails(match,matchId);
    }.bind(this))
    .catch(function(error) {
    	console.log(error);
    });
}

HaloStats.prototype.parseCarnageDetails = function(match,matchId) {
	for(var p in match.PlayerStats) {
		var player = match.PlayerStats[p];
		var playerTag = player.Player.Gamertag;
		if(this.players[playerTag] && !this.hasCarnage(matchId,playerTag)) {
			if(!this.players[playerTag].matches[matchId]) {
				this.players[playerTag].matches[matchId] = {};
			}
			
			var XPFields = ["PrevSpartanRank", "SpartanRank", "PrevTotalXP", "TotalXP", 
							"PlayerTimePerformanceXPAward", "PerformanceXP", "PerformanceRankXPAward"];
			for(var i in XPFields) {
				this.players[playerTag].matches[matchId][XPFields[i]] = player.XpInfo[XPFields[i]];	
			}
			this.players[playerTag].matches[matchId].PreviousCsr = player.PreviousCsr;
			this.players[playerTag].matches[matchId].CurrentCsr = player.CurrentCsr;
			this.players[playerTag].matches[matchId].MeasurementMatchesLeft = player.MeasurementMatchesLeft;
			var killFields = ["TotalHeadshots", "TotalShotsFired", "TotalShotsLanded", "TotalMeleeKills", 
							  "TotalAssassinations", "TotalGroundPoundKills", "TotalShoulderBashKills"];
			for(var i in killFields) {
				this.players[playerTag].matches[matchId][killFields[i]] = player[killFields[i]];		
			}
			this.players[playerTag].matches[matchId].Medals = {};
			for(var i in player.MedalAwards) {
				this.players[playerTag].matches[matchId].Medals[player.MedalAwards[i].MedalId] = player.MedalAwards[i].Count;
			}
			this.incrementMatchStatCounter(playerTag,matchId);
			//console.log("**** Found new match: "+matchId);
		}
	}
}

HaloStats.prototype.hasCarnage = function(matchId,playerTag) {
	return this.players[playerTag]["matches"][matchId] && this.players[playerTag]["matches"][matchId]["TotalXP"];	
}

HaloStats.prototype.incrementMatchStatCounter = function(playerTag,matchId) {
	if(!this.players[playerTag].statQueue[matchId]) this.players[playerTag].statQueue[matchId] = 0;
	this.players[playerTag].statQueue[matchId]++;
}

HaloStats.prototype.getSeasons = function() {
	
	var options = {
  		host: 'www.haloapi.com',
  		path: '/metadata/h5/metadata/seasons',
  		headers: {'Ocp-Apim-Subscription-Key': this.apiKey}
		};

	var callback = function(response) {
	  var str = '';

	  //another chunk of data has been recieved, so append it to `str`
	  response.on('data', function (chunk) {
	    str += chunk;
	  });

	  //the whole response has been recieved, so we just print it out here
	  response.on('end', function () {
	    var seasonJSON = JSON.parse(str, 'utf8');
	    var oldLen = Object.keys(this.seasonNames).length;
	    for(var i in seasonJSON) {
	    	if(seasonJSON[i].id && !this.seasonNames[seasonJSON[i].id]) {
	    		this.seasonNames[seasonJSON[i].id] = seasonJSON[i].name;
	    	}
	    }
	    if(this.seasonThreads == 1 && Object.keys(this.seasonNames).length > 1) {
	    	console.log("SEASONS LOADED");
	    	this.seasonThreads = 0;
	    }
		if(Object.keys(this.seasonNames).length > oldLen && this.io) this.io.sockets.emit('season_update', this.seasonNames);    
	  }.bind(this));
	};
	
	var client = this.https.request(options, callback.bind(this)).end();
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

HaloStats.prototype.setIO = function(io) {
	this.io = io;
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
	this.swatVariants = JSON.parse(this.fs.readFileSync('./variants.json', 'utf8'));
}

var haloStats = new HaloStats();

module.exports = haloStats;