#!/usr/bin/env node
/*
    ns4chain functions :: https://github.com/subnetsRU/blockchain/tree/master/ns4chain
    
    (c) 2017-2018 SUBNETS.RU for bitname.ru project (Moscow, Russia)
    Authors: Nikolaev Dmitry <virus@subnets.ru>, Panfilov Alexey <lehis@subnets.ru>

 This program is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 3 of the License

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 SUCH DAMAGE.
*/

ns4chain = {};

ns4chain.dns_serv_help = function(){
    var helpText = '\n';
    helpText += 'Usage: node '+process.mainModule.filename+' [options]\n';
    helpText += 'Options:\n';
    helpText +='\t-h, --help                              This help;\n';
    helpText +='\t-d, --debug <none|log|cli|full>         Enable/disable debug and logging;\n';
    helpText +='\t-l, --listen <IP>                       IP to listen on;\n';
    helpText += '\t-p, --port <PORT>                       Port to listen to;\n'
    helpText += '\t-t, --ttl <NUMBER>                      Set this TTL in reply;\n'
    helpText += '\t-r, --recursion                         Enable recursive queries;\n'
    sys.console({level: 'info', text: helpText});
    sys.exit(0);
}

ns4chain.recursive = function( obj ){
    try{
	sys.console({level: 'debug', text: sprintf('Perform recursive request (file: %s, line: %s)',__file,__line)});
	ns4chain.oldResolver({
	    name: obj.domain,
	    res: {
		response: obj.response,
		domain: obj.domain,
		type: obj.type,
		class: obj.class,
		ns4chain: [],
	    },
	    callback: function( res ){
		if (sys.is_null(res.error)){
		    sys.console({level: 'info', text: sprintf('Form recursive reply for [%s]\nreply: %j%s%s%s (file: %s, line: %s)',res.domain,res.ns4chain,(!sys.is_null(res.response.authority) ? sprintf('\nauthority: %j',res.response.authority) : ''),(!sys.is_null(res.response.additional) ? sprintf('\nadditional: %j',res.response.additional) : ''),(!sys.is_null(res.response.edns_options) ? sprintf('\nedns_options: %j',res.response.edns_options) : ''),__file,__line)});
		    if (!sys.is_null(res.ns4chain) && typeof res.ns4chain == 'object'){
			for (var index in res.ns4chain){
			    var tmp = res.ns4chain[index];
			    if (!sys.is_null(tmp.type)){
				if (typeof dnsSource[dnsSource.consts.QTYPE_TO_NAME[tmp.type]] == 'function'){
				    res.response.answer.push(
					dnsSource[dnsSource.consts.QTYPE_TO_NAME[tmp.type]](tmp)
				    );
				}
			    }
			}
		    }else{
			res.error = sprintf('ns4chain.recursive: Unknown data for the reply (file: %s, line: %s)',__file,__line);
		    }
		}

		if (!sys.is_null(res.error)){
		    sys.console({level: 'error', text: sprintf('%s (file: %s, line: %s)',res.error,__file,__line) });
		    res.response.answer = [];
		    if (sys.is_null(res.errorCode)){
			res.response.header.rcode = dnsSource.consts.NAME_TO_RCODE.SERVFAIL;
		    }else{
			res.response.header.rcode = dnsSource.consts.NAME_TO_RCODE[res.errorCode];
		    }
		}

		try {
		    res.response.send();
		}
		catch(e){
		    sys.console({level: 'error',text: sprintf('ns4chain.recursive: Error on reply occurred (file: %s, line: %s) => ',__file,__line), obj: e});
		}
	    }
	});
    }
    catch(e){
	sys.console({level: 'error', text: sprintf('ns4chain request failed (file: %s, line: %s)',__file,__line), obj: obj});
    }
}

ns4chain.request = function( obj ){
    try{
	    obj.response.header.aa = 1;		//authoritative answer for chain
	    var request = {
		response: obj.response,
		domain: obj.domain,
		type: obj.type,
		name: obj.name,
		zone: obj.zone,
		sld: obj.sld,
		subDomain: obj.subDomain,
		rpc: obj.rpc,
		service: obj.service,
		class: obj.class,
		callback: function( res ){
		    zoneData = {};
		    if (sys.is_null(res.error)){
			ns4chain.rpcData( { res: res, callback: this.ns4chainResponse } );
		    }else{
			sys.console({level: 'error', text: sprintf('%s (file: %s, line: %s)',res.error,__file,__line) });
			if (sys.is_null(res.errorCode)){
			    res.response.header.rcode = dnsSource.consts.NAME_TO_RCODE.SERVFAIL;
			}else{
			    res.response.header.rcode = dnsSource.consts.NAME_TO_RCODE[res.errorCode];
			}
			try {
			    res.response.send();
			}
			catch(e){
			    sys.console({level: 'error',text: sprintf('ns4chain.request: Error on reply occurred (file: %s, line: %s) => ',__file,__line), obj: e});
			}
		    }
		},
		ns4chainResponse: function( res ){
			if (sys.is_null(res.response) || typeof res.response != 'object'){
			    res.response = {
				header: null,
				answer: [],
				authority: [],
				additional: [],
			    };
			    if (sys.in_null(res.errorCode)){
				res.errorCode = 'SERVFAIL';
			    }
			}

			if (!sys.is_null(res.ns4chain) && typeof res.ns4chain == 'object'){
			    for (var index in res.ns4chain){
				var tmp = res.ns4chain[index];
				if (!sys.is_null(tmp.type)){
				    if (typeof dnsSource[dnsSource.consts.QTYPE_TO_NAME[tmp.type]] == 'function'){
					res.response.answer.push(
					    dnsSource[dnsSource.consts.QTYPE_TO_NAME[tmp.type]](tmp)
					);
				    }
				}
			    }
			    if ((/^CNAME$/.test(res.type))){
				ns4chain.addAuthority({res: res, name: res.sld, data: config.dnsName, address: dns.address().address});
			    }
			}

			if (sys.is_null(res.error)){
				if (sys.is_null(res.response) || sys.is_null(res.response.answer) || res.response.answer.length == 0){
				    if ((/^(A|AAAA)$/.test(res.type))){
					res.error = sprintf('domain "%s" has no IP (file: %s, line: %s)',res.domain,__file,__line);
					res.errorCode = 'NOTFOUND';
				    }else{
					if ((/^SOA$/.test(res.type))){ 
					    if (sys.is_null(res.response.answer)){
						ns4chain.addSOA({res: res, name: res.sld, where: 'answer'});
					    }
					}else if ((/^(CNAME|MX|NS)$/.test(res.type))){ 
					    ns4chain.addSOA({res: res, name: res.sld, where: 'authority'});
					}else{
					    //res.error = 'No data for the reply...';
					}
				    }
				}
			}

			if (!sys.is_null(res.error)){
			    if ((/^(MX|SRV|NS)$/.test(res.type))){ 
				ns4chain.addSOA({res: res, name: res.sld});
			    }
			    sys.console({level: 'error', text: res.error });
			    if (sys.is_null(res.errorCode)){
				res.response.header.rcode = dnsSource.consts.NAME_TO_RCODE.SERVFAIL;
			    }else{
				res.response.header.rcode = dnsSource.consts.NAME_TO_RCODE[res.errorCode];
			    }
			}

			if (!sys.is_null(res.response.header.aa) && res.response.header.aa == 1){
			    if (!sys.is_null(res.response.authority) || res.response.authority.length == 0){
				ns4chain.addAuthority({res: res, name: res.sld, data: config.dnsName, address: dns.address().address});
			    }
			}

			sys.console({level: 'info', text: sprintf('Form reply for [%s]\nreply: %j%s%s%s (file: %s, line: %s)',res.domain,res.ns4chain,(!sys.is_null(res.response.authority) ? sprintf('\nauthority: %j',res.response.authority) : ''),(!sys.is_null(res.response.additional) ? sprintf('\nadditional: %j',res.response.additional) : ''),(!sys.is_null(res.response.edns_options) ? sprintf('\nedns_options: %j',res.response.edns_options) : ''),__file,__line)});
			try {
			    res.response.send();
			}
			catch(e){
			    sys.console({level: 'error',text: sprintf('Error on reply occurred  (file: %s, line: %s) => ',__file,__line), obj: e});
			    res.response.answer = [];
			    res.response.header.rcode = dnsSource.consts.NAME_TO_RCODE.SERVFAIL;
			    try {
				res.response.send();
			    }
			    catch(e){
				sys.console({level: 'error',text: sprintf('Send info about error failed (file: %s, line: %s) => ',__file,__line), obj: e});
			    }
			}
		}
	    };
	    obj.ns4chainResponse = request.ns4chainResponse;
	    if (obj.rpc == 'emercoin' && !sys.is_null(obj.subDomain)){
		request.name = obj.subDomain + '.' + obj.name;
	    }
	    rpc.lookup( request );
    }
    catch(e){
	sys.console({level: 'error', text: sprintf('ns4chain.request failed (file: %s, line: %s)',__file,__line), obj: e});
	sys.console({level: 'error', text: sprintf('obj (file: %s, line: %s)',__file,__line), obj: obj});
	obj.error = sprintf('rpc.lookup: start of rpcClient failed (file: %s, line: %s)',__file,__line);
	obj.errorCode = 'SERVFAIL';
	var ns4chainResponse = obj.ns4chainResponse;
	delete( obj.ns4chainResponse );
	ns4chainResponse( obj );
    }
}

