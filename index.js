var HaloStats = function() {
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
	
	setInterval(function(){if(this.threads == 0) {console.log(this.players); process.exit(0);}}.bind(this),100);
}

HaloStats.prototype.getPlayerURLs = function(URLFuncs) {
	this.URLIndeces = {};

	for(var func in URLFuncs) {
		this.URLIndeces[func] = 0;
		this.getNextUrl(func,URLFuncs[func])
	}
}

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
}


var haloStats = new HaloStats();

