const _ = require( "lodash" );

const hiLoFsm = require( "./hiloFsm" );

module.exports = config => {
	const hiloFsm = hiLoFsm( config );

	const hilo = {
		nextId() {
			return hiloFsm.nextId();
		},
		nextIds( count ) {
			return Promise.all( _.times( count, () => { return hiloFsm.nextId(); } ) );
		}
	};

	Object.defineProperty( hilo, "hival", {
		enumerable: true,
		get() {
			return hiloFsm.hival && hiloFsm.hival.toString();
		}
	} );

	Object.defineProperty( hilo, "retryDelay", {
		enumerable: true,
		get() {
			return hiloFsm.retryDelay;
		}
	} );

	return hilo;
};

