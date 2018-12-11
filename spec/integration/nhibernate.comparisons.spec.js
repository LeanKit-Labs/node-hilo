const processes = require( "processhost" )();
const config = require( "./intTestDbCfg.json" );
const hiloFactory = require( "../../src" );
const fs = require( "fs" );
const path = require( "path" );
const execQuery = require( "./execQuery" )( config );

describe( "node-hilo integration tests", function() {
	beforeEach( async () => {
		const sql = fs.readFileSync( path.join( __dirname, "dbSetup.sql" ), "UTF8" );
		await execQuery( sql );
	} );

	describe( "when compared to a range of 10k NHibernate-generated keys", function() {
		const comparisons = [
			{ file: "../data/nhibernate.hival0.json", hival: "0" },
			{ file: "../data/nhibernate.hival10000.json", hival: "10000" },
			{ file: "../data/nhibernate.hival_1trillion.json", hival: "1000000000000" }
		];

		comparisons.forEach( function( comparison ) {
			describe( `with a starting hival of ${ comparison.hival }`, function() {
				let hilo;
				beforeEach( async () => {
					const query = `UPDATE dbo.hibernate_unique_key WITH(rowlock,updlock) SET next_hi = ${ comparison.hival }`;
					await execQuery( query );
					hilo = hiloFactory( config );
				} );

				it( "should match nhibernate's keys exactly", async function() {
					this.timeout( 20000 );
					const ids = await hilo.nextIds( 10000 );
					ids.should.eql( require( comparison.file ).nhibernate_keys );
				} );
			} );
		} );
	} );

	describe( "when multiple hilo clients are writing against a database (be patient, this could take a bit!)", function() {
		let nodeClient;
		before( function() {
			this.timeout( 600000 );
			nodeClient = {
				command: "node",
				args: [ "./spec/integration/testClient.js" ],
				restartLimit: false,
				start: true,
				restart: false
			};
		} );

		it( "should let all clients create keys without errors or conflicts", function( done ) {
			this.timeout( 600000 );
			let stopped = 0;
			let running = 0;
			processes.setup( {
				clientA: nodeClient,
				clientB: nodeClient,
				clientC: nodeClient,
				clientD: nodeClient,
				clientE: nodeClient,
				clientF: nodeClient
			} ).then( function( handles ) {
				running = handles.length;
				handles.forEach( function( handle ) {
					handle.on( "crashed", function() {
						handle.stop();
						stopped++;
						if ( stopped === running ) {
							execQuery( "SELECT COUNT(DISTINCT ID) AS cnt FROM ZeModel" ).then( results => {
								const numberOfRows = results[ 0 ].cnt.value;
								numberOfRows.should.equal( handles.length * config.test.recordsToCreate );
								done();
							}, console.log ); /* eslint-disable-line no-console */
						}
					} );
				} );
			} );
		} );
	} );
} );
