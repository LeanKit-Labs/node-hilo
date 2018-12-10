"use strict";

const machina = require( "machina" );
const bigInt = require( "big-integer" );
const { Connection, Request } = require( "tedious" );
const HiloGenerationError = require( "./HiloGenerationError" );
const fs = require( "fs" );
const path = require( "path" );
const createTediousConfig = require( "./createTediousConfig" );
const _ = require( "lodash" );

module.exports = ( { sql, hilo: { maxLo = 100, maxRetryDelay = 5000, table = "dbo.hibernate_unique_key" } = {} } ) => {
	const tediousConfig = createTediousConfig( sql );
	let retryDelay = 1;

	var fsm = new machina.Fsm( {
		initialize() {
			const query = _.template( fs.readFileSync( path.join( __dirname, "/sql/nexthi.sql" ) ) )( {
				TABLE: table
			} );

			this.getNextHival = function() {
				return new Promise( ( resolve, reject ) => {
					const request = new Request( query, ( requestError, rowCount, results ) => {
						if ( requestError ) {
							return reject( requestError );
						}
						resolve( _.get( results, [ "0", "next_hi", "value" ] ) );
					} );
					this.connection.execSql( request );
				} );
			};
		},
		initialState: "uninitialized",
		_transitionToFailure( err ) {
			this.err = err;
			this.transition( "dbFailure" );
		},
		_processHiValResponse( val ) {
			if ( val === null || typeof val === "undefined" || val.length === 0 ) {
				return this._transitionToFailure( new HiloGenerationError( `Invalid hival returned from database: ${ val }` ) );
			}
			this.hival = bigInt( val );
			this.lo = ( this.hival.equals( 0 ) ) ? 1 : 0;
			this.hi = this.hival.times( maxLo + 1 );
			retryDelay = 1;
			this.transition( "ready" );
		},

		states: {
			uninitialized: {
				nextId() {
					this.deferUntilTransition();
					this.transition( "connecting" );
				}
			},
			connecting: {
				_onEnter() {
					try {
						this.connection = new Connection( tediousConfig );
						this.connection.once( "connect", connError => {
							if ( connError ) {
								this.err = connError;
								return this.handle( "connectionFailure" );
							}
							this.connection.once( "error", () => {
								this.connection = null;
							} );
							this.connection.once( "end", () => {
								this.connection = null;
							} );
							this.handle( "connectionSuccess" );
						} );
					} catch ( e ) {
						this.err = e;
						this.handle( "connectionFailure" );
					}
				},
				nextId() {
					this.deferUntilTransition();
				},
				connectionFailure: "dbFailure",
				connectionSuccess: "acquiring"
			},
			acquiring: {
				_onEnter() {
					this.getNextHival()
						.then( this._processHiValResponse.bind( this ), this._transitionToFailure.bind( this ) );
				},
				nextId() {
					this.deferUntilTransition();
				}
			},
			dbFailure: {
				_onEnter() {
					this.timer = setTimeout( () => {
						this.handle( "clearErrorState" );
					}, retryDelay );
					retryDelay = Math.min( retryDelay * 2, maxRetryDelay );
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
					if ( this.lo > maxLo ) {
						this.transition( this.connection ? "acquiring" : "connecting" );
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

	return fsm;
};
