var when = require( "when" );
var machina = require( "machina" );
var bigInt = require( "big-integer" );

var HiLoFsm = machina.Fsm.extend( {

	initialState: "acquiring",

	states: {
		acquiring: {
			_onEnter: function() {
				this.getNextHival().then( function( hv ) {
					this.hival = bigInt( hv.next_hi );
					this.lo = ( this.hival === 0 ) ? 1 : 0;
					this.hi = this.hival.times( this.maxLo + 1 );
					this.transition( "ready" );
				}.bind( this ) );
			},
			nextId: function() {
				this.deferUntilTransition( "ready" );
			}
		},
		ready: {
			nextId: function getNextId( done ) {
				var val = this.hi.add( this.lo++ );
				if ( this.lo > this.maxLo ) {
					this.transition( "acquiring" );
				}
				done( null, val.toString() );
			}
		}
	},

	nextId: function() {
		return when.promise( function( resolve, reject ) {
			this.handle( "nextId", function( err, val ) {
				if ( err ) {
					return reject( err );
				}
				resolve( val );
			} );
		}.bind( this ) );
	}
} );

module.exports = function( seriate, config ) {
	var hiloFsm = new HiLoFsm( {
		initialize: function() {
			this.maxLo = config.hilo.maxLo;
			this.hi = undefined;
			this.lo = undefined;
			this.hival = undefined;
			this.getNextHival = function() {
				return seriate.first( config.sql, {
					preparedSql: seriate.fromFile( "./sql/nexthi.sql" )
				} );
			};
		}
	} );

	var hilo = {
		nextId: function() {
			return hiloFsm.nextId();
		}
	};

	Object.defineProperty(
		hilo,
		"hival",
		{
			enumerable: true,
			get: function() {
				return hiloFsm.hival.toString();
			}
		}
	);

	return hilo;
};
