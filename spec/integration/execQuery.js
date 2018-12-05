const tedious = require( "tedious" );

module.exports = config => {
	return async query => {
		return new Promise( ( resolve, reject ) => {
			const connection = new tedious.Connection( {
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
					rowCollectionOnRequestCompletion: true
				}
			} );

			connection.on( "connect", err => {
				if ( err ) {
					reject( err );
				}
				const request = new tedious.Request( query, ( e, rowCount, results ) => {
					if ( e ) {
						reject( e );
					}
					connection.close();
					resolve( results );
				} );

				connection.execSql( request );
			} );
		} );
	};
};
