#!/usr/local/bin/php
<?php
/*
    Whois service for blockchain TLDs
    =================================
	Namecoin (https://namecoin.org/):
	    bit (https://forum.namecoin.org/viewtopic.php?f=11&t=2654)

	Emercoin (https://emercoin.com/):
	    coin
	    emc
	    lib
	    bazar

	Sixlevel (https://611project.org/):
	    *.611.to

    --------------------------------------------------------------------------------
    
    (c) 2017-2018 SUBNETS.RU for bitname.ru project (Moscow, Russia)
    Authors: Panfilov Alexey <lehis@subnets.ru>, Nikolaev Dmitry <virus@subnets.ru> 

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

define( 'whoisVersion', '0.3.0' );

$config = init();

$start = microtime( true );
print "\n% This is the Namecoin and Emercoin blockchain query service version ". whoisVersion ." (c) bitname.ru\n\n";

$stdin = fopen('php://stdin', 'r');
while (!feof($stdin)) {
    $temp = fgets($stdin);
    $temp = str_replace("\n","",$temp);
    $tmp = trim($temp);
    break;
}

if( isset( $tmp ) ){
    $req_domain = strtolower( $tmp );
    $chain = select_chain( $req_domain );
    if (!isset($chain['error'])){
	$domain = $chain['domain'];
	printf("%% Information related to %s\n\n",$req_domain);
	$request = $chain['config'] + array('method'=> "name_show", 'domain'=> $domain, 'chain' => $chain['chain']);
	$data = rpc_request( $request );
	if( !isset($data['error']) ){
	    if( isset( $data['result'] ) ){
		$info=$data['result'];
		print_info( $req_domain, 'domain' );
		
		if ($chain['chain'] == "namecoin"){
		    if( isset( $info['name'] ) ){
			print_info( $info['name'], 'name' );
		    }

		    $status = "unknown";
		    if( isset( $info['expired'] ) ){
			if ($info['expired'] === true || (int)$info['expired'] == 1){
			    $status = "expired";
			}else{
			    $status = "registered";
			}
		    }
		    if( isset( $info['expires_in'] ) ){
			print_info( sprintf( "%s blocks",$info['expires_in'] ), 'expires in' );
			if ((int)$info['expires_in'] < 0 && $status == "registered"){
			    $status = "expired";
			}
		    }
		    print_info( $status, 'status' );

		    if( isset( $info['value'] ) ){
			$value = @json_decode(trim(preg_replace("/:\"\[/",":[",preg_replace("/\"\]\"/","\"]",$info['value']))),true,512);
			$json_last_error = json_last_error();
			if ($value && !$json_last_error && is_array($value)){
			    if (isset($value['email'])){
				print_info( $value['email'], 'email' );
			    }
			    if (isset($value['a'])){
				print_info( $value['a'], 'admin-c' );
			    }
			    if (isset($value['t'])){
				print_info( $value['t'], 'tech-c' );
			    }
			    if (isset($value['r'])){
				print_info( $value['r'], 'registrant' );
			    }
			    if (isset($value['rr'])){
				print_info( $value['rr'], 'sponsoring registrar' );
			    }
			    if (isset($value['info'])){
				print_info( $value['info'], 'info' );
			    }
			    if (isset($value['loc'])){
				print_info( $value['loc'], 'geo loc' );
			    }
			    if (isset($value['tor'])){
				print_info( $value['tor'], 'tor' );
			    }
			    if (isset($value['ns'])){
				print_info( $value['ns'], 'nameserver' );
			    }
			}else{
			    if (preg_match("/^\{.*\}$/",$info['value'])){
				$info['value']="Error: Data decode failed";
				if ( DEBUG ){
				    $info['value'] .= sprintf(". Code %d (%s)",$json_last_error,json_last_error_msg());
				}
			    }
			    print_info( $info['value'], 'info' );
			}
		    }
		
		    if( isset( $info['address'] ) ){
			print_info( $info['address'], 'address' );
		    }
		    if( isset( $info['height'] ) ){
			print_info( $info['height'], 'height' );
		    }

		    if( isset( $info['txid'] ) && $status == "registered"){
			print_info( $info['txid'], 'txid' );
			unset( $data );
			$request = $chain['config'] + array('chain' => $chain['chain'], 'method'=> "getrawtransaction", 'txid'=> $info['txid']);
			$data = rpc_request( $request );
			if( !isset($data['error']) ){
			    if( isset( $data['result'] ) && isset( $data['result']['time'] ) ){
				print "\n";
				print_info( gmdate("Y-m-d\TH:i:s\Z", $data['result']['time'] ), "last update on" );
			    }
			}else{
			    if ( DEBUG ){
				print "\n";
				print_info( implode("; ",$data['error']), "last update on" );
			    }
			}
		    }
		}elseif ($chain['chain'] == "emercoin"){
		    $ns = array();
		    $txt = "";
		    if( isset( $info['value'] ) ){
			$e = explode("|",$info['value']);
			foreach ($e as $val){
			    $t = explode("=",$val);
			    if (strtoupper($t[0]) == "NS" && isset($t[1]) && $t[1] && count($ns) == 0){
				$nt = explode(",",$t[1]);
				if (count($nt) > 0){
				    $ns = $nt;
				}else{
				    $ns[] = $t[1];
				}
			    }
			    if (strtoupper($t[0]) == "TXT" && isset($t[1]) && $t[1]){
				$txt .= $t[1];
			    }
			}
		    }
		    
		    if (count($ns) > 0){
			foreach ($ns as $v){
			    print_info( preg_match("/\.$/",$v) ? $v : $v.".", 'nserver' );
			}
		    }

		    $status = "unknown";
		    if( isset( $info['expires_in'] ) ){
			if ($info['expires_in'] > 0){
			    $status = "registered";
			}else{
			    $status = "expired";
			}
		    }
		    print_info( $status, 'status' );

		    if( isset( $info['expires_in'] ) ){
			print_info( sprintf( "%s blocks",$info['expires_in']), 'expires in' );
		    }
		    if( isset( $info['expires_at'] ) ){
			print_info( sprintf( "%s block",$info['expires_at']), 'expires at' );
		    }

		    if ( $txt ){
			print_info( preg_replace("/\n/","; ",$txt), 'info' );
		    }

		    if( isset( $info['address'] ) ){
			print_info( $info['address'], 'address' );
		    }
		    
		    if (isset($info['time'])){
			print_info( gmdate("Y-m-d\TH:i:s\Z", $info['time'] ), "created" );
		    }
		}elseif ($chain['chain'] == "sixeleven"){
		    if( isset( $info['name'] ) ){
			print_info( $info['name'], 'name' );
		    }

		    $status = "registered";
		    if( isset( $info['expired'] ) ){
			if ($info['expired'] === true || (int)$info['expired'] == 1){
			    $status = "expired";
			}else{
			    $status = "registered";
			}
		    }
		    if( isset( $info['expires_in'] ) ){
			print_info( sprintf( "%s blocks",$info['expires_in'] ), 'expires in' );
			if ((int)$info['expires_in'] < 0 && $status == "registered"){
			    $status = "expired";
			}
		    }
		    print_info( $status, 'status' );

		    if( isset( $info['value'] ) ){
			$value = @json_decode(trim(preg_replace("/:\"\[/",":[",preg_replace("/\"\]\"/","\"]",$info['value']))),true,512);
			$json_last_error = json_last_error();
			if ($value && !$json_last_error && is_array($value)){
			    if (isset($value['email'])){
				print_info( $value['email'], 'email' );
			    }
			    if (isset($value['a'])){
				print_info( $value['a'], 'admin-c' );
			    }
			    if (isset($value['t'])){
				print_info( $value['t'], 'tech-c' );
			    }
			    if (isset($value['r'])){
				print_info( $value['r'], 'registrant' );
			    }
			    if (isset($value['rr'])){
				print_info( $value['rr'], 'sponsoring registrar' );
			    }
			    if (isset($value['info'])){
				print_info( $value['info'], 'info' );
			    }
			    if (isset($value['loc'])){
				print_info( $value['loc'], 'geo loc' );
			    }
			    if (isset($value['tor'])){
				print_info( $value['tor'], 'tor' );
			    }
			    if (isset($value['ns'])){
				print_info( $value['ns'], 'nameserver' );
			    }
			}else{
			    if (preg_match("/^\{.*\}$/",$info['value'])){
				$info['value']="Error: Data decode failed";
				if ( DEBUG ){
				    $info['value'] .= sprintf(". Code %d (%s)",$json_last_error,json_last_error_msg());
				}
			    }
			    print_info( $info['value'], 'info' );
			}
		    }
		
		    if( isset( $info['address'] ) ){
			print_info( $info['address'], 'address' );
		    }
		    if( isset( $info['height'] ) ){
			print_info( $info['height'], 'height' );
		    }

		    if( isset( $info['txid'] ) && $status == "registered"){
			print_info( $info['txid'], 'txid' );
			unset( $data );
			$request = $chain['config'] + array('chain' => $chain['chain'], 'method'=> "getrawtransaction", 'txid'=> $info['txid']);
			$data = rpc_request( $request );
			if( !isset($data['error']) ){
			    if( isset( $data['result'] ) && isset( $data['result']['time'] ) ){
				print "\n";
				print_info( gmdate("Y-m-d\TH:i:s\Z", $data['result']['time'] ), "last update on" );
			    }
			}else{
			    if ( DEBUG ){
				print "\n";
				print_info( implode("; ",$data['error']), "last update on" );
			    }
			}
		    }
		}else{
		    print "% Unknown chain\n";
		}
	    }elseif( isset( $data['notfound'] ) ){
		print "% ".$data['notfound'] . "\n";
	    }
	}else{
	    print "% ERRORS:\n\t- ".implode("\n\t- ",$data['error']);
	}
    }else{
	print "% ERRORS:\n\t- ".implode("\n\t- ",$chain['error']);
    }
}
printf( "\n%% This query was served in %.3f sec\n\n", microtime( true ) - $start );

function init(){
    $errors = array();
    $path = realpath( dirname(__FILE__) );
    $path_config=$path."/whois_config.php";

    if (is_file($path_config)){
	if (!@include $path_config){
	    $errors[]=sprintf("config file %s can not be included",$path_config);
	}
    }else{
	$errors[]=sprintf("config file %s not found",$path_config);
    }

    if ( !defined( 'DEBUG' ) ){
	define( 'DEBUG', 0);
    }

    if ( DEBUG ){
	error_reporting(E_ALL);
    }else{
	ini_set('display_errors', 'off');
	error_reporting( 0 );
    }

    if ( !function_exists('curl_exec') ){
	$errors[]=sprintf("CURL not found... Visit http://www.php.net/manual/ru/book.curl.php%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
    }
    if ( !function_exists('mb_internal_encoding') ){
	$errors[]=sprintf("mbstring not found... Install php mbstring%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
    }

    if (count($errors) == 0){
	if (!isset($chain) || !is_array($chain) || count($chain) == 0){
	    $errors[]=sprintf("Chain configuration is not set, check configuration%s",DEBUG ? sprintf(" in %s (file: %s, function: %s, line: %s)",$path_config,__FILE__,__FUNCTION__,__LINE__) : "");
	}
    }

    if (count($errors) > 0){
	print "ERRORS:\n";
	printf("\t- %s\nexit...",implode("\n\t- ",$errors));
	exit;
    }
 return $chain;
}

function rpc_request( $p = array() ){
    $ret=array();
    $err=array();

    if ( !isset( $p['RPC_USER'] ) || !$p['RPC_USER'] ){
        $err[]=sprintf("RPC user not set, check config%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
    }
    if ( !isset( $p['RPC_PASS'] ) || !$p['RPC_PASS'] ){
        $err[]=sprintf("RPC password not set, check config%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
    }
    if ( !isset( $p['RPC_HOST'] ) || !$p['RPC_HOST'] ){
        $err[]=sprintf("RPC host is not set, check config%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
    }
    if ( !isset($p['RPC_PORT']) || !preg_match('/^\d{1,5}$/', $p['RPC_PORT']) ){
        $err[]=sprintf("RPC port is not set, check config%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
    }
    if ( !isset( $p['RPC_TIMEOUT'] ) || !preg_match('/^\d{1,5}$/',$p['RPC_TIMEOUT']) ){
        $p['RPC_TIMEOUT'] = 15;
    }

    if ( !isset($p['method']) || !$p['method']){
	$err[]=sprintf("RPC method not set%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
    }else{
	if ( $p['method'] == "name_show" ){
	    if ( !isset($p['domain']) || !$p['domain']){
		$err[]=sprintf("Domain name not set%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
	    }
	}elseif( $p['method'] == "getrawtransaction"){
	    if ( !isset($p['txid']) || !$p['txid']){
		$err[]=sprintf("txid not set%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
	    }
	}
    }

    if ( count($err) == 0 ){
	$request = array(
	    "jsonrpc" => "1.0",
	    "id" => microtime(true),
	    "method" => $p['method']
	);

	if ( $p['method'] == "name_show" ){
	    if (isset($p['chain']) && $p['chain'] == "namecoin"){
		$request['params'] = array( sprintf("d/%s",trim($p['domain'])) );
	    }elseif (isset($p['chain']) && $p['chain'] == "emercoin"){
		$request['params'] = array( sprintf("dns:%s",trim($p['domain'])) );
	    }elseif (isset($p['chain']) && $p['chain'] == "sixeleven"){
		$request['params'] = array( sprintf("d/%s",trim($p['domain'])) );
	    }else{
		$request['params'] = array( trim($p['domain']) );
	    }
	}elseif( $p['method'] == "getrawtransaction"){
	    if (isset($p['chain']) && $p['chain'] == "sixeleven"){
		$request['params'] = array( trim($p['txid']), 1 );
	    }else{
		$request['params'] = array( trim($p['txid']), true );
	    }
	}
	$data = @json_encode( $request );
	$curl = curl_init();
	curl_setopt( $curl, CURLOPT_URL, sprintf("http://%s:%d",$p['RPC_HOST'],$p['RPC_PORT']) );
	curl_setopt( $curl, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
	curl_setopt( $curl, CURLOPT_USERPWD, sprintf("%s:%s",$p['RPC_USER'],$p['RPC_PASS']));
	curl_setopt( $curl, CURLOPT_RETURNTRANSFER, true );
	curl_setopt( $curl, CURLOPT_TIMEOUT, $p['RPC_TIMEOUT'] );
	curl_setopt( $curl, CURLOPT_HTTPHEADER, array("Content-length: ".strlen( $data ),'Content-Type: text/plain') );
	mb_internal_encoding( 'UTF-8' );
	curl_setopt( $curl, CURLOPT_POST, true );
	curl_setopt( $curl, CURLOPT_POSTFIELDS, $data );
	curl_setopt( $curl, CURLOPT_HEADER, false );
	curl_setopt( $curl, CURLOPT_USERAGENT, sprintf("WHOIS client v%s", whoisVersion) );

	if ( DEBUG && defined( 'RPC_LOG' ) ){
	    curl_setopt( $curl, CURLOPT_STDERR, RPC_LOG );
	    curl_setopt( $curl, CURLOPT_VERBOSE, true );
	}

	$curlAnswer = curl_exec( $curl );
	$httpCode = (int)curl_getinfo( $curl, CURLINFO_HTTP_CODE );
	$curlCode = curl_errno( $curl );
	if ( $curlCode ){
	    $err[]=sprintf("RPC connection error code %d %s%s",$curlCode,curl_error( $curl ),DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
	}else{
	    if ($httpCode === 401){
		$err[]=sprintf("RPC request return %d Unauthorized%s",$httpCode,DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
	    }elseif ($httpCode === 403){
		$err[]=sprintf("RPC request return %d Forbidden%s",$httpCode,DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
	    }elseif ($httpCode !== 200){
		$descr = "";
		if( $curlAnswer && ( $data = @json_decode( $curlAnswer, true ) ) !== null ){
		    $descr=sprintf("RPC error code: %s Description: %s",isset($data['error']['code']) ? $data['error']['code'] : "unknown" , isset( $data['error']['message'] ) ? preg_replace( '/d\//', '', $data['error']['message'] ) : "none");
		}
		$err[]=sprintf("RPC request return code %d %s %s",$httpCode,$descr,DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
	    }
	    if ( count($err) == 0){
		if ( !$curlAnswer ){
		    $err[]=sprintf("RPC reply was empty%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
		}
	    }

	    if ( count($err) == 0){
		unset( $data );
		if( ( $data = @json_decode( $curlAnswer, true ) ) !== null ){
		    if( isset( $data['error'] ) ){
			if ( isset($data['error']['code']) && $data['error']['code'] == "-4"){
			    if (isset($p['chain']) && ($p['chain'] == "namecoin" || $p['chain'] == "sixeleven") ){
				$ret['notfound'] = preg_replace( '/d\//', '', isset( $data['error']['message'] ) ? preg_replace( '/d\//', '', $data['error']['message'] ) : "" );
			    }elseif (isset($p['chain']) && $p['chain'] == "emercoin"){
				$ret['notfound'] = isset( $data['error']['message'] ) ? $data['error']['message'].", name not found" : "";
			    }else{
				$ret['notfound'] = isset( $data['error']['message'] ) ? $data['error']['message'] : "";
			    }
			}else{
			    if ( DEBUG ){
				$err[]=sprintf("RPC error code: %s Description: %s (file: %s, function: %s, line: %s)",isset($data['error']['code']) ? $data['error']['code'] : "unknown" , isset( $data['error']['message'] ) ? preg_replace( '/d\//', '', $data['error']['message'] ) : "none",__FILE__,__FUNCTION__,__LINE__);
			    }else{
				$err[]="RPC return error";
			    }
			}
		    }else{
			if( isset( $data['result'] ) ){
			    $ret['result'] = $data['result'];
			}else{
			    $err[]=sprintf("No data received%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
			}
		    }
		}else{
		    if ( DEBUG ){
			$err[]=sprintf("Data decode error code: %s Description: %s (file: %s, function: %s, line: %s)",json_last_error(),json_last_error_msg(),__FILE__,__FUNCTION__,__LINE__);
		    }else{
			$err[]=sprintf("Received data unknown%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
		    }
		}
	    }
	}
	curl_close( $curl );
    }

    if ( count($err) > 0 ){
	$ret['error']=$err;
    }
 return $ret;
}

function print_info( $value, $sub='' ){
    $value = is_string($value) ? trim( $value ) : $value;
    if( ( $text =  @json_decode( $value, true, 512 ) ) === null ){
	$text = $value;
    }
    if( is_array( $text ) ){
	foreach( $text as $k => $val ){
	    if( preg_match( '/^\d+$/', $k ) ){
		print_info( $val, sprintf( "%s", $sub ) );
	    }else{
		print_info( $val, sprintf( "%s", $k ) );
	    }
	}
    }else{
	if( $value != '' ){
	    printf( "% -18s", sprintf( "%s:", $sub ) );
	    printf( "%s\n", $value );
	}
    }
}

function select_chain( $domain = ""){
    global $config;
    $ret = array('domain' => '', 'chain' => '', 'config' => array());
    $err = array();

    if (!$domain){
	$err[]=sprintf("Domain name is not set%s",DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
    }

    if (count($err) == 0){
	if( count( explode( ".",$domain ) ) > 1 ){
	    $tmp = explode( ".",$domain );
	    $name = $tmp[count( $tmp ) - 2];
	}
	if (preg_match("/\.bit$/",$domain)){
	    if( preg_match( '/^[a-z]([a-z0-9-]{0,62}[a-z0-9])?$/', $name ) ){
		$ret['domain'] = $name;
		$ret['chain'] = 'namecoin';
		$ret['config'] = isset($config[$ret['chain']]) ? $config[$ret['chain']] : array();
	    }else{
		$err[]=sprintf("%% wrong format of domain name %s%s", $domain,DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
	    }
	}elseif(preg_match("/\.(coin|emc|lib|bazar)$/",$domain)){
	    if( preg_match( '/^([a-z0-9-]{0,62}[a-z0-9])?$/', $name ) ){
		$ret['domain'] = $domain;
		$ret['chain'] = 'emercoin';
		$ret['config'] = isset($config[$ret['chain']]) ? $config[$ret['chain']] : array();
	    }else{
		$err[]=sprintf("%% wrong format of domain name %s%s", $domain,DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
	    }
	}elseif (preg_match("/(\S+)\.611\.to$/",$domain,$m)){
		$name = $m[1];
	    if( preg_match( '/^[a-z]([a-z0-9-]{0,62}[a-z0-9])?$/', $name ) ){
		$ret['domain'] = $name;
		$ret['chain'] = 'sixeleven';
		$ret['config'] = isset($config[$ret['chain']]) ? $config[$ret['chain']] : array();
	    }else{
		$err[]=sprintf("%% wrong format of domain name %s%s", $domain,DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
	    }
	}
    }

    if (count($err) == 0){
	if (isset($ret['chain']) && $ret['chain']){
	    if (!isset($config[$ret['chain']])){
		$err[]=sprintf("Domain %s belong to unknown chain%s",$domain,DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
	    }
	}else{
	    $err[]=sprintf("Domain %s belong to unknown chain%s",$domain,DEBUG ? sprintf(" (file: %s, function: %s, line: %s)",__FILE__,__FUNCTION__,__LINE__) : "");
	}
    }

    if (count($err) > 0){
	$ret['error']=$err;
    }
 return $ret;
}

?>