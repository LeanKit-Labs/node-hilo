describe( "createTediousConfig", () => {
	let subject;
	beforeEach( () => {
		subject = require( "../../src/createTediousConfig" );
	} );

	it( "should set all properties", () => {
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
			encrypt: "ENCRYPT"
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
				rowCollectionOnRequestCompletion: true,
				useColumnNames: true,
				abortTransactionOnError: true,
				enableArithAbort: false
			}
		} );
	} );

	it( "should set the auth to default when domain is not provided", () => {
		subject( {} ).authentication.type.should.eql( "default" );
	} );

	it( "should set the server name from the host when server is not provided", () => {
		subject( { host: "HOST" } ).server.should.eql( "HOST" );
	} );
} );