ns4chain.rpcData = function( obj ){
    var res = obj.res;
    var chainData = res.chainData;

    if (sys.is_null(chainData.value)){
	sys.console({level: 'debug', text: sprintf('ns4chain.rpcData: chainData.value is not defined or null (file: %s, line: %s)',__file,__line)});
	res.errorCode = 'NOTFOUND';	//see node_modules/native-dns-packet/consts.js NAME_TO_RCODE
    }else{
	if (sys.is_null(res.rpc)){
	    sys.console({level: 'debug', text: sprintf('ns4chain.rpcData: RPC is unknown (file: %s, line: %s)',__file,__line)});
	    res.errorCode = 'SERVFAIL';
	}
    }

    if (sys.is_null(res.errorCode)){
	var fqdn = res.sld;
	if (res.rpc == 'sixeleven'){
	    fqdn += '.to';
	    obj.res.domain += '.to';
	}
	var subDomain = null;
	if (res.rpc == 'namecoin' || res.rpc == 'sixeleven'){
	    if (sys.IsJsonString(chainData.value) === true){
		chainData.value = JSON.parse(chainData.value);
		var tmpData = sys.cloneObj(chainData.value);
		delete tmpData.map;
		zoneData[fqdn] = tmpData;
		for (var index in chainData.value.map){
		    if (!(/^_/).test(index)){
			subDomain = index + (!sys.is_null(index) ? '.' : '') + fqdn;
			if (sys.is_null(zoneData[subDomain])){
			    zoneData[subDomain]={};
			}
			if (!sys.is_null(zoneData[subDomain])){
			    if (typeof chainData.value.map[index] == 'object'){
				for (var k in chainData.value.map[index]){
				    if (sys.is_null(k)){
					if (sys.is_null(zoneData[subDomain].ip)){
					    zoneData[subDomain].ip=chainData.value.map[index][k];
					}
				    }else{
					zoneData[subDomain][k]=chainData.value.map[index][k];
				    }
				}
			    }else if (sys.is_null(index) && typeof chainData.value.map[index] == 'string'){
				/*
				    "map": {                    // This is equivalent to "ip": "192.0.2.2"
					"ip": "192.0.2.2"         // Takes precedence
					"": {
	    				    "ip": "192.0.2.1"       // Ignored
					}
				    }
				*/
				if (sys.is_null(zoneData[subDomain].ip)){
				    zoneData[subDomain].ip = chainData.value.map[index];
				}
			    }
			}
		    }
		}
		for (var index in zoneData){
		    ns4chain.findMap.namecoin(index,zoneData,0);
		}
		sys.console({level: 'debug', text: sprintf('zoneData (file: %s, line: %s)',__file,__line), obj: zoneData});
		ns4chain.resolv.namecoin( { res: res, domain: obj.res.domain, fqdn: fqdn, callback: obj.callback } );
	    }else{
		sys.console({level: 'debug', text: sprintf('chainData.value is not defined or not JSON string (file: %s, line: %s)',__file,__line)});
	    }
	}else if( res.rpc == 'emercoin'){
	    //chainData.value = '~#A=192.168.0.123,127.0.0.1#AAAA=2607:f8b0:4004:806::1001#NS=ns1.google.com#TTL=4001';
	    //chainData.value = 'A=1.2.3.4|SD=www,gopher|NS=ns.example.com';
	    //chainData.value = 'A=1.2.3.4|SD=www,gopher|TTL=4001|TXT=aaaaaaaaa|AAAA=2607:f8b0:4004:806::1001|CNAME=google.ru';
	    //chainData.value = 'A=1.2.3.4|SD=www,gopher';
	    if (!sys.is_null(res.subDomain)){
		fqdn = res.domain;
	    }
	    zoneData[fqdn] = {};
	    var regexp = /^~(\S)/gi;
	    var match = regexp.exec(chainData.value);
	    if (!sys.is_null(match) && !sys.is_null(match[1]) ){
		chainData.value=chainData.value.replace(/^~\S/,'');
		chainData.value=chainData.value.replace(new RegExp(match[1],'ig'),'|');
	    }

	    if ((/^(A|AAAA|CNAME|NS|PTR|CNAME|MX|TXT|SD|TTL|SOA|WKS|SRV)=\S+/ig.test(chainData.value))){
		ns4chain.findMap.emercoin( fqdn, chainData.value );
	    }
	    sys.console({level: 'debug', text: sprintf('zoneData (file: %s, line: %s)',__file,__line), obj: zoneData});
	    ns4chain.resolv.emercoin( { res: res, domain: obj.res.domain, fqdn: fqdn, callback: obj.callback } );
	}
    }

    if (!sys.is_null(res.errorCode)){
	res.errorCode = 'NOTFOUND';	//see node_modules/native-dns-packet/consts.js NAME_TO_RCODE
	if (!sys.is_null(obj.callback) && typeof obj.callback === 'function'){
	    obj.callback( res );
	}else{
	    sys.console({level: 'error', text: sprintf('ns4chain.rpcData: callback is not set or not a function (file: %s, line: %s)',__file,__line), obj: obj});
	}
    }
}

