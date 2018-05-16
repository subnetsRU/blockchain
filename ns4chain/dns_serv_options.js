/*
    ns4chain configuration file :: https://github.com/subnetsRU/namecoin

    (c) 2017-2018 SUBNETS.RU for bitname.ru project (Moscow, Russia)
    Authors: Nikolaev Dmitry <virus@subnets.ru>, Panfilov Alexey <lehis@subnets.ru>
*/

module.exports = {
    DEBUG: 0,                   	//0: off; 1: only to logfile; 2: only to console; 3: to logfile and console
    listen: '127.0.0.1',		//default: listen on IP (can be changed with startup options)
    port: '5353',			//default: listen on port (can be changed with startup options)
    ttl: 60,				//default: set this TTL in DNS reply (can be changed with startup options)
    dnsName: 'yourDNSname.example.ru',	//FQDN for this DNS server
    logDir: 'logs',
    rpc: {
	namecoin: {
	    enabled: true,		//values: true or false
	    host: '127.0.0.1',
	    port: 8336,
	    user: 'rpc_username_from_namecoin.conf',
	    pass: 'rpc_password_from_namecoin.conf'
	},
	emercoin: {
	    enabled: true,		//values: true or false
	    host: '127.0.0.1',
	    port: 6662,
	    user: 'rpc_username_from_emercoin.conf',
	    pass: 'rpc_password_from_emercoin.conf'
	}
    },
    oldDNS: {
	host: '8.8.8.8',
	port: 53,
	timeout: 1000,
    }
    recursion: {
	enabled: false,
	allow: ['10.0.0.0/8','192.168.0.0/16','172.16.0.0/12'],
    },
    maxalias: 16,		//max aliases to follow
    antiddos: 'antiddos.txt',	//list of domains to be refused to resolv
    antiddosRenew: 900,		//seconds to reread antiddos file, default is 900 (every 15 minutes)
};