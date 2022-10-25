const tedious = require( "tedious" );

module.exports = config => {
	const connection = new Promise( ( resolve, reject ) => {
		const conn = new tedious.Connection( {
			server: config.sql.server,
			authentication: {
				type: "default",
				options: {
					userName: config.sql.user,
					password: config.sql.password
				}
			},
			options: {
				database: config.sql.database,
				encrypt: false,
				useColumnNames: true,
				rowCollectionOnRequestCompletion: true,
				enableArithAbort: false
			}
		} );
		conn.on( "connect", err => {
			if ( err ) {
				return reject( err );
			}
			resolve( conn );
		} );
		conn.connect();
	} );

	return async query => {
		const conn = await connection;
		return new Promise( ( resolve, reject ) => {
			const request = new tedious.Request( query, ( e, rowCount, results ) => {
				if ( e ) {
					reject( e );
				}
				resolve( results );
			} );
			conn.execSql( request );
		} );
	};
};