ns4chain.findMap = {};
ns4chain.findMap.namecoin = function( key, obj, nn ){
    if (sys.is_null(config.maxalias) || !((/^\d+$/).test(config.maxalias))){
	config.maxalias = 16;
    }

    if (!sys.is_null(obj[key]) && !sys.is_null(obj[key].map)){
	for (var index in obj[key].map){
	    zoneData[index +'.'+key]=obj[key].map[index];
	    if (!sys.is_null(obj[key].map[index].map)){
		if (nn < config.maxalias){	//Protect endless loop and stack overflow
		    ns4chain.findMap.namecoin(index +'.'+key,zoneData,++nn);
		}
	    }
	}
    }
}

ns4chain.findMap.emercoin = function( key, value ){
    var type,record;
    var tmp1 = value.split('|');
    for (var i=0; i<tmp1.length; i++){
	tmp2 = tmp1[i].split('=');
	if (tmp2.length == 2){
	    type = null;
	    record = sys.strtoupper(tmp2[0]);
	    if (record == 'A'){
		type = 'ip';
	    }else if(record == 'AAAA'){
		type = 'ip6'
	    }else if(record == 'NS'){
		type = sys.strtolower(record);
	    }else if(record == 'MX'){
		type = sys.strtolower(record);
	    }else if(record == 'SD'){
		type = sys.strtolower(record);
	    }else if(record == 'CNAME'){
		zoneData[key].cname = tmp2[1];
	    }else if(record == 'TXT'){
		zoneData[key].txt = tmp2[1];
	    }else if(record == 'TTL'){
		if ((/^\d+$/.test(tmp2[1]))){
		    zoneData[key].ttl = tmp2[1];
		}
	    }
	    
	    if (!sys.is_null(type)){
		tmp3 = tmp2[1].split(',');
		zoneData[key][type] = [];
		tmp3.forEach(function ( v ) {
		    if (record == 'A'){
			if ((/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/).test(v)){
			    zoneData[key][type].push( v );
			}
		    }else if(record == 'AAAA'){
			if ((/^[0-9a-fA-F:]+(\/\d{1,3}){0,1}$/).test(v)){
			    zoneData[key][type].push( v );
			}
		    }else{
			zoneData[key][type].push( sys.strtolower(v) );
		    }
		});
	    }
	}
    }

    if (!sys.is_null(zoneData[key].sd) && !sys.is_null(zoneData[key].ns)){
	zoneData[key].sd.forEach(function ( v ) {
	    zoneData[v + '.' +key] = { ns: zoneData[key].ns };
	});
    }else{
//TODO: RPC request for sublevel domain
    
    }

    if (Object.keys(zoneData[key]).length > 0 && sys.is_null(zoneData[key].ttl)){
	zoneData[key].ttl = config.ttl;
    }
}

