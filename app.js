var express = require( 'express' );
var morgan = require('morgan');
var swig = require('swig');
var app = express(); // creates an instance of an express application
var bodyParser = require('body-parser');
var routes = require('./routes/');	
var socketio = require('socket.io');

var port = 3000;
var indexView = "";

// create application/json parser
var jsonParser = bodyParser.json()

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
swig.setDefaults({ cache: false });

app.use(express.static('public'));

app.use(morgan('combined'));

var server = app.listen(port, function() {
	console.log("Twitter is running on port "+port);
}); 

var io = socketio.listen(server);

app.use('/', urlencodedParser, routes(io));		//	route all requests to our routing module
