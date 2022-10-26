
const hiLoFsm = require( "./hiloFsm" );

module.exports = config => {
	const hiloFsm = hiLoFsm( config );

	const hilo = {
		nextId() {
			return hiloFsm.nextId();
		},
		nextIds( length ) {
			return Promise.all( Array.from( { length }, () => hiloFsm.nextId() ) );
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

