/*
    ns4chain core functions :: https://github.com/subnetsRU/namecoin

    (c) 2017-2018 SUBNETS.RU for bitname.ru project (Moscow, Russia)
    Authors: Nikolaev Dmitry <virus@subnets.ru>, Panfilov Alexey <lehis@subnets.ru>
*/

var is_null = function ( value ){
    if ( value === undefined ){
	return 1;
    }else if ( value === null ){
	return 1;
    }else if ( value == 0 ){
	return 1;
    }else if ( value == '' ){
	return 1;
    }
 return 0;
}

var unixtime = function(){
    return parseInt(new Date().getTime()/1000);
}

var ndate = function(){
    var u = new Date();
    return sprintf("%s.%s.%s %s:%s:%s",(u.getDate() < 10 ? '0' : '') + u.getDate(),(u.getMonth() < 9 ? '0' : '') + (u.getMonth() + 1),u.getFullYear(),(u.getHours() < 10 ? '0' : '') + u.getHours(),(u.getMinutes() < 10 ? '0' : '') + u.getMinutes(),(u.getSeconds() < 10 ? '0' : '') + u.getSeconds());
}

var myConsole = function( obj ){
	var time = ndate();
	var options = {
	    level: 'none',
	    text: '',
	    obj: '',
	}

	if( !is_null( obj ) && typeof obj == 'object' ){
	    if( !is_null( obj.level ) ){
		options.level = obj.level;
	    }
	    if( !is_null( obj.text ) ){
		options.text = obj.text;
	    }
	    if( !is_null( obj.obj ) ){
		options.obj = obj.obj;
	    }
	}
	if( options.level == 'error' ){
	    console.error( '['+time+'] [ERROR]: ' + options.text, options.obj );
	}else if( options.level == 'warn' ){
	    if ( config.DEBUG == 2 || config.DEBUG == 3 ){
		console.warn('['+time+'] [WARN]: '+ options.text, options.obj );
	    }
	}else if( options.level == 'info' ){
	    if ( config.DEBUG == 2 || config.DEBUG == 3 ){
		console.info('['+time+'] [INFO]: ' + options.text, options.obj );
	    }
	}else if( options.level == 'debug' ){
	    if ( config.DEBUG == 2 || config.DEBUG == 3 ){
		console.info('['+time+'] [DEBUG]: ' + options.text, options.obj );
	    }
	}else{
	    console.log( '['+time+'] ' + options.text, options.obj );
	}
	if (config.DEBUG == 1 || config.DEBUG == 3){
	    sys.logg(options.text);
	    sys.logg(options.obj);
	}
}

var logg = function ( data ){
    var u = new Date();
    var logName = sprintf("%s-%s-%s.server.log",u.getFullYear(),(u.getMonth() < 9 ? '0' : '') + (u.getMonth() + 1),(u.getDate() < 10 ? '0' : '') + u.getDate());
    var path = __dirname + '/' + config.logDir + '/' + logName;

    if ( data !== undefined && data !='' ){
	var text ='[' + sys.ndate() + '] ';
	text +=  util.inspect(data, { showHidden: true, depth: 2, colors: false });
	var buffer = new Buffer(text+'\n');
	fs.open(path, 'a+', function(err, fd) {
	    if (err) {
		//throw 'error opening file: ' + err;
		sys.console({level: 'error', text: sprintf('Can`t open file %s for writing (file: %s, line: %s)',path,__file,__line)});
	    }
	    fs.write(fd, buffer, 0, buffer.length, null, function(err) {
		//if (err) throw 'error writing file: ' + err;
		if (err){
		    sys.console({level: 'error', text: sprintf('Can`t open write to file %s (file: %s, line: %s)',path,__file,__line)});
		}
		fs.close(fd, function() { })
	    });
	});
    }
}

var cloneObj = function( obj ) {
    var ret = {}; 
    for ( var k in obj ){
	ret[k] = obj[k];
    }
 return ret; 
}
function IsJsonString(str) {
    try {
	JSON.parse(str);
    } catch (e) {
	return false;
    }
 return true;
}