ns4chain.resolv = {};
ns4chain.resolv.namecoin = function( obj ){
    //
    // DOCS:
    //	* https://wiki.namecoin.org/index.php?title=Domain_Name_Specification
    //	* https://github.com/namecoin/proposals/blob/master/ifa-0001.md
    //

    var host = obj.domain; 
    var domain = obj.fqdn;
    var callback = obj.callback;
    var noCallback = null;
    var tmp = null;
    var stopLooking = 0;

    if (sys.is_null(config.maxalias) || !((/^\d+$/).test(config.maxalias))){
	config.maxalias = 16;
    }
    if (sys.is_null(obj.res.ns4chain)){
	obj.res.ns4chain = [];
    }
    if (sys.is_null(obj.res.zoneData)){
	obj.res.zoneData = zoneData;
    }
    if (sys.is_null(obj.loop)){
	obj.loop = 0;
    }
    obj.loop++;

    sys.console({level: 'debug', text: sprintf('#iter%d: Doing resolv %s [%s] in %s (file: %s, line: %s)',obj.loop,host,obj.res.type,domain,__file,__line)});
    if (obj.loop >= config.maxalias){
	obj.res.errorCode = 'NOTFOUND';
	obj.res.error=sprintf('Max alias reached. Stop searching, %s not found (file: %s, line: %s)',host,__file,__line);
    }

    if (sys.is_null(obj.res.error)){
	if (sys.is_null(zoneData[host]) && obj.loop == 1){
	    sys.console({level: 'debug', text: sprintf('Host %s not found, trying *.%s (file: %s, line: %s)',host,domain,__file,__line)});
	    if (!sys.is_null(zoneData['*.'+domain])){
		sys.console({level: 'debug', text: sprintf('Doing resolv %s in *.%s (file: %s, line: %s)',host,domain,__file,__line)});
		zoneData[host] = zoneData['*.'+domain];
	    }else{
		if (!sys.is_null(zoneData[domain]) && !sys.is_null(zoneData[domain].ns)){
		    if (typeof zoneData[domain].ns == 'string'){
			zoneData[domain].ns = [ zoneData[domain].ns ] ;
		    }
		    zoneData[host] = { ns: zoneData[domain].ns };
		    sys.console({level: 'debug', text:  sprintf('*.%s not found but %s have ns servers: %s (file: %s, line: %s)',domain,domain,zoneData[host].ns.join(', '),__file,__line)});
		}
	    }
	}

	if (sys.is_null(zoneData[host])){
	    obj.res.error=sprintf('Host %s not found (file: %s, line: %s)',host,__file,__line);
	    obj.res.errorCode = 'NOTFOUND';
	}
    }
    
    if (sys.is_null(obj.res.error)){
	//DNAME
	if (!sys.is_null(zoneData[host].translate)){
	    if ((/\.$/).test(zoneData[host].translate)){
		obj.res.ns4chain.push({
		    name: host,
		    type: 5,
		    class: obj.res.class,
		    data: host.replace(new RegExp(domain + '$'),zoneData[host].translate), 
		    ttl: config.ttl,
		});
		ns4chain.addAuthority({res: obj.res, name: host, data: config.dnsName, address: dns.address().address});
	    }
	    stopLooking = 1;
	}
    }

    if (!sys.is_null(zoneData[host]) && sys.is_null(zoneData[host].ns) && sys.is_null(stopLooking)){
	if (/^(MX|SRV)$/.test(obj.res.type) && sys.is_null(obj.res.error) && obj.loop == 1){
	    /*
		Service records: _service._proto.name TTL class SRV priority weight port target
		ex.: [["smtp","tcp",10,0,25,"mx"]]
		    [0] - service
		    [1] - proto
		    [2] - priority
		    [3] - weight
		    [4] - port number
		    [5] - name
	    */
	    if(!sys.is_null(zoneData[host].service)){
		if (typeof zoneData[host].service != 'object'){
		    obj.res.errorCode = 'NOTFOUND';
		    obj.res.error=sprintf('Request for SERVICE record but chain service data invalid (file: %s, line: %s)',__file,__line);
		}

		if (sys.is_null(obj.res.error)){
		    var reDomain = new RegExp('.*\.' + domain + '$');
		    var service = !sys.is_null(obj.res.service) ? obj.res.service.replace(/_/g,'').split('.') : null;
		    zoneData[host].service.forEach(function (array) {
			if (typeof array == 'object' && array.length == 6){
			    if (obj.res.type == 'MX' && array[0] == 'smtp'){
				var exchange = array[5];
				if (!(/\.$/).test(exchange)){
				    if (!exchange.match(reDomain)){
					exchange = array[5] + '.' + domain;
				    }
				}
//TODO: resolv exchange to A|AAAA
				obj.res.ns4chain.push({
				    name: host,
				    type: 15,
				    class: obj.res.class,
				    priority: (!sys.is_null(array[2]) ? array[2] : 10),
				    exchange: exchange,
				    ttl: config.ttl,
				});
				stopLooking = 1;
			    }else if (obj.res.type == 'SRV' && (array[0] == service[0]) && (array[1] == service[1]) ){
				if (!(/\.$/).test(array[5])){
				    if (!array[5].match(reDomain)){
					array[5] = array[5] + '.' + domain;
				    }
				}
//TODO: resolv target to A|AAAA
				obj.res.ns4chain.push({
				    name: obj.res.service + '.' + host,
				    type: 33,
				    class: obj.res.class,
				    priority: (!sys.is_null(array[2]) ? array[2] : 10),
				    weight: (!sys.is_null(array[3]) ? array[3] : 0),
				    port: (!sys.is_null(array[4]) ? array[4] : 0),
				    target: array[5],
				    ttl: config.ttl,
				});
				stopLooking = 1;
			    }
			}else{
			    sys.console({level: 'debug', text: sprintf('ns4chain.resolv: malformed service value, must have 6 items (file: %s, line: %s)',__file,__line), obj: array});
			}
		    });

		    if (!sys.is_null(stopLooking)){
			ns4chain.addAuthority({res: obj.res, name: host, data: config.dnsName, address: dns.address().address});
		    }else{
			obj.res.errorCode = 'NOTFOUND';
			obj.res.error=sprintf('ns4chain.resolv: No SERVICE record for [%s] (file: %s, line: %s)',obj.res.type,__file,__line);
		    }
		}
	    }else{
		obj.res.errorCode = 'NOTFOUND';
		obj.res.error=sprintf('ns4chain.resolv: SERVICE record for [%s] not found (file: %s, line: %s)',host,__file,__line);
	    }
	}
    
	if (/^SOA$/.test(obj.res.type) && sys.is_null(stopLooking)){
	    ns4chain.addSOA({res: obj.res, name: domain, where: 'answer'});
	    stopLooking = 1;
	}
    }

    if (/^NS$/.test(obj.res.type) && sys.is_null(stopLooking)){
	if (sys.is_null(obj.res.error)){
	    if (sys.is_null(zoneData[host].ns)){
		obj.res.ns4chain.push({
		    name: host,
		    type: 2,
		    class: obj.res.class,
		    data: config.dnsName, 
		    ttl: config.ttl,
		});
	    }else{
//TODO: resolv ns name to A|AAAA
		for (var nn=0; nn<zoneData[host].ns.length; nn++){
		    if (!sys.is_null(zoneData[host].ns[nn])){
			obj.res.ns4chain.push({
			    name: host,
			    type: 2,
			    class: obj.res.class,
			    data: zoneData[host].ns[nn], 
			    ttl: config.ttl,
			});
		    }
		}
	    }
	}
	stopLooking = 1;
    }

    if (sys.is_null(obj.res.error) && sys.is_null(stopLooking)){
	if (obj.loop == 1 && (/^(TXT|ANY)$/.test(obj.res.type)) && sys.is_null(zoneData[host].ns)){
	    var txtData = [
		'txid: ' + (!sys.is_null(obj.res.chainData.txid) ? obj.res.chainData.txid : 'unknown'),
		'address: ' + (!sys.is_null(obj.res.chainData.address) ? obj.res.chainData.address : 'unknown'),
		'expires: ' + (!sys.is_null(obj.res.chainData.expires_in) ? obj.res.chainData.expires_in : 'unknown'),
	    ];
	    obj.res.ns4chain.push({
		name: host,
		type: 16,
		class: obj.res.class,
		data: txtData,
		ttl: config.ttl,
	    });
	}

	if (!sys.is_null(zoneData[host].ns)){		//If NS servers is set ignore chain data and send request to NS
		if (typeof zoneData[host].ns == 'string'){
		    zoneData[host].ns = [ zoneData[host].ns ] ;
		}

		obj.res.response.header.aa = 0;		//Non-authoritative answer
//TODO: NS IPv6 support
		sys.console({level: 'debug', text: sprintf('Found NS servers [%s] for %s (file: %s, line: %s)',zoneData[host].ns.join(', '),host,__file,__line)});
		var nsTMP=[];
		var nn = zoneData[host].ns.length-1;
		for (var i=nn; nn >=0; nn--){
		    if (sys.is_null(zoneData[host].ns[nn])){
			obj.res.error=sprintf('NS is [%s], skip (file: %s, line: %s)',zoneData[host].ns[nn],__file,__line);
		    }else if (zoneData[host].ns[nn] == dns.address().address){
			obj.res.error=sprintf('NS [%s] is point to myself (file: %s, line: %s)',zoneData[host].ns[nn],__file,__line);
		    }else if (zoneData[host].ns[nn] == '127.0.0.1' || zoneData[host].ns[nn] == 'localhost'){
			obj.res.error=sprintf('NS [%s] is point to localhost (file: %s, line: %s)',zoneData[host].ns[nn],__file,__line);
		    }else if (!sys.is_null(sys.ip_vs_net(zoneData[host].ns[nn],['10.0.0.0/8','192.168.0.0/16','172.16.0.0/12']))){
			obj.res.error=sprintf('NS [%s] is in private subnet (file: %s, line: %s)',zoneData[host].ns[nn],__file,__line);
		    }else{
			nsTMP.push( zoneData[host].ns[nn] );
		    }
		}
		
		if (sys.is_null(obj.res.error)){
		    ns4chain.zoneNS({res: obj.res, host: host, nsServers: nsTMP, callback: obj.callback});
		    noCallback = true;
		}
	}else{
	    if (typeof zoneData[host] === 'string'){
		if ((/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/).test(zoneData[host])){
		    zoneData[host] = { ip: zoneData[host] };
		}
		if ((/^[0-9a-fA-F:]+(\/\d{1,3}){0,1}$/).test(zoneData[host])){
		    zoneData[host] = { ip6: zoneData[host] };
		}
	    }else{
		if (!sys.is_null(zoneData[host][''])){
		    ns4chain.multiIP({
			name: host,
			type: 1,
			class: obj.res.class,
			data: zoneData[host]['']
		    }).forEach(function (a) {
			obj.res.ns4chain.push( a );
		    });
		    stopLooking = 1;
		}
	    }

	    if ((/^A$/.test(obj.res.type)) && !sys.is_null(zoneData[host].ip)){
		ns4chain.multiIP({
			name: host,
			type: 1,
			class: obj.res.class,
			data: zoneData[host].ip
		}).forEach(function (a) {
		    if (obj.res.type == 'MX'){
			obj.res.response.additional.push( a );
		    }else{
			obj.res.ns4chain.push( a );
		    }
		});
		stopLooking = 1;
	    }
	    if ((/^AAAA$/.test(obj.res.type)) && !sys.is_null(zoneData[host].ip6)){
		ns4chain.multiIP({
		    name: host,
		    type: 28,
		    class: 6,
		    data: zoneData[host].ip6
		}).forEach(function (a) {
		    obj.res.ns4chain.push( a );
		});
		stopLooking = 1;
	    }

	    //Looking up alias if no IPs was found
	    if (sys.is_null(stopLooking)){
		if (zoneData[host].alias !== undefined){
		    var alias = zoneData[host].alias;
		    if (alias == ''){
			var prevLevel = host.split('.');
			prevLevel.shift();
			sys.console({level: 'debug', text: sprintf('Found empty alias to %s (file: %s, line: %s)',prevLevel.join('.'),__file,__line)});
			obj.res.ns4chain.push({
			    name: host,
			    type: 5,
			    class: obj.res.class,
			    data: prevLevel.join('.'),
			    ttl: config.ttl,
			});
			if (!/^CNAME$/.test(obj.res.type)){
			    noCallback = ns4chain.resolv.namecoin( { loop: obj.loop, res: obj.res, domain: prevLevel.join('.'), fqdn: domain, callback: obj.callback, noCallback: true } );
			}
		    }else if ((/\.$/).test(alias)){
			//FQDN alias
			var re = new RegExp(obj.res.name + '\.' + obj.res.zone + '\.$');
			if (!(re.test(alias))){
			    sys.console({level: 'debug', text: sprintf('Found FQDN alias to domain %s (file: %s, line: %s)',alias,__file,__line)});
			    obj.res.ns4chain.push({
				name: host,
				type: 5,
				class: obj.res.class,
				data: alias,
				ttl: config.ttl,
			    });

			    if (!(/\.bit/.test(alias))){
				if (!/^CNAME$/.test(obj.res.type)){
				    ns4chain.oldResolver( {res: obj.res, name: alias, callback: obj.callback} );
				    noCallback = true;
				}
			    }else{
				//IF alias is another .bit domain
				ns4chain.addAuthority({res: obj.res, name: domain, data: config.dnsName, address: dns.address().address});
				noCallback = ns4chain.resolv.namecoin( { loop: obj.loop, res: obj.res, domain: alias.replace(/\.$/,''), fqdn: domain, callback: obj.callback, noCallback: true } );
			    }
			}else{
			    sys.console({level: 'debug', text: sprintf('Found FQDN alias %s point to this domain (file: %s, line: %s)',alias,__file,__line)});
			    obj.res.ns4chain.push({
				name: host,
				type: 5,
				class: obj.res.class,
				data: alias.replace(/\.$/,''),
				ttl: config.ttl,
			    });
			    if (!/^CNAME$/.test(obj.res.type)){
				noCallback = ns4chain.resolv.namecoin( { loop: obj.loop, res: obj.res, domain: alias.replace(/\.$/,''), fqdn: domain, callback: obj.callback, noCallback: true } );
			    }
			}
		    }else{
			var matches = alias.match(/^(.*)\.\@$/);
			if (!sys.is_null(matches) && !sys.is_null(matches[1])){
			    alias = matches[1];
			}

			sys.console({level: 'debug', text: sprintf('Found alias to %s.%s (file: %s, line: %s)',alias,domain,__file,__line)});
			if (!sys.is_null(zoneData[alias+'.'+domain])){
			    obj.res.ns4chain.push({
				name: host,
				type: 5,
				class: obj.res.class,
				data: alias+'.'+domain,
				ttl: config.ttl,
			    });
			    if (!/^CNAME$/.test(obj.res.type)){
				noCallback = ns4chain.resolv.namecoin( { loop: obj.loop, res: obj.res, domain: alias+'.'+domain, fqdn: domain, callback: obj.callback, noCallback: true } );
			    }
			}else{
			    sys.console({level: 'debug', text: sprintf('Alias %s.%s not found (file: %s, line: %s)',alias,domain,__file,__line)});
			    obj.res.error=sprintf('Alias %s.%s not found (file: %s, line: %s)',alias,domain,__file,__line);
			    obj.res.errorCode = 'NOTFOUND';
			}
		    }
		}
	    }
	}
    }

    if (sys.is_null(obj.noCallback) && sys.is_null(noCallback) ){
	sys.console({level: 'debug', text: sprintf('Resolv result (file: %s, line: %s)',__file,__line), obj: (!sys.is_null(obj.res.ns4chain) ? obj.res.ns4chain : {}) });
	if (!sys.is_null(callback) && typeof callback === 'function'){
	    callback( obj.res );
	}else{
	    sys.console({level: 'error', text: sprintf('ns4chain.resolv: callback is not set or not a function (file: %s, line: %s)',__file,__line), obj: obj});
	}
    }
    return noCallback;
}

