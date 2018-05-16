#!/usr/bin/env node
/*
    ns4chain server :: https://github.com/subnetsRU/namecoin

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

fs = require('fs');                             //https://nodejs.org/api/fs.html
util = require('util');                         //https://nodejs.org/api/util.html
sprintf = require("sprintf-js").sprintf;        //https://www.npmjs.com/package/sprintf-js
dnsSource = require('native-dns');		//https://github.com/tjfontaine/node-dns
inSubnet = require('insubnet');			//https://www.npmjs.com/package/insubnet

config = require('./dns_serv_options');
config.version = '0.9.1';
sys = require('./dns_func');

zoneData = {};
antiddoslist = [];
var argv = process.argv.slice(2);

while (argv[0] && argv[0][0] == '-') {
    switch (argv[0]) {
	case '-d':
	case '--debug':
	    if (argv[1] == 'none'){
		//Debug is off
		config.DEBUG = 0;
	    }else if (argv[1] == 'log'){
		//Debug is on: logifile
		config.DEBUG = 1;
	    }else if (argv[1] == 'cli'){
		//Debug is on: cli
		config.DEBUG = 2;
	    }else if (argv[1] == 'full'){
		//Debug is on: logifile, cli
		config.DEBUG = 3;
	    }else{
		//Unknown param, set default
		config.DEBUG = 0;
	    }
	    argv = argv.slice(2);
	    break;
	case '-l':
	case '--listen':
	    config.listen = argv[1];
	    argv = argv.slice(2);
	    break;
	case '-p':
	case '--port':
	    config.port = argv[1];
	    argv = argv.slice(2);
	    break;
	case '-t':
	case '--ttl':
	    config.ttl = argv[1];
	    argv = argv.slice(2);
	    break;
	case '-r':
	case '--recursion':
	    if (sys.is_null(config.recursion)){
		config.recursion = {};
	    }
	    config.recursion.enabled = true;
	    argv = argv.slice(2);
	    break;
	case '-h':
	case '--help':
	    argv = argv.shift();
	    ns4chain.dns_serv_help();
	    break;
	default:
	    console.log(__line);
	    sys.console({level: 'error', text: sprintf('unknown option [%s], for help run:\n\tnode %s -h',argv[0],process.mainModule.filename)});
	    sys.exit(1);
    }
}

dns = dnsSource.createServer({ dgram_type: 'udp4' });
rpc = require('./rpc_client');
ns4chain = require('./ns4chain');

dns.on('listening', function(){
    sys.console({level: 'info', text: sprintf('Starting DNS server v%s on %j (file: %s, line: %s)',config.version,dns.address(),__file,__line)});
    sys.console({level: 'debug', text: sprintf('Configuration %j (file: %s, line: %s)',config,__file,__line)});
    sys.antiddos();
    setInterval(sys.antiddos, (sys.is_null(config.antiddosRenew) ? 900000 : config.antiddosRenew * 1000) );
    setTimeout(function(){
	sys.console({level: 'debug', text: sprintf('antiddos list %j (file: %s, line: %s)',antiddoslist,__file,__line)});
    },100);
});

dns.on('request', function (request, response) {
    try {
	var error,recursion;
	var domain = request.question[0].name.toLowerCase();
	var type = dnsSource.consts.QTYPE_TO_NAME[request.question[0].type];
	var allowRecursion = false;
	sys.console({level: 'info', text: sprintf('Request from [%s:%s] for [%s] [%s] (file: %s, line: %s)',request.address.address,request.address.port,type,domain,__file,__line)});

	if (sys.is_null(config.recursion) || sys.is_null(config.recursion.enabled)){
	    //for rcode see node_modules/native-dns-packet/consts.js -> NAME_TO_RCODE
	    if (!(/\.(bit|emc|coin|lib|bazar)$/.test(domain))){
		error = 'REFUSED';
	    }
	}

	if (!sys.is_null(sys.in_array(domain,antiddoslist)) && !sys.is_null(antiddoslist.length)){
	    sys.console({level: 'debug', text: sprintf('Domain %s is in ddos list (file: %s, line: %s)',domain,__file,__line)});
	    error = 'REFUSED';
	}

	if (sys.is_null(error)){
	    var re;
	    if (!(/\.(bit|emc|coin|lib|bazar)$/.test(domain))){
		recursion = true;

		if ((/^SRV$/.test(type))){
		    re = new RegExp('^(_[a-z]+\.){2}[a-z0-9][a-z0-9-]*\.[a-z]{2,10}$','i');
		}else{
		    re = new RegExp('^([a-z0-9]+\.)?[a-z0-9][a-z0-9-]*\.[a-z]{2,10}$','i');
		}
		if (sys.is_null(domain.match(re))){
		    error = 'NOTFOUND';
		}

		if (sys.is_null(error) && !sys.is_null(config.recursion.enabled)){
		    if (config.recursion.allow != undefined && typeof config.recursion.allow == 'object'){
			if (config.recursion.allow.length == 0){
			    allowRecursion = true;
			}else{
			    if (!sys.is_null(sys.ip_vs_net(request.address.address,config.recursion.allow))){
				allowRecursion = true;
			    }
			}

			if (sys.is_null(allowRecursion)){
			    sys.console({level: 'info', text: sprintf('recursion not allowed for %s (file: %s, line: %s)',request.address.address,__file,__line)});
			    error = 'REFUSED';
			}
		    }else{
			sys.console({level: 'error', text: sprintf('recursion enabled, allow list is set but not valid (file: %s, line: %s)',__file,__line)});
			error = 'REFUSED';
		    }
		}
	    }else{
		if (!(/^(A|AAAA|TXT|ANY|MX|SOA|CNAME|SRV|NS)$/.test(type))){
		    error = 'NOTIMP';
		}else{
		    if ((/^SRV$/.test(type)) && (!(/^_[a-z]+\._(tcp|udp)\./.test(domain)))){
			error = 'NOTFOUND';
		    }
		}
		if (sys.is_null(error)){
		    var tmpName = domain.split('.');
		    var name = tmpName[0];
		    var zone = tmpName[tmpName.length-1];
		    var subDomain = null;
		    var service = null;
		    if (tmpName.length > 2){
			name = tmpName[tmpName.length-2];
			var re = new RegExp('(.*)\.' + name + '\.' + tmpName[tmpName.length-1] + '$');
			subMatch = domain.match(re);
			if (!sys.is_null(subMatch[1])){
			    if ((/^SRV$/.test(type))){
				tmpName = subMatch[1].split('.');
				service = tmpName.splice(0,2).join('.');
				subDomain = tmpName.length > 0 ? tmpName.join('.') : null;
				domain = (sys.is_null(subDomain) ? '' : subDomain + '.' ) + name + '.' + zone;
			    }else{
				subDomain = subMatch[1];
			    }
			}
		    }
		}
		//https://wiki.namecoin.info/index.php?title=Domain_Name_Specification#Regular_Expression
		if (!(/^[a-z]([a-z0-9-]{0,62}[a-z0-9])?$/.test(name))){
		    error = 'NOTFOUND';
		}
	    }
	}

	if (!sys.is_null(error)){
	    sys.console({level: 'info', text: sprintf('domain [%s] code %s',domain,error)});
	    response.header.rcode = dnsSource.consts.NAME_TO_RCODE[error];
	    response.send();
	}else{
	    if (sys.is_null(recursion)){
		ns4chain.request({
		    response: response,
		    domain: domain,
		    type: type,
		    name: name,
		    zone: zone,
		    subDomain: subDomain,
		    sld: name + '.' + zone,
		    rpc: (zone == 'bit' ? 'namecoin' : 'emercoin'),
		    service: service,
		    class: (!sys.is_null(request.question[0].class) ? request.question[0].class : 1),
		});
	    }else{
		ns4chain.recursive({
		    response: response,
		    domain: domain,
		    type: type,
		    class: (!sys.is_null(request.question[0].class) ? request.question[0].class : 1),
		});
	    }
	}
    }catch(e){
	sys.console({level: 'error', text: sprintf('DNS request failed (file: %s, line: %s)',__file,__line), obj: request});
	console.log(e);
    }
});

dns.on('close', function(){
    sys.console({level: 'info', text: sprintf('Close DNS server %j (file: %s, line: %s)',dns.address(),__file,__line)});
});

dns.on('error', function (err, buff, req, res) {
  sys.console({level: 'error', text: sprintf('DNS error occurred (file: %s, line: %s)',__file,__line), obj: err.stack});
});

dns.on('socketError', function (err) {
  console.log('[ERROR] on socket:',err.stack);
  sys.console({level: 'error', text: sprintf('DNS socketError occurred (file: %s, line: %s)',__file,__line), obj: err.stack});
});
dns.serve(config.port,config.listen);

process.on('SIGINT', sys.exit);
process.on('SIGTERM', sys.exit);
