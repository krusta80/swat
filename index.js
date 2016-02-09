var HaloStats = function() {
	this.h5 = new (require("haloapi"))('61feef943ae34573aaedac21defa3ced');
	this.players = {};
	this.playerTags = ["Thor1330","ILikeBlakGuys","PicturMeRollin2","NDmajor"];
	this.URLFuncs = {
						emblem : this.getNextEmblemUrl,
						avatar : this.getNextAvatarUrl,
					};
	
	for(var i = 0; i < this.playerTags.length; i++) {
		this.players[this.playerTags[i]] = {tag : this.playerTags[i]};
	}
	this.getPlayerURLs(this.URLFuncs);
	
}

HaloStats.prototype.getPlayerURLs = function(URLFuncs) {
	this.URLIndeces = {};
	for(var func in URLFuncs) {
		this.URLIndeces[func] = 0;
		URLFuncs[func].call(this,func);
	}
}

HaloStats.prototype.getNextEmblemUrl = function(thisType) {
	var URLIndex = this.URLIndeces[thisType];
	if(URLIndex == this.playerTags.length) {
		return;
	}
	var player = this.playerTags[URLIndex];
	this.h5.profile.emblemImage(player).then(function (url) { 
		    this.players[player][thisType] = url;
		 	console.log(thisType + " -> " + url);
		 	this.URLIndeces[thisType]++;
		 	this.getNextEmblemUrl(thisType);
	}.bind(this));
}

HaloStats.prototype.getNextAvatarUrl = function(thisType) {
	var URLIndex = this.URLIndeces[thisType];
	if(URLIndex == this.playerTags.length) {
		return;
	}
	var player = this.playerTags[URLIndex];
	this.h5.profile.spartanImage(player).then(function (url) { 
		    this.players[player][thisType] = url;
		 	console.log(thisType + " -> " + url);
		 	this.URLIndeces[thisType]++;
		 	this.getNextAvatarUrl(thisType);
	}.bind(this));
}


var haloStats = new HaloStats();


/**h5.metadata.weapons().then(function (weapons) {
    weapons.forEach(function (weapon) {
        console.log(weapon.name, '\n\t', weapon.description);
    });
});

h5.stats.playerMatches({
    player: "thor1330",
    mode: "arena,swat",
    start: 700,
    count: 25
}).then(function (data) {
        data.Results.forEach(function (match) {
            var date = new Date(match.MatchCompletedDate.ISO8601Date);
            //onsole.log(match); 
	    console.log("Match Completed on " + date.toDateString() + "("+match.MatchCompletedDate.ISO8601Date+")");
        })
    });
*/