ns4chain.resolv.emercoin = function( obj ){
    //
    // DOCS:
    // * https://docs.emercoin.com/en/Blockchain_Services/EmerDNS/EmerDNS_Introduction.html
    //
    var host = obj.domain; 
    var domain = obj.fqdn;
    var callback = obj.callback;
    var noCallback = null;
    var tmp = null;
    var stopLooking = 0;

    if (sys.is_null(config.maxalias) || !((/^\d+$/).test(config.maxalias))){
	config.maxalias = 16;
    }
    if (sys.is_null(obj.res.ns4chain)){
	obj.res.ns4chain = [];
    }
    if (sys.is_null(obj.res.zoneData)){
	obj.res.zoneData = zoneData;
    }
    if (sys.is_null(obj.loop)){
	obj.loop = 0;
    }
    obj.loop++;

    sys.console({level: 'debug', text: sprintf('#iter%d: Doing resolv %s [%s] in %s (file: %s, line: %s)',obj.loop,host,obj.res.type,domain,__file,__line)});
    if (obj.loop >= config.maxalias){
	obj.res.errorCode = 'NOTFOUND';
	obj.res.error=sprintf('Max alias reached. Stop searching, %s not found (file: %s, line: %s)',host,__file,__line);
    }

    if (sys.is_null(obj.res.error)){
	if (sys.is_null(zoneData[host]) && obj.loop == 1){
	    sys.console({level: 'debug', text: sprintf('Host %s not found (file: %s, line: %s)',host,__file,__line)});
	    if (!sys.is_null(zoneData[domain]) && !sys.is_null(zoneData[domain].ns)){
		zoneData[host] = { ns: zoneData[domain].ns };
		sys.console({level: 'debug', text:  sprintf('%s have ns servers: %s (file: %s, line: %s)',domain,zoneData[host].ns.join(', '),__file,__line)});
	    }
	}

	if (sys.is_null(zoneData[host])){
	    obj.res.error=sprintf('Host %s not found  (file: %s, line: %s)',host,__file,__line);
	    obj.res.errorCode = 'NOTFOUND';
	}
    }
    
    if (sys.is_null(obj.res.error) && sys.is_null(zoneData[host].ttl)){
	zoneData[host].ttl = config.ttl;
    }

    if (sys.is_null(obj.res.error) && sys.is_null(zoneData[host].ns)){
	if (/^SOA$/.test(obj.res.type)){
	    ns4chain.addSOA({res: obj.res, name: domain, where: 'answer', ttl: zoneData[host].ttl});
	}
	if (/^SRV$/.test(obj.res.type)){	//not supported by emercoin
	    ns4chain.addSOA({res: obj.res, name: domain, where: 'authority', ttl: zoneData[host].ttl});
	}
	if (obj.loop == 1 && (/^(TXT|ANY)$/.test(obj.res.type))){
	    var txtData = [
		'txid: ' + (!sys.is_null(obj.res.chainData.txid) ? obj.res.chainData.txid : 'unknown'),
		'address: ' + (!sys.is_null(obj.res.chainData.address) ? obj.res.chainData.address : 'unknown'),
		'expires: ' + (!sys.is_null(obj.res.chainData.expires_in) ? obj.res.chainData.expires_in : 'unknown'),
	    ];
	    if (!sys.is_null(zoneData[host].txt)){
		txtData.push('txt: '+zoneData[host].txt);
	    }
	    obj.res.ns4chain.push({
		name: host,
		type: 16,
		class: obj.res.class,
		data: txtData,
		ttl: zoneData[host].ttl,
	    });
	}

	if (/^NS$/.test(obj.res.type)){
	    if (sys.is_null(zoneData[host].ns)){
		obj.res.ns4chain.push({
		    name: host,
		    type: 2,
		    class: obj.res.class,
		    data: config.dnsName,
		    ttl: zoneData[host].ttl,
		});
	    }
	}

	if ((/^A$/.test(obj.res.type))){ 
	    if (!sys.is_null(zoneData[host].ip)){
		ns4chain.multiIP({
		    name: host,
		    type: 1,
		    class: obj.res.class,
		    data: zoneData[host].ip,
		    ttl: zoneData[host].ttl
		}).forEach(function (a) {
		    obj.res.ns4chain.push( a );
		});
		stopLooking = 1;
	    }
	}
	
	if ((/^AAAA$/.test(obj.res.type))){
	    if (!sys.is_null(zoneData[host].ip6)){
		ns4chain.multiIP({
		    name: host,
		    type: 28,
		    class: 6,
		    data: zoneData[host].ip6,
		    ttl: zoneData[host].ttl
		}).forEach(function (a) {
		    obj.res.ns4chain.push( a );
		});
		stopLooking = 1;
	    }
	}

	if ((/^(CNAME|A|AAAA)$/.test(obj.res.type))){
	    if (sys.is_null(stopLooking)){
		if (!sys.is_null(zoneData[host].cname)){
		    var alias = zoneData[host].cname;
		    if ((/\.$/).test(alias)){
			alias = alias.replace(/\.$/,'');
		    }
		    sys.console({level: 'debug', text: sprintf('Found CNAME %s for [%s] (file: %s, line: %s)',alias,domain,__file,__line)});
		    obj.res.ns4chain.push({
			name: host,
			type: 5,
			class: obj.res.class,
			data: alias,
			ttl: zoneData[host].ttl,
		    });

		    if (!(/\.(emc|coin|lib|bazar)/.test(alias))){
			//CNAME point to external domain
			if (!/^CNAME$/.test(obj.res.type)){
			    ns4chain.oldResolver( {res: obj.res, name: alias, callback: obj.callback} );
			    noCallback = true;
			}
		    }else{
//TODO: CNAME IF alias is another emercoin domain
		    }
		}else{
		    if ((/^CNAME$/.test(obj.res.type))){
			obj.res.error=sprintf('ns4chain.resolv: %s record for [%s] not found (file: %s, line: %s)',obj.res.type,host,__file,__line);
			obj.res.errorCode = 'NOTFOUND';
		    }
		}
	    }
	    if (obj.res.ns4chain.length == 0){
		obj.res.error=sprintf('ns4chain.resolv: %s record for [%s] not found (file: %s, line: %s)',obj.res.type,host,__file,__line);
		obj.res.errorCode = 'NOTFOUND';
	    }
	}
	if (/^MX$/.test(obj.res.type) && obj.loop == 1){
	    if(!sys.is_null(zoneData[host].mx)){
        	var regexp = /:(\d+)$/i;	//The value of MX contains a mail exchanger reference and priority, separated by a colon ":". If priority is omitted, the default value is 1.
                var match,prio;
                zoneData[host].mx.forEach(function ( v ) {
            	    match = regexp.exec( v );
                    if (!sys.is_null(match) && !sys.is_null(match[1]) ){
                	prio = match[1];
                        v = v.replace(/:\d+$/,'');
                    }else{
                	prio = 1;
                    }
//TODO: resolv exchange to A|AAAA
		    obj.res.ns4chain.push({
			name: host,
			type: 15,
			class: obj.res.class,
			priority: prio,
			exchange: v,
			ttl: zoneData[host].ttl,
		    });
		});
	    }else{
		obj.res.errorCode = 'NOTFOUND';
		obj.res.error=sprintf('ns4chain.resolv: %s record for [%s] not found (file: %s, line: %s)',obj.res.type,host,__file,__line);
	    }
	}
    }else if (sys.is_null(obj.res.error) && !sys.is_null(zoneData[host].ns)){
	    if (typeof zoneData[host].ns == 'string'){
		zoneData[host].ns = [ zoneData[host].ns ] ;
	    }

	    obj.res.response.header.aa = 0;		//Non-authoritative answer
//TODO: resolv ns name to A|AAAA
	    if (/^NS$/.test(obj.res.type)){
		    obj.res.response.header.aa = 1;
		    for (var nn=0; nn<zoneData[host].ns.length; nn++){
			if (!sys.is_null(zoneData[host].ns[nn])){
			    obj.res.ns4chain.push({
				name: host,
				type: 2,
				class: obj.res.class,
				data: zoneData[host].ns[nn], 
				ttl: zoneData[host].ttl,
			    });
			}
		    }
		}
//TODO: NS IPv6 support
		sys.console({level: 'debug', text: sprintf('Found NS servers [%s] for %s (file: %s, line: %s)',zoneData[host].ns.join(', '),host,__file,__line)});
		var nsTMP=[];
		var nn = zoneData[host].ns.length-1;
		for (var i=nn; nn >=0; nn--){
		    if (sys.is_null(zoneData[host].ns[nn])){
			obj.res.error=sprintf('NS is [%s], skip (file: %s, line: %s)',zoneData[host].ns[nn],__file,__line);
		    }else if (zoneData[host].ns[nn] == dns.address().address){
			obj.res.error=sprintf('NS [%s] is point to myself (file: %s, line: %s)',zoneData[host].ns[nn],__file,__line);
		    }else if (zoneData[host].ns[nn] == '127.0.0.1' || zoneData[host].ns[nn] == 'localhost'){
			obj.res.error=sprintf('NS [%s] is point to localhost (file: %s, line: %s)',zoneData[host].ns[nn],__file,__line);
		    }else if (!sys.is_null(sys.ip_vs_net(zoneData[host].ns[nn],['10.0.0.0/8','192.168.0.0/16','172.16.0.0/12']))){
			obj.res.error=sprintf('NS [%s] is in private subnet (file: %s, line: %s)',zoneData[host].ns[nn],__file,__line);
		    }else{
			nsTMP.push( zoneData[host].ns[nn] );
		    }
		}
		
		if (sys.is_null(obj.res.error)){
		    ns4chain.zoneNS({res: obj.res, host: host, nsServers: nsTMP, callback: obj.callback});
		    noCallback = true;
		}
    }


    if (sys.is_null(obj.noCallback) && sys.is_null(noCallback) ){
	sys.console({level: 'debug', text: sprintf('Resolv result (file: %s, line: %s)',__file,__line), obj: (!sys.is_null(obj.res.ns4chain) ? obj.res.ns4chain : {}) });
	if (!sys.is_null(callback) && typeof callback === 'function'){
	    callback( obj.res );
	}else{
	    sys.console({level: 'error', text: sprintf('ns4chain.resolv: callback is not set or not a function (file: %s, line: %s)',__file,__line), obj: obj});
	}
    }
    return noCallback;
}

