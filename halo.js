var HaloStats = function() {
	this.https = require('https');
	this.util = require('util');
	this.fs = require("fs");
	this.apiKey = '61feef943ae34573aaedac21defa3ced';
	this.h5 = new (require("haloapi"))(this.apiKey);
	this.io = null;
	
	this.swatID = "2323b76a-db98-4e03-aa37-e171cfbdd1a4";
	this.swatVariants = {
							"0991c821-5e05-47a9-a5ae-70fdab11f9d0" : "SWAT",
							"e4680d6f-2980-4f4a-9f95-c6a52f54cfd4" : "SWATnums"
						};
	this.seasonNames = {career : "CAREER"}; 
	this.secondsSinceLastWrite = 0;
	this.threads = 0;

	this.stats = {
						Games: {field: "Games", label: "Games"},
						Kills: {field: "Kills", label: "Kills"},
						Deaths: {field: "Deaths", label: "Deaths"},
						Assists: {field: "Assists", label: "Assists"},
						KD: {field: "KD", label: "K/D"},
						KPG: {field: "KPG", label: "KPG"},
						Headshots: {field: "Headshots", label: "Headshots"},
						HsPG: {field: "HsPG", label: "HS per Game"},
						HsPer: {field: "HsPer", label: "HS %"},
						Wins: {field: "Wins", label: "Wins"},
						Losses: {field: "Losses", label: "Losses"},
						WinPer: {field: "WinPer", label: "Win %"}
				 };

	this.playerTags = ["Thor1330","ILikeBlakGuys","PicturMeRollin2","ndmajor"];
	this.players = {};
	for(var i = 0; i < this.playerTags.length; i++) {
		this.players[this.playerTags[i]] = {tag : this.playerTags[i], matches : {}, syncSpot : -1, usedSeasons: {career: "career"}};	
	}
	setInterval(this.getSeasons.bind(this),5000);
	
	try {
		this.loadJSONFiles();	
	}
	catch (error){
		console.log("Problem reading file(s)");
	}
	
	for(var i = 0; i < this.playerTags.length; i++) {
		this.players[this.playerTags[i]].usedSeasons = {career: "career"};	
		this.players[this.playerTags[i]].statQueue = [];	
		this.players[this.playerTags[i]].ioQueue = [];	
	}

	this.URLFuncs = {
						emblem : this.h5.profile.emblemImage,
						avatar : this.h5.profile.spartanImage
					};
	this.getPlayerURLs(this.URLFuncs);
	this.syncAllMatches();
	setInterval(this.syncAllMatches.bind(this),5000);
	//setInterval(function(){if(this.threads == 0) {console.log(this.util.inspect(this.players,false,null)); process.exit();}}.bind(this),100);
	//this.h5.metadata.csrDesignations().then(console.log);
};

