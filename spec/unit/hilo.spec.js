describe( "node-hilo - unit tests", function() {
	describe( "generated unit tests", function() {
		function getIds( cnt, hilo ) {
			var p = [];
			var idx = 0;
			while ( idx < cnt ) {
				p.push( hilo.nextId() );
				idx++;
			}
			return when.all( p );
		}

		function getExpected( cnt, startIdx ) {
			var expected = [];
			var idx = 0;
			if(startIdx.equals(0)) {
				startIdx = startIdx.add(1);
			}
			while ( idx < cnt ) {
				expected.push( startIdx.toString() );
				startIdx = startIdx.add( 1 );
				idx++;
			}
			return expected;
		}

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
							var stubiate = {
								first: function() {
									var val = { next_hi: hival.toString() };
									hival = hival.add( 1 );
									return when( val );
								},
								fromFile: function() {}
							};
							spy = sinon.spy( stubiate, "first" );
							hilo = getHiloInstance( stubiate, { hilo: { maxLo: maxLo } } );
						} );
						it( "should return expected ids for the given range", function() {
							return getIds( idCount, hilo ).then( function( ids ) {
								spy.callCount.should.equal( Math.ceil( expCallCount ) );
								ids.should.eql( getExpected( idCount, ( startHival.times( maxLoPlusOne ) ) ) );
								hilo.hival.should.equal( startHival.add( expCallCount ).subtract( 1 ).toString() );
							} );
						} );
					} );
				} );
			} );
		} );
	} );

	describe( "when the DB call for next hival fails", function() {
		describe("with an exception provided", function() {
			var hilo, hival;
			beforeEach( function() {
				var stubiate = {
					first: function() {
						return when.reject( new Error( "Databass not OK" ) );
					},
					fromFile: function() {}
				};
				hilo = getHiloInstance( stubiate, { hilo: { maxLo: 10 } } );
			} );
			it( "should reject", function() {
				return hilo.nextId().should.be.rejectedWith(/Databass not OK/);
			} );
		});
		describe("with no exception provided", function() {
			var hilo, hival;
			beforeEach( function() {
				var stubiate = {
					first: function() {
						return when.reject();
					},
					fromFile: function() {}
				};
				hilo = getHiloInstance( stubiate, { hilo: { maxLo: 10 } } );
			} );
			it( "should reject", function() {
				exception = undefined;
				return hilo.nextId().should.be.rejectedWith(/An unknown error has occurred/);
			} );
		});
	} );

	describe( "when the DB doesn't return a valid hival", function() {
		var hilo, hival, spy, dbHival;
		before( function() {
			var stubiate = {
				first: function() {
					return when( { next_hi: dbHival } );
				},
				fromFile: function() {}
			};
			spy = sinon.spy( stubiate, "first" );
			hilo = getHiloInstance( stubiate, { hilo: { maxLo: 10 } } );
		} );

		it( "should reject if an empty string is returned", function() {
			dbHival = "";
			return hilo.nextId().should.be.rejectedWith(/Invalid hival returned from database/);
		} );

		it( "should reject if an undefined is returned", function() {
			dbHival = undefined;
			return hilo.nextId().should.be.rejectedWith(/Invalid hival returned from database/);
		} );

		it( "should reject if an null is returned", function() {
			dbHival = null;
			return hilo.nextId().should.be.rejectedWith(/Invalid hival returned from database/);
		} );
	} );
} );
