var cfg = require( "./intTestDbCfg.json" );
var seriate = require( "seriate" );
var hilo = require( "../../src" )( seriate, cfg );
function createZeRecord( i ) {
	i = i || 1;
	hilo.nextId().then( function( id ) {
		const msg = `${ process.pid } | Saved ZeModel #${ id } (hival: ${ hilo.hival }) - ${ i }`;
		return seriate.execute( cfg.sql, {
			preparedSql: "INSERT INTO dbo.ZeModel (Id, Text) values (@id, @txt)",
			params: {
				id: {
					type: seriate.BigInt,
					val: id
				},
				txt: {
					type: seriate.NVARCHAR,
					val: msg
				}
			}
		} ).then( function() {
			if ( i < cfg.test.recordsToCreate ) {
				createZeRecord( ++i );
			} else {
				process.exit( 0 ); // eslint-disable-line no-process-exit
			}
		}, console.log ); // eslint-disable-line no-console
	} );
}

createZeRecord();