HaloStats.prototype.syncAllMatches = function() {
	//this.writeJSONWhenReady(3600);
	for(var p in this.playerTags) {
		if(this.players[this.playerTags[p]].syncSpot == -1) {
			this.updatePlayerStats(this.playerTags[p]);
			this.syncMatches(this.playerTags[p]);	
		}
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
	this.swatVariants = JSON.parse(this.fs.readFileSync('./variants.json', 'utf8'));
}

HaloStats.prototype.updatePlayerStats = function(playerTag) {
	this.resetPlayerStats(playerTag);
	for(var m in this.players[playerTag].matches) {
		this.addMatchToPlayerStats(playerTag,this.players[playerTag].matches[m]);
	}
	this.performCalculations(playerTag);
}

HaloStats.prototype.performCalculations = function(playerTag) {
	for(var s in this.players[playerTag].stats) {
		for(var i in this.players[playerTag].stats[s]) {
			this.players[playerTag].stats[s][i].KD = parseFloat(this.players[playerTag].stats[s][i].Kills/this.players[playerTag].stats[s][i].Deaths).toFixed(2);
			this.players[playerTag].stats[s][i].KPG = parseFloat(this.players[playerTag].stats[s][i].Kills/this.players[playerTag].stats[s][i].Games).toFixed(2);
			this.players[playerTag].stats[s][i].HsPG = parseFloat(this.players[playerTag].stats[s][i].Headshots/this.players[playerTag].stats[s][i].Games).toFixed(2);
			this.players[playerTag].stats[s][i].HsPer = parseFloat(this.players[playerTag].stats[s][i].Headshots/this.players[playerTag].stats[s][i].Kills*100).toFixed(2);
			this.players[playerTag].stats[s][i].WinPer = parseFloat(this.players[playerTag].stats[s][i].Wins/this.players[playerTag].stats[s][i].Games*100).toFixed(2);
		}
	}
}

HaloStats.prototype.addMatchToPlayerStats = function(playerTag,match) {
	this.addMatchToPlayerBySeason(playerTag,match,"career");
	this.players[playerTag].usedSeasons[match.SeasonId] = match.SeasonId;
	this.addMatchToPlayerBySeason(playerTag,match,match.SeasonId);
	
	if(this.players[playerTag].ioQueue.length > 0) {
		this.players[playerTag].ioQueue.shift();
		if(this.io) this.io.sockets.emit('match_update', {[playerTag]: this.players[playerTag].stats});
	}

	if(this.players[playerTag].statQueue.length > 0) {
		this.players[playerTag].ioQueue.push(this.players[playerTag].statQueue.shift());	
	}	
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
		this.players[playerTag].stats[season].total.Headshots += match.TotalHeadshots;
		this.players[playerTag].stats[season].total.TotalShots += match.TotalShotsFired;
		this.players[playerTag].stats[season].total.TotalLanded += match.TotalShotsLanded;
		this.players[playerTag].stats[season][matchVariant].Games++;
		this.players[playerTag].stats[season][matchVariant].Kills += match.TotalKills;
		this.players[playerTag].stats[season][matchVariant].Deaths += match.TotalDeaths;
		this.players[playerTag].stats[season][matchVariant].Assists += match.TotalAssists;
		this.players[playerTag].stats[season][matchVariant].Wins += wins[match.Result];
		this.players[playerTag].stats[season][matchVariant].Losses += losses[match.Result];
		this.players[playerTag].stats[season][matchVariant].Headshots += match.TotalHeadshots;
		this.players[playerTag].stats[season][matchVariant].TotalShots += match.TotalShotsFired;
		this.players[playerTag].stats[season][matchVariant].TotalLanded += match.TotalShotsLanded;
	}
}

HaloStats.prototype.initializePlayerStats = function(playerTag,season) {
	//console.log("season is "+this.seasons[season]);
	if(!this.players[playerTag].stats) this.players[playerTag].stats = {};
	if(!this.players[playerTag].stats[season]) {
		this.players[playerTag].stats[season] =  {
													total:{Games:0,Kills:0,Deaths:0,Assists:0,Wins:0,Losses:0,Headshots:0,TotalShots:0,TotalLanded:0},
													swat:{Games:0,Kills:0,Deaths:0,Assists:0,Wins:0,Losses:0,Headshots:0,TotalShots:0,TotalLanded:0},
													swatnums:{Games:0,Kills:0,Deaths:0,Assists:0,Wins:0,Losses:0,Headshots:0,TotalShots:0,TotalLanded:0}
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
		//console.log(this.threads);
		this.getMatchBatch(playerTag,this.players[playerTag].syncSpot+=25,25);
	}
	else {
		this.players[playerTag].syncSpot = -1;
	}
};

HaloStats.prototype.hasMatch = function(match,playerTag) {
	var player = match.Players[0];
	return this.players[playerTag].matches[match.Id.MatchId] && this.players[playerTag].matches[match.Id.MatchId].HopperId;
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
		if(this.players[playerTag]) {
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
			this.players[playerTag].statQueue.push(matchId);
			console.log("**** Found new match: "+matchId);
		}
	}
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
	    for(var i in seasonJSON) {
	    	this.seasonNames[seasonJSON[i].id] = seasonJSON[i].name;
	    }
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

var haloStats = new HaloStats();

module.exports = haloStats;