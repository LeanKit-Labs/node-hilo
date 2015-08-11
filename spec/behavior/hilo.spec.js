require( "../setup" );

function getDataStub( nextHiVal ) {
	function generateStub() {
		var hival = typeof nextHiVal === "function" ? nextHiVal() : nextHiVal.toString();
		var dataStub = {
			transaction: {
				commit: function() {
					return {
						then: function( cb ) {
							dataStub.sets.__result__ = [ { next_hi: hival } ];
							return cb();
						}
					};
				}
			},
			sets: {
				__result__: [ ]
			}
		};

		return dataStub;
	}

	return {
		then: function( cb ) {
			return cb( generateStub() );
		}
	};
}

describe( "node-hilo - unit tests", function() {
	describe( "generated unit tests", function() {
		var hivals = [ "0", "1", "10", "100", "1000", "10000", "100000", "1000000", "10000000", "100000000", "1000000000" ].map( function( x ) {
			return bigInt( x, 10 );
		} );

		hivals.forEach( function( startHival ) {
			describe( "when hival starts at " + startHival, function() {
				[ 0, 1, 3, 5, 10, 100 ].forEach( function( maxLo ) {
					describe( "with a maxLo of " + maxLo, function() {
						var hilo, hival, spy;
						var idCount = maxLo * 10;
						var maxLoPlusOne = maxLo + 1;
						var expCallCount = Math.ceil( idCount / maxLoPlusOne ) + ( idCount % maxLoPlusOne === 0 ? 1 : 0 );
						before( function() {
							hival = bigInt( startHival.toString() );
							function getNextHiVal() {
								var val = hival.toString();
								hival = hival.add( 1 );
								return val;
							}
							var stubiate = {
								executeTransaction: function() {
									return getDataStub( getNextHiVal );
								},
								fromFile: function() {}
							};
							spy = sinon.spy( stubiate, "executeTransaction" );
							hilo = getHiloInstance( stubiate, { hilo: { maxLo: maxLo } } );
						} );
						it( "should return expected ids for the given range", function() {
							return getIds( idCount, hilo ).then( function( ids ) {
								ids.should.eql( getExpected( idCount, ( startHival.times( maxLoPlusOne ) ) ) );

								if ( idCount > 0 ) {
									spy.callCount.should.equal( Math.ceil( expCallCount ) );
									hilo.hival.should.equal( startHival.add( expCallCount ).subtract( 1 ).toString() );
								} else {
									spy.callCount.should.equal( 0 );
									should.not.exist( hilo.hival );
								}
							} );
						} );
					} );
				} );
			} );
		} );
	} );

	describe( "when the DB call for next hival fails", function() {
		describe( "with an exception provided", function() {
			var hilo;
			before( function() {
				var stubiate = {
					executeTransaction: function() {
						return when.reject( new Error( "Databass not OK" ) );
					},
					fromFile: function() {}
				};
				hilo = getHiloInstance( stubiate, { hilo: { maxLo: 10 } } );
			} );
			it( "should reject", function() {
				return hilo.nextId().should.be.rejectedWith( /Databass not OK/ );
			} );
		} );

		describe( "with no exception provided", function() {
			var hilo;
			before( function() {
				var stubiate = {
					executeTransaction: function() {
						return when.reject();
					},
					fromFile: function() {}
				};
				hilo = getHiloInstance( stubiate, { hilo: { maxLo: 10 } } );
			} );
			it( "should reject", function() {
				return hilo.nextId().should.be.rejectedWith( /An unknown error has occurred/ );
			} );
		} );

		describe( "with resetDelay of 100ms", function() {
			var dbCalls = 0;
			var hilo;

			before( function() {
				var stubiate = {
					executeTransaction: function() {
						// First call fails
						return dbCalls++ ? getDataStub( 100000 ) : when.reject();
					},
					fromFile: function() {}
				};
				hilo = getHiloInstance( stubiate, { hilo: { maxLo: 10, retryDelay: 100 } } );
			} );

			it( "should fail on first call", function() {
				hilo.nextId().should.be.rejectedWith( /An unknown error has occurred/ );
				dbCalls.should.equal( 1 );
			} );

			it( "should fail immediately if called again in less 100ms", function() {
				hilo.nextId().should.be.rejectedWith( /An unknown error has occurred/ );
				dbCalls.should.equal( 1 );
			} );

			it( "should succeed if called after 100ms", function( done ) {
				setTimeout( function() {
					hilo.nextId().then( function( id ) {
						dbCalls.should.equal( 2 );
						id.should.equal( "1100000" );
						done();
					}, done );
				}, 101 );
			} );
		} );
	} );

	describe( "when the DB doesn't return a valid hival", function() {
		var hilo, spy, dbHival;
		before( function() {
			var stubiate = {
				executeTransaction: function() {
					return {
						then: function() {
							return when( { next_hi: dbHival } );
						}
					};
				},
				fromFile: function() {}
			};
			spy = sinon.spy( stubiate, "executeTransaction" );
			hilo = getHiloInstance( stubiate, { hilo: { maxLo: 10 } } );
		} );

		it( "should reject if an empty string is returned", function() {
			dbHival = "";
			return hilo.nextId().should.be.rejectedWith( /Invalid hival returned from database/ );
		} );

		it( "should reject if an undefined is returned", function() {
			dbHival = undefined;
			return hilo.nextId().should.be.rejectedWith( /Invalid hival returned from database/ );
		} );

		it( "should reject if an null is returned", function() {
			dbHival = null;
			return hilo.nextId().should.be.rejectedWith( /Invalid hival returned from database/ );
		} );
	} );
} );
