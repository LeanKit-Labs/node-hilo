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
		it( "should let all clients create keys without errors or conflicts", async function( ) {
			this.timeout( 600000 );
			const { execa } = await import( "execa" );
			const clients = Array.from( { length: 6 }, () => execa( "node", [ "./spec/integration/testClient.js" ] ) );
			await Promise.all( clients );

			const results = await execQuery( "SELECT COUNT(DISTINCT ID) AS cnt FROM ZeModel" );
			const numberOfRows = results[ 0 ].cnt.value;
			numberOfRows.should.equal( clients.length * config.test.recordsToCreate );
		} );
	} );
} );
