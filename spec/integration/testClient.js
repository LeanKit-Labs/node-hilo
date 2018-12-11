var config = require( "./intTestDbCfg.json" );
var hilo = require( "../../src" )( config );
const execQuery = require( "./execQuery" )( config );

async function createZeRecord( i = 1 ) {
	const id = await hilo.nextId();
	const msg = `${ process.pid } | Saved ZeModel #${ id } (hival: ${ hilo.hival }) - ${ i }`;

	await execQuery( `INSERT INTO dbo.ZeModel (Id, Text) values (${ id }, '${ msg }')` );
	if ( i < config.test.recordsToCreate ) {
		await createZeRecord( ++i );
	} else {
		process.exit( 0 ); // eslint-disable-line no-process-exit
	}
}

createZeRecord();
