describe( "createTediousConfig", function() {
	let subject;

	beforeEach( function() {
		subject = require( "../../src/createTediousConfig" );
	} );

	it( "should set all properties", function() {
		subject( {
			user: "USER",
			password: "PASSWORD",
			server: "SERVER",
			domain: "DOMAIN",
			host: "HOST",
			port: "PORT",
			database: "DATABASE",
			connectTimeout: "CONNECTTIMEOUT",
			requestTimeout: "REQUESTTIMEOUT",
			encrypt: "ENCRYPT",
			multiSubnetFailover: "MULTISUBNETFAILOVER"
		} ).should.eql( {
			server: "SERVER",
			authentication: {
				type: "ntlm",
				options: {
					userName: "USER",
					password: "PASSWORD",
					domain: "DOMAIN"
				}
			},
			options: {
				port: "PORT",
				database: "DATABASE",
				connectTimeout: "CONNECTTIMEOUT",
				requestTimeout: "REQUESTTIMEOUT",
				encrypt: "ENCRYPT",
				multiSubnetFailover: "MULTISUBNETFAILOVER",
				rowCollectionOnRequestCompletion: true,
				useColumnNames: true,
				abortTransactionOnError: true,
				enableArithAbort: false
			}
		} );
	} );

	it( "should set the auth to default when domain is not provided", function() {
		subject( {} ).authentication.type.should.eql( "default" );
	} );

	it( "should set the server name from the host when server is not provided", function() {
		subject( { host: "HOST" } ).server.should.eql( "HOST" );
	} );
} );