var antiddos = function( ){
    if (!sys.is_null(config.antiddos)){
	configFile = __dirname + '/' + config.antiddos;
	if (is_null(configFile)){
	    sys.console({level: 'warn', text: sprintf('antiddos: file unknown: %s (file: %s, line: %s)',configFile,__file,__line) });
	}else{
	    fs.stat( configFile, function( err, stat ){
		if (err){
		    sys.console({level: 'error', text: sprintf('antiddos: Can`t open file %s (file: %s, line: %s)',configFile,__file,__line), obj: err });
		}else{
		    fs.readFile( configFile, 'utf8', function( err, data ){
			if (err){
			    sys.console({level: 'error', text: sprintf('antiddos: Can`t open file %s',configFile,__file,__line), obj: err });
			}else{
			    antiddoslist = [];
			    str = data.split('\n');
			    for(var i = 0; i < str.length; i++){
				if (!is_null(str[i].trim())){
				    antiddoslist.push(str[i].trim());
				}
			    }
			}
		    });
		}
	    });
	}
    }else{
	sys.console({level: 'warn', text: sprintf('antiddos: file not set (file: %s, line: %s)',__file,__line) });
    }
}

var in_array = function(val,array) {
    if (typeof array === 'object'){
	for(var i = 0, l = array.length; i < l; i++){
	    if(array[i] == val) {
		return true;
	    }
	}
    }else{
	sys.console({level: 'error', text: sprintf('in_array: param array is not an object %s (file: %s, line: %s)',array,__file,__line) });
    }
 return false;
}

var equal_objects = function( x, y ) {
  if ( x === y ) return true;
    // if both x and y are null or undefined and exactly the same

  if ( ! ( x instanceof Object ) || ! ( y instanceof Object ) ) return false;
    // if they are not strictly equal, they both need to be Objects

  if ( x.constructor !== y.constructor ) return false;
    // they must have the exact same prototype chain, the closest we can do is
    // test there constructor.

  for ( var p in x ) {
    if ( ! x.hasOwnProperty( p ) ) continue;
      // other properties were tested using x.constructor === y.constructor

    if ( ! y.hasOwnProperty( p ) ) return false;
      // allows to compare x[ p ] and y[ p ] when set to undefined

    if ( x[ p ] === y[ p ] ) continue;
      // if they have the same strict value or identity then they are equal

    if ( typeof( x[ p ] ) !== "object" ) return false;
      // Numbers, Strings, Functions, Booleans must be strictly equal

    if ( ! Object.equals( x[ p ],  y[ p ] ) ) return false;
      // Objects and Arrays must be tested recursively
  }

  for ( p in y ) {
    if ( y.hasOwnProperty( p ) && ! x.hasOwnProperty( p ) ) return false;
      // allows x[ p ] to be set to undefined
  }
  return true;
}

var ip_vs_net = function( ip, net){
    if (!is_null(ip) && !is_null(net)){
	if (typeof net == 'string'){
	    net = [ net ];
	}

	for (var index in net){
	    if (!sys.is_null(net[index])){
		if (!sys.is_null(inSubnet.Auto(ip,net[index]))){
		    return true;
		}
	    }
	}
    }
 return false;
}

var exit = function( code ){
    if (is_null(code)){
	code = 0;
    }
    sys.console({level: 'info', text: sprintf('Exiting... (file: %s, line: %s)',__file,__line)});
    if (typeof dns === 'object'){
	sys.console({level: 'debug', text: sprintf('Stoping DNS server %j (file: %s, line: %s)',dns.address(),__file,__line)});
	dns.close();
    }
    process.exit( code );
}

var strtoupper = function( str ) {
    return str.toUpperCase();
}

var strtolower = function( str ) {
    return str.toLowerCase();
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
    https://stackoverflow.com/questions/11386492/accessing-line-number-in-v8-javascript-chrome-node-js
    https://stackoverflow.com/questions/13591785/does-node-js-have-anything-like-file-and-line-like-the-c-preprocessor
*/

Object.defineProperty(global, '__stack', {
  get: function(){
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack){ return stack; };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  }
});

Object.defineProperty(global, '__file', {
  get: function(){
    return __stack[1].getFileName().split('/').slice(-1)[0];
  }
});

Object.defineProperty(global, '__line', {
  get: function(){
    return __stack[1].getLineNumber();
  }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
    https://habrahabr.ru/post/217901/
    module.exports.<FUNCTION NAME AFTER EXPORT> = <FUNCTION NAME HERE>;
*/

module.exports.is_null = is_null;
module.exports.console = myConsole;
module.exports.cloneObj = cloneObj;
module.exports.unixtime = unixtime;
module.exports.ndate = ndate;
module.exports.logg = logg;
module.exports.IsJsonString = IsJsonString;
module.exports.antiddos = antiddos;
module.exports.in_array = in_array;
module.exports.equal_objects = equal_objects;
module.exports.ip_vs_net = ip_vs_net;
module.exports.exit = exit;
module.exports.strtoupper = strtoupper;
module.exports.strtolower = strtolower;
