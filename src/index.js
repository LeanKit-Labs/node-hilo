var machina = require( "machina" );
var bigInt = require( "big-integer" );
var util = require( "util" );
var _ = require( "lodash" );

function HiloGenerationError() {
	this.message = util.format.apply( null, arguments );
	this.name = "HiloGenerationError";
}
HiloGenerationError.prototype = Object.create( Error.prototype );
HiloGenerationError.prototype.constructor = HiloGenerationError;

function transitionToFailure( err ) {
	this.err = err;
	this.transition( "dbFailure" );
}

function processHiValResponse( hv ) {
	if ( hv.next_hi === null || typeof hv.next_hi === "undefined" || hv.next_hi.length === 0 ) {
		return transitionToFailure.call( this, new HiloGenerationError( `Invalid hival returned from database: ${ hv.next_hi }` ) );
	}
	this.hival = bigInt( hv.next_hi );
	this.lo = ( this.hival.equals( 0 ) ) ? 1 : 0;
	this.hi = this.hival.times( this.maxLo + 1 );
	this.retryDelay = 1;
	this.transition( "ready" );
}

var HiLoFsm = machina.Fsm.extend( {

	initialState: "uninitialized",

	states: {
		uninitialized: {
			nextId() {
				this.deferUntilTransition();
				this.transition( "acquiring" );
			}
		},
		acquiring: {
			_onEnter() {
				this.getNextHival()
					.then( processHiValResponse.bind( this ), transitionToFailure.bind( this ) );
			},
			nextId() {
				this.deferUntilTransition();
			}
		},
		dbFailure: {
			_onEnter() {
				this.timer = setTimeout( () => {
					this.handle( "clearErrorState" );
				}, this.retryDelay );
				this.retryDelay = Math.min( this.retryDelay * 2, this.maxRetryDelay );
			},
			clearErrorState: "uninitialized",
			_onExit() {
				clearTimeout( this.timer );
			},
			nextId( done ) {
				done( this.err || new HiloGenerationError( "An unknown error has occurred." ) );
			}
		},
		ready: {
			nextId: function getNextId( done ) {
				const val = this.hi.add( this.lo++ );
				if ( this.lo > this.maxLo ) {
					this.transition( "acquiring" );
				}
				done( null, val.toString() );
			}
		}
	},

	nextId() {
		return new Promise( ( resolve, reject ) => {
			this.handle( "nextId", ( err, val ) => {
				if ( err ) {
					return reject( err );
				}
				resolve( val );
			} );
		} );
	}
} );

module.exports = function( seriate, config ) {
	const hiloFsm = new HiLoFsm( {
		initialize() {
			this.maxLo = config.hilo.maxLo;
			this.maxRetryDelay = config.hilo.maxRetryDelay || 5000;
			this.retryDelay = 1;
			this.table = config.hilo.table || "dbo.hibernate_unique_key";

			const query = _.template( seriate.fromFile( "./sql/nexthi.sql" ) )( {
				TABLE: this.table
			} );

			this.getNextHival = function() {
				return seriate.executeTransaction( config.sql, {
					query
				} ).then( function( data ) {
					return data.transaction.commit()
						.then( function() {
							return data.sets.__result__[ 0 ];
						} );
				} );
			};
		}
	} );

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
