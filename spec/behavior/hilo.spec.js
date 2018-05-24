require( "../setup" );
var seriate = require( "seriate" );
function getDataStub( nextHiVal ) {
	function generateStub() {
		const hival = typeof nextHiVal === "function" ? nextHiVal() : nextHiVal.toString();
		var dataStub = {
			transaction: {
				commit() {
					return {
						then( cb ) {
							dataStub.sets.__result__ = [ { next_hi: hival } ]; // eslint-disable-line camelcase
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
		then( cb ) {
			return cb( generateStub() );
		}
	};
}

describe.only( "node-hilo - unit tests", function() {
	describe( "when using a custom hilo table", function() {
		let hilo;
		before( function() {
			seriate.executeTransaction = sinon.stub( seriate, "executeTransaction" ).resolves( getDataStub( 100 ) );
			hilo = getHiloInstance( seriate, { hilo: { maxLo: 10, table: "dbo.HILO_TABLE" } } );
			return hilo.nextId();
		} );

		it( "should call execute with the correct sql query", function() {
			const sql = seriate.executeTransaction.getCall( 0 ).args[ 1 ].preparedSql;
			sql.should.equal( "\nSELECT [next_hi]\nFROM dbo.HILO_TABLE WITH(rowlock,updlock);\nUPDATE dbo.HILO_TABLE\nSET [next_hi] = [next_hi] + 1\n" );
		} );

		after( function() {
			seriate.executeTransaction.restore();
		} );
	} );

	describe( "generated unit tests", function() {
		const hivals = [ "0", "1", "10", "100", "1000", "10000", "100000", "1000000", "10000000", "100000000", "1000000000" ].map( function( x ) {
			return bigInt( x, 10 );
		} );

		hivals.forEach( function( startHival ) {
			describe( `when hival starts at ${ startHival }`, function() {
				[ 0, 1, 3, 5, 10, 100 ].forEach( function( maxLo ) {
					describe( `with a maxLo of ${ maxLo }`, function() {
						let hilo, hival, spy;
						const idCount = maxLo * 10;
						const maxLoPlusOne = maxLo + 1;
						const expCallCount = Math.ceil( idCount / maxLoPlusOne ) + ( idCount % maxLoPlusOne === 0 ? 1 : 0 );
						before( function() {
							hival = bigInt( startHival.toString() );
							function getNextHiVal() {
								const val = hival.toString();
								hival = hival.add( 1 );
								return val;
							}

							const stubiate = {
								executeTransaction() {
									return getDataStub( getNextHiVal );
								},

								fromFile() {}
							};
							spy = sinon.spy( stubiate, "executeTransaction" );
							hilo = getHiloInstance( stubiate, { hilo: { maxLo } } );
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
			let hilo;
			before( function() {
				const stubiate = {
					executeTransaction() {
						return when.reject( new Error( "Databass not OK" ) );
					},

					fromFile() {}
				};
				hilo = getHiloInstance( stubiate, { hilo: { maxLo: 10 } } );
			} );

			it( "should reject", function() {
				return hilo.nextId().should.be.rejectedWith( /Databass not OK/ );
			} );
		} );

		describe( "with no exception provided", function() {
			let hilo;
			before( function() {
				const stubiate = {
					executeTransaction() {
						return when.reject();
					},

					fromFile() {}
				};
				hilo = getHiloInstance( stubiate, { hilo: { maxLo: 10 } } );
			} );

			it( "should reject", function() {
				return hilo.nextId().should.be.rejectedWith( /An unknown error has occurred/ );
			} );
		} );
	} );

	describe( "when the DB doesn't return a valid hival", function() {
		let hilo, dbHival;
		before( function() {
			const stubiate = {
				executeTransaction() {
					return {
						then() {
							return when( { next_hi: dbHival } ); // eslint-disable-line camelcase
						}
					};
				},

				fromFile() {}
			};
			sinon.spy( stubiate, "executeTransaction" );
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

	describe( "when a DB failure is followed by success", function() {
		let succeed = false;
		let dbCalls = 0;
		let hilo;

		before( function() {
			const stubiate = {
				executeTransaction() {
					dbCalls++;
					return succeed ? getDataStub( 100000 ) : when.reject();
				},

				fromFile() {}
			};
			hilo = getHiloInstance( stubiate, { hilo: { maxLo: 10 } } );
		} );

		it( "should double the retryDelay on failure", function() {
			succeed = false;
			return hilo.nextId().should.be.rejectedWith( /An unknown error has occurred/ ).then( function() {
				hilo.retryDelay.should.equal( 2 );
				dbCalls.should.equal( 1 );
			} );
		} );

		it( "should reset the retryDelay on success", function( done ) {
			succeed = true;
			setTimeout( function() {
				hilo.nextId().then( function( id ) {
					hilo.retryDelay.should.equal( 1 );
					dbCalls.should.equal( 2 );
					id.should.equal( "1100000" );
					done();
				}, done );
			}, hilo.retryDelay + 1 );
		} );
	} );

	describe( "with DB consistently failing", function() {
		let succeed = false;
		let dbCalls = 0;
		let hilo;

		before( function() {
			const stubiate = {
				executeTransaction() {
					dbCalls++;
					return succeed ? getDataStub( 100000 ) : when.reject();
				},

				fromFile() {}
			};
			hilo = getHiloInstance( stubiate, { hilo: { maxLo: 10, maxRetryDelay: 100 } } );
		} );

		it( "should double the retryDelay on failure", function( done ) {
			succeed = false;
			let call = 0;
			function tryNextId() {
				call++;
				hilo.nextId().should.be.rejectedWith( /An unknown error has occurred/ ).then( function() {
					hilo.retryDelay.should.equal( Math.pow( 2, call ) );
					dbCalls.should.equal( call );

					// First 6 failures should take us to a retryDelay of 64ms
					if ( call < 6 ) {
						setTimeout( tryNextId, hilo.retryDelay + 1 );
					} else {
						done();
					}
				}, done );
			}

			tryNextId();
		} );

		it( "should cap retryDelay at maxRetryDelay", function( done ) {
			succeed = false;
			setTimeout( function() {
				hilo.nextId().should.be.rejectedWith( /An unknown error has occurred/ ).then( function() {
					// 7th call would have bumped us to 128ms without a maxRetryDelay of 100
					hilo.retryDelay.should.equal( 100 );
					dbCalls.should.equal( 7 );
					done();
				}, done );
			}, hilo.retryDelay + 1 );
		} );

		it( "should fail without hitting DB if called before retryDelay expires", function() {
			succeed = true;
			return hilo.nextId().should.be.rejectedWith( /An unknown error has occurred/ ).then( function() {
				hilo.retryDelay.should.equal( 100 );
				dbCalls.should.equal( 7 );
			} );
		} );

		it( "should recover after retryDelay expires", function( done ) {
			succeed = true;
			setTimeout( function() {
				hilo.nextId().then( function( id ) {
					hilo.retryDelay.should.equal( 1 );
					dbCalls.should.equal( 8 );
					id.should.equal( "1100000" );
					done();
				}, done );
			}, hilo.retryDelay + 1 );
		} );
	} );
} );
