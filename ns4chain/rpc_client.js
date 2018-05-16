#!/usr/bin/env node
/*
    RPC client for ns4chain :: https://github.com/subnetsRU/namecoin

    (c) 2017-2018 SUBNETS.RU for bitname.ru project (Moscow, Russia)
    Authors: Nikolaev Dmitry <virus@subnets.ru>, Panfilov Alexey <lehis@subnets.ru>
*/

var jsonRPC = require('json-rpc2');
var RPCconf = config.rpc;
var namecoin = (!sys.is_null(RPCconf.namecoin) ? RPCconf.namecoin : {});
var emercoin = (!sys.is_null(RPCconf.emercoin) ? RPCconf.emercoin : {});

var namecoinRPC = null;
var emercoinRPC = null;

try {
    if (sys.is_null(namecoin.host)){
	throw new Error(sprintf('RPC namecoin host is unknown (file: %s, line: %s)',__file,__line));
    }
    if (sys.is_null(namecoin.port)){
	throw new Error(sprintf('RPC namecoin port is unknown (file: %s, line: %s)',__file,__line));
    }
    if (sys.is_null(namecoin.user)){
	throw new Error(sprintf('RPC namecoin user is unknown (file: %s, line: %s)',__file,__line));
    }
    if (sys.is_null(namecoin.pass)){
	throw new Error(sprintf('RPC namecoin pass is unknown (file: %s, line: %s)',__file,__line));
    }
    if (!sys.is_null(namecoin.enabled)){
	namecoinRPC = jsonRPC.Client.$create(namecoin.port, namecoin.host, namecoin.user, namecoin.pass);
    }

    if (sys.is_null(emercoin.host)){
	throw new Error(sprintf('RPC emercoin host is unknown (file: %s, line: %s)',__file,__line));
    }
    if (sys.is_null(emercoin.port)){
	throw new Error(sprintf('RPC emercoin port is unknown (file: %s, line: %s)',__file,__line));
    }
    if (sys.is_null(emercoin.user)){
	throw new Error(sprintf('RPC emercoin user is unknown (file: %s, line: %s)',__file,__line));
    }
    if (sys.is_null(emercoin.pass)){
	throw new Error(sprintf('RPC emercoin pass is unknown (file: %s, line: %s)',__file,__line));
    }
    if (!sys.is_null(emercoin.enabled)){
	emercoinRPC = jsonRPC.Client.$create(emercoin.port, emercoin.host, emercoin.user, emercoin.pass);
    }
    
    if (sys.is_null(namecoin.enabled) && sys.is_null(emercoin.enabled)){
	throw new Error(sprintf('All RPC are disabled by configuration (file: %s, line: %s)',__file,__line));
    }
}
catch( e ){
    sys.console({level: 'error', text: sprintf('RPC client failed (file: %s, line: %s)',__file,__line),obj: e});
    //sys.exit(1);
}

rpc = {};

rpc.lookup = function ( obj ){
    var res = obj;
    var rpcClient = null;
    var name = null;
    res.error = null;

    sys.console({ level: 'debug', text: sprintf('rpc.lookup start (file: %s, line: %s)',__file,__line), obj: obj });
    if( typeof( obj.callback ) !== 'function'){
	res.error = sprintf('rpc.lookup: Callback function not set (file: %s, line: %s)',__file,__line);
	res.errorCode = 'SERVFAIL';
    }

    if (sys.is_null(obj.rpc)){
	res.error = sprintf('rpc.lookup: dont know which PRC to use (file: %s, line: %s)',__file,__line);
	res.errorCode = 'SERVFAIL';
    }

    if (sys.is_null(res.error)){
	if (obj.rpc == 'namecoin'){
	    if (sys.is_null(namecoinRPC) || sys.is_null(namecoinRPC.call)){
		res.error = sprintf('rpc.lookup: start of namecoinRPC failed (file: %s, line: %s)',__file,__line);
		res.errorCode = 'SERVFAIL';
	    }else{
		rpcClient = namecoinRPC;
	    }
	}else if(obj.rpc == 'emercoin'){
	    if (sys.is_null(emercoinRPC) || sys.is_null(emercoinRPC.call)){
		res.error = sprintf('rpc.lookup: start of emercoinRPC failed (file: %s, line: %s)',__file,__line);
		res.errorCode = 'SERVFAIL';
	    }else{
		rpcClient = emercoinRPC;
	    }
	}
    }

    if (sys.is_null(res.error)){
	if (sys.is_null(obj.name)){
	    res.error = sprintf('rpc.lookup: domain name is not set (file: %s, line: %s)',__file,__line);
	    res.errorCode = 'FORMERR';	//see node_modules/native-dns-packet/consts.js NAME_TO_RCODE
	}else{
	    if (obj.rpc == 'namecoin'){
		name = 'd/'+obj.name;
	    }else if(obj.rpc == 'emercoin'){
		name = sprintf('dns:%s.%s',obj.name,obj.zone);
	    }
	}
    }

    if (sys.is_null(res.error)){
	rpcClient.call('name_show', [name], function(err, chainData) {
	    sys.console({level: 'debug', text: sprintf('%s rpc.lookup->rpcClient.call(name_show, [%s]) (file: %s, line: %s)',obj.rpc,name,__file,__line), obj: chainData});
	    if (sys.is_null(err)){
		res.chainData = chainData;
	    }else{
		//Error: "500"{"result":null,"error":{"code":-4,"message":"failed to read from name DB"},"id":1}
		res.error = sprintf('rpc.lookup (file: %s, line: %s): ',__file,__line,err);
		var regexp = /^Error:\s"(\d+)"(.*)/gi;
		match = regexp.exec(err);
		if (!sys.is_null(match[2])){
		    try {
			var e = JSON.parse(match[2]);
			res.error =  sprintf('%s rpc.lookup: code %s: %s (file: %s, line: %s)',obj.rpc,e.error.code,e.error.message,__file,__line);
			if (e.error.code == '-4'){
			    res.errorCode = 'NOTFOUND';
			}
		    }
		    catch( e ){
			sys.console({level: 'error', text: sprintf('%s (file: %s, line: %s)',res.error,__file,__line)});
		    }
		}
	    }
	    obj.callback(res);
	});
    }else{
	obj.callback(res);
    }
}

/*
client.call('getinfo', [], function(err, result) {
    console.log('Got error:',err);
    console.log('Result',result);
});
*/

module.exports = rpc;