ns4chain.oldResolver = function( obj ){
    if (sys.is_null( obj.server )){
	if (sys.is_null(config.oldDNS) || typeof config.oldDNS != 'object' || sys.is_null(config.oldDNS.host) && typeof config.oldDNS.host != 'string'){
	    sys.console({level: 'warning', text: sprintf('oldDNS not set or wrong, check config. Set to default. (file: %s, line: %s)',__file,__line)});
	    config.oldDNS = { 
		host: '8.8.8.8',
		port: 53,
		timeout: 1000,
	    };
	}
    }

    if (sys.is_null(config.oldDNS.port)){
	config.oldDNS.port = 53;
    }
    if (sys.is_null(config.oldDNS.timeout)){
	config.oldDNS.timeout = 1000;
    }
    
    var dnsHost = sys.is_null( obj.server ) ? config.oldDNS.host : obj.server;
    var dnsPort = sys.is_null( obj.server ) ? config.oldDNS.port : 53;

    sys.console({level: 'debug', text: sprintf('oldDNS: request NS %s:%s for %s [%s] (file: %s, line: %s)',dnsHost,dnsPort,obj.name,obj.res.type,__file,__line)});
    obj.res.nsServer = dnsHost;
    var question = dnsSource.Question({
	name: obj.name,
	type: obj.res.type,
    });

    try{
	var start = Date.now();
	var oldDNSreq = dnsSource.Request({
	    question: question,
	    server: { address: dnsHost, port: dnsPort, type: 'udp' },
	    timeout: config.oldDNS.timeout,
	});

	oldDNSreq.send();
	
	oldDNSreq.on('error', function (err, buff, req, res) {
	    sys.console({level: 'error', text: sprintf('DNS %s error occurred (file: %s, line: %s)',dnsHost,__file,__line), obj: err.stack});
	    obj.res.errorCode = 'SERVFAIL';
	});

	oldDNSreq.on('timeout', function () {
	    obj.res.error=sprintf('oldDNS: request to %s:%s for %s [%s] timeout (file: %s, line: %s)',dnsHost,dnsPort,obj.name,obj.res.type,__file,__line);
	    if (!sys.is_null(obj.callback) && typeof obj.callback === 'function'){
		obj.callback( obj.res );
	    }else{
		sys.console({level: 'error', text: sprintf('ns4chain.oldResolver: callback is not set or not a function (file: %s, line: %s)',__file,__line), obj: obj});
		obj.res.errorCode = 'SERVFAIL';
	    }
	});

	oldDNSreq.on('message', function (err, answer) {
	    obj.res.response.answer = answer.answer;
	    obj.res.response.authority = answer.authority;
	    obj.res.response.additional = answer.additional;
	    obj.res.response.edns_options = answer.edns_options;
	    sys.console({ level: 'debug', text: sprintf('oldDNS: reply from %s:%s for %s [%s]: %s (file: %s, line: %s)',dnsHost,dnsPort,obj.name,obj.res.type,JSON.stringify(answer.answer),__file,__line) });

	    if (!sys.is_null(obj.callback) && typeof obj.callback === 'function'){
		obj.callback( obj.res );
	    }else{
		sys.console({level: 'error', text: sprintf('ns4chain.oldResolver: callback is not set or not a function (file: %s, line: %s)',__file,__line), obj: obj});
	    }
	});

	oldDNSreq.on('end', function () {
	    var delta = (Date.now()) - start;
	    sys.console({ level: 'debug', text: sprintf('oldDNS: finished processing request to %s:%s for %s [%s] in %s ms (file: %s, line: %s)',dnsHost,dnsPort,obj.name,obj.res.type,delta.toString(),__file,__line)});
	});
    }
    catch(e){
	sys.console({level: 'error',text: sprintf('oldDNS: request to %s:%s for %s [%s] failed (file: %s, line: %s)',dnsHost,dnsPort,obj.name,obj.res.type,__file,__line), obj: e});
    }
}

ns4chain.multiIP = function( obj ){
    var ret = [];
    if (sys.is_null(obj.data)){
	obj.data = [];
    }

    if (typeof obj.data === 'string'){
	obj.data = [obj.data];
    }else{
	if (!sys.is_null(obj.data.ip)){
	    obj.data = obj.data.ip;
	}
    }
    
    obj.data.forEach(function (address) {
	var tmp = {
	    name: obj.name,
	    type: obj.type,
	    class: obj.class,
	    ttl: (!sys.is_null(obj.ttl) ? obj.ttl : config.ttl),
	    address: address
	};
	if ((/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/).test(address) || (/^[0-9a-fA-F:]+(\/\d{1,3}){0,1}$/).test(address)){
	    ret.push( tmp );
	}
    });
 return ret;
}

ns4chain.zoneNS = function( obj ){
    var error = null;
    if (obj.nsServers == undefined || typeof obj.nsServers != 'object' ){
	error=sprintf('ns4chain.zoneNS: NS list is not set or not array (file: %s, line: %s)',__file,__line);
	sys.console({level: 'error',text: error,obj: obj});
    }

    if (sys.is_null(error)){
	var nsServer = null;
	if (obj.nsServers.length > 0){
	    nsServer = obj.nsServers[obj.nsServers.length-1];
	    sys.console({level: 'debug', text: sprintf('#%d: Trying request NS server %s (file: %s, line: %s)',obj.nsServers.length,nsServer,obj.host,__file,__line)});
	    --obj.nsServers.length;
	    obj.res.nsServers = obj.nsServers;
	    obj.res.host = obj.host;
	    obj.res.callback = obj.callback;

	    //Insert NS info to DNS reply
	    obj.res.response.additional.push({
		name: obj.res.sld,
		type: 2,
		class: obj.res.class,
		data: nsServer,
		ttl: (!sys.is_null(obj.ttl) ? obj.ttl : config.ttl),
	    });

	    if (!(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/).test(nsServer)){
		ns4chain.zoneNSResolv({
		    res: obj.res, 
		    host: obj.host, 
		    sld: obj.res.sld,
		    nsServer: nsServer, 
		    callback: function( res ){
			if (sys.is_null(res.error)){
			    ns4chain.oldResolver( {
				res: obj.res,
				name: obj.host,
				server: obj.res.nsServer,
				callback: function ( res ){
				if (sys.is_null(res.error)){
				    if (!sys.is_null(res.callback) && typeof res.callback === 'function'){
				    /*
					//Request next server anyway
					if ( obj.nsServers.length <= 0){
					    obj.callback( res );
					}else{
					    ns4chain.zoneNS({res: res, host: res.host, nsServers: res.nsServers, callback: res.callback});
					}
				    */
					obj.callback( res );
				    }else{
					sys.console({level: 'error', text: sprintf('ns4chain.zoneNS: callback is not set or not a function (file: %s, line: %s)',__file,__line), obj: obj});
				    }
				}else{
					sys.console({level: 'error', text: sprintf('ns4chain.zoneNS: NS request failed: %s (file: %s, line: %s)',res.error,__file,__line)});
					if (res.nsServers.length > 0){
					    delete( res.error );
					}
					--obj.res.response.additional.length;		//Delete NS info from DNS reply if NS failed
					ns4chain.zoneNS({res: res, host: res.host, nsServers: res.nsServers, callback: res.callback});
				    }
				}
			    } );
			}else{
			    sys.console({level: 'error', text: sprintf('ns4chain.zoneNS: NS resolv request failed: %s (file: %s, line: %s)',res.error,__file,__line)});
			    if (res.nsServers.length > 0){
				delete( res.error );
			    }
			    --obj.res.response.additional.length;		//Delete NS info from DNS reply if NS failed
			    ns4chain.zoneNS({res: res, host: res.host, nsServers: res.nsServers, callback: res.callback});
			}
		    }
		});
	    }else{
		ns4chain.oldResolver( {
		    res: obj.res,
		    name: obj.host,
		    server: nsServer,
		    callback: function ( res ){
			if (sys.is_null(res.error)){
			    if (!sys.is_null(res.callback) && typeof res.callback === 'function'){
				obj.callback( res );
			    }else{
				sys.console({level: 'error', text: sprintf('ns4chain.zoneNS: callback is not set or not a function (file: %s, line: %s)',__file,__line), obj: obj});
			    }
			}else{
			    sys.console({level: 'error', text: sprintf('ns4chain.zoneNS: NS request failed: %s (file: %s, line: %s)',res.error,__file,__line)});
			    if (res.nsServers.length > 0){
				delete( res.error );
			    }
			    --obj.res.response.additional.length;		//Delete NS info from DNS reply if NS failed
			    ns4chain.zoneNS({res: res, host: res.host, nsServers: res.nsServers, callback: res.callback});
			}
		    }
		} );
	    }
	}else{
	    sys.console({level: 'debug', text: sprintf('ns4chain.zoneNS: No NS servers left, return (file: %s, line: %s)',__file,__line)});
	    if (!sys.is_null(obj.callback) && typeof obj.callback === 'function'){
		obj.callback( obj.res );
	    }else{
		sys.console({level: 'error', text: sprintf('ns4chain.zoneNS: callback is not set or not a function (file: %s, line: %s)',__file,__line), obj: obj});
	    }
	}
    }else{
	if (!sys.is_null(obj.callback) && typeof obj.callback === 'function'){
	    obj.res.error=error;
	    obj.callback( obj.res );
	}else{
	    sys.console({level: 'error', text: sprintf('ns4chain.zoneNS: callback is not set or not a function (file: %s, line: %s)',__file,__line), obj: obj});
	}
    }
}

ns4chain.zoneNSResolv = function( obj ){
    var error = null;
    if (sys.is_null(obj.nsServer)){
	error=sprintf('ns4chain.zoneNSResolv: NS server is not set or null (file: %s, line: %s)',__file,__line);
	sys.console({level: 'error',text: error,obj: obj});
    }

    if (sys.is_null(error)){
	sys.console({level: 'debug', text: sprintf('Trying to resolv NS name %s (file: %s, line: %s)',obj.nsServer,__file,__line)});
	try {
	    request = dnsSource.lookup(obj.nsServer, function (err, nsIP, result) {
		var error = null;
		obj.res.nsServer = nsIP;
		sys.console({level: 'debug', text: sprintf('NS name %s resolved to %s (file: %s, line: %s)',obj.nsServer,obj.res.nsServer,__file,__line)});
		if (!sys.is_null(err)){
		    error=sprintf('Resolv error on NS name %s: %j (file: %s, line: %s)',obj.nsServer,err,__file,__line);
		}else{
		    if (sys.is_null(nsIP)){
			error=sprintf('Cant resolv NS name %s to IP (file: %s, line: %s)',obj.nsServer,__file,__line);
		    }else{ 
			if (!(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/).test(nsIP)){
			    error=sprintf('NS name %s resolved to [%s] (file: %s, line: %s)',obj.nsServer,nsIP,__file,__line);
			}else{
			     if (!sys.is_null(nsIP)){
			        if (nsIP == '127.0.0.1'){
				    error=sprintf('NS name %s is point to localhost [%s] (file: %s, line: %s)',obj.nsServer,nsIP,__file,__line);
				}else if (nsIP == dns.address().address){
				    error=sprintf('NS name %s is point to myself [%s] (file: %s, line: %s)',obj.nsServer,nsIP,__file,__line);
				}else if (!sys.is_null(sys.ip_vs_net(nsIP,['10.0.0.0/8','192.168.0.0/16','172.16.0.0/12']))){
				    obj.res.error=sprintf('NS [%s] is in private subnet (file: %s, line: %s)',nsIP,__file,__line);
				}
			    }
			}
		    }
		}
		if (!sys.is_null(error)){
		    obj.res.error = error;
		}else{
		    //add info about from where authoritative answer can be received from
		    ns4chain.addAuthority({res: obj.res, name: obj.res.sld, data: obj.nsServer, address: obj.res.nsServer});
		}
		if (!sys.is_null(obj.callback) && typeof obj.callback === 'function'){
		    obj.callback( obj.res );
		}else{
		    sys.console({level: 'error', text: sprintf('ns4chain.zoneNSResolv: callback is not set or not a function (file: %s, line: %s)',__file,__line), obj: obj});
		}
	    });
	}
	catch(e){
	    sys.console({level: 'error', text: sprintf('ns4chain.zoneNSResolv: failed (file: %s, line: %s)',__file,__line), obj: e});
	}
    }else{
	if (!sys.is_null(obj.callback) && typeof obj.callback === 'function'){
	    obj.res.error=error;
	    obj.callback( obj.res );
	}else{
	    sys.console({level: 'error', text: sprintf('ns4chain.zoneNSResolv: callback is not set or not a function (file: %s, line: %s)',__file,__line), obj: obj});
	}
    }
}

ns4chain.addAuthority = function( obj ){
	obj.res.response.authority.push({
	    name: obj.name,
	    type: 2,
	    class: obj.res.class,
	    data: obj.data,
	    ttl: (!sys.is_null(obj.ttl) ? obj.ttl : config.ttl),
	});
	if (!sys.is_null(obj.address)){
	    obj.res.response.additional.push({
		name: obj.data,
		type: 1,
		class: obj.res.class,
		address: obj.address,
		ttl: (!sys.is_null(obj.ttl) ? obj.ttl : config.ttl),
	    });
	}
}

ns4chain.addSOA = function( obj ){
	if (sys.is_null(obj.where)){
	    obj.where = 'authority';
	}
	obj.res.response[obj.where].push({
	    name: obj.name,
	    type: 6,
	    class: obj.res.class,
	    primary: config.dnsName,
	    admin: '',
	    serial: sys.unixtime(),
	    refresh: 600,
	    retry: 600,
	    expiration: 7200,
	    minimum: 600,
	    ttl: (!sys.is_null(obj.ttl) ? obj.ttl : config.ttl),
	});
}

module.exports = ns4chain;