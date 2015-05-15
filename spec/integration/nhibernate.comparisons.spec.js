var processes = require( "processhost" )();
var seriate = require( "seriate" );

describe( "node-hilo integration tests", function() {
	describe( "when compared to a range of 10k NHibernate-generated keys", function() {
		var comparisons = [
			{ file: "../helpers/nhibernate.hival0.json", hival: "0" },
			{ file: "../helpers/nhibernate.hival10000.json", hival: "10000" },
			{ file: "../helpers/nhibernate.hival_1trillion.json", hival: "1000000000000" }
		];

		comparisons.forEach( function( comparison ) {
			describe( "with a starting hival of " + comparison.hival, function() {
				var hilo, hival;
				before( function() {
					hival = bigInt( comparison.hival );
					var stubiate = {
						first: function() {
							var val = { next_hi: hival.toString() };
							hival = hival.add( 1 );
							return when( val );
						},
						fromFile: function() {}
					};
					hilo = getHiloInstance( stubiate, { hilo: { maxLo: 100 } } );
				} );
				it( "should match nhibernate's keys exactly", function() {
					this.timeout( 20000 );
					return getIds( 10000, hilo ).then( function( ids ) {
						ids.should.eql( require( comparison.file ).nhibernate_keys );
					} );
				} );
			} );
		} );
	} );
	describe( "when multiple hilo clients are writing against a database (be patient, this could take a bit!)", function() {
		var nodeClient, cfg;
		before( function() {
			nodeClient = {
				command: "node",
				args: [ "./spec/integration/testClient.js" ],
				restartLimit: false,
				start: true,
				restart: false
			};
			cfg = require( "./intTestDbCfg.json" );
			return when.promise( function( resolve, reject ) {
				seriate.getPlainContext( cfg.sql )
					.step( "drop-hibernate_unique_key", {
						query: seriate.fromFile( "./NhibernateTable-Drop.sql" )
					} )
					.step( "create-hibernate_unique_key", {
						query: seriate.fromFile( "./NhibernateTable-Create.sql" )
					} )
					.step( "drop-ZeModel", {
						query: seriate.fromFile( "./ZeModelTable-Drop.sql" )
					} )
					.step( "create-ZeModel", {
						query: seriate.fromFile( "./ZeModelTable-Create.sql" )
					} )
					.step( "StartingHival", {
						preparedSql: "INSERT INTO hibernate_unique_key SELECT @hival",
						params: {
							hival: {
								type: seriate.BIGINT,
								val: cfg.test.startingHiVal
							}
						}
					} )
					.end( function( sets ) {
						resolve();
					} )
					.error( function( err ) {
						reject( err );
					} );
			} );
		} );
		it( "should let all clients create keys without errors or conflicts", function( done ) {
			this.timeout( 600000 );
			var stopped = 0;
			var running = 0;
			processes.setup( {
				clientA: nodeClient,
				clientB: nodeClient,
				clientC: nodeClient
			} ).then( function( handles ) {
				running = handles.length;
				handles.forEach( function( handle ) {
					handle.on( "crashed", function() {
						handle.stop();
						stopped++;
						if ( stopped === running ) {
							seriate.first( cfg.sql, {
								query: "SELECT COUNT(DISTINCT ID) AS cnt FROM ZeModel"
							} ).then( function( data ) {
								data.cnt.should.equal( handles.length * cfg.test.recordsToCreate );
								done();
							}, console.log );
						}
					} );
				} );
			} );
		} );
	} );
} );
