const machina = require( "machina" );
const sinon = require( "sinon" );
const proxyquire = require( "proxyquire" );

describe( "hiloFsm", function() {
	let	bigInt,
		Connection,
		connInstance,
		HiloGenerationError,
		fs,
		path,
		Request,
		sql,
		fsm,
		createTediousConfig,
		fakeFsm;

	beforeEach( function() {
		bigInt = sinon.stub();
		connInstance = {
			connect: sinon.stub(),
			once: sinon.stub(),
			execSql: sinon.stub()
		};
		Connection = sinon.stub().returns( connInstance );
		HiloGenerationError = sinon.stub();
		fs = sinon.stub();
		path = sinon.stub();
		Request = sinon.stub().returns( "REQUEST" );
		sql = "SQLCONFIG";
		createTediousConfig = sinon.stub().returns( "TDS_CONFIG" );

		fakeFsm = {
			deferUntilTransition: sinon.stub(),
			transition: sinon.stub(),
			handle: sinon.stub(),
			getNextHival: sinon.stub().resolves( "HIVAL" ),
			hi: {
				add: sinon.stub().returns( 1 )
			},
			lo: 0
		};

		fsm = proxyquire( "../../src/hiloFsm", {
			machina,
			"big-integer": bigInt,
			tedious: {
				Connection,
				Request
			},
			"./HiloGenerationError": HiloGenerationError,
			fs,
			path,
			"./createTediousConfig": createTediousConfig
		} )( { sql } );
	} );

	it( "should start in the 'uninitialized' state", function() {
		fsm.initialState.should.eql( "uninitialized" );
	} );

	describe( "'uninitialized' state", function() {
		describe( "nextId", function() {
			beforeEach( function() {
				const state = fsm.states.uninitialized;
				state.nextId.call( fakeFsm );
			} );

			it( "should defer handling", function() {
				fakeFsm.deferUntilTransition.should.be.calledOnce();
			} );

			it( "should transition to connecting state", function() {
				fakeFsm.transition.should.be.calledOnce.and.calledWith( "connecting" );
			} );
		} );
	} );

	describe( "'connecting' state", function() {
		let connectingState;

		beforeEach( function() {
			connectingState = fsm.states.connecting;
		} );

		it( "the next state for 'connectionFailure' should be 'dbFailure'", function() {
			connectingState.connectionFailure = "dbFailure";
		} );

		it( "the next state for 'connectionSuccess' should be 'acquiring'", function() {
			connectingState.connectionSuccess = "acquiring";
		} );

		describe( "_onEnter", function() {
			describe( "with no configuration errors", function() {
				beforeEach( function() {
					connectingState._onEnter.call( fakeFsm );
				} );

				it( "should instantiate a Connection", function() {
					Connection.should.be.calledOnce.and.calledWith( "TDS_CONFIG" );
				} );

				it( "should listen (once) to a 'connect' event and called with connect", function() {
					connInstance.once.should.be.calledOnce
						.and.calledWithMatch( "connect", sinon.match.func );
				} );

				it( "should listen (once) to a 'connect' event", function() {
					connInstance.connect.should.be.calledOnce();
				} );

				describe( "when connecting fails", function() {
					it( "should handle a 'connectionFailure' input", function() {
						connInstance.once.getCall( 0 ).args[ 1 ]( "connErr" );
						fakeFsm.handle.should.be.calledOnce.and.calledWith( "connectionFailure" );
						fakeFsm.err = "connErr";
					} );
				} );

				describe( "when connecting succeeds", function() {
					beforeEach( function() {
						connInstance.once.getCall( 0 ).args[ 1 ]();
					} );

					it( "should listen (once) to an 'error' event", function() {
						connInstance.once.getCall( 1 ).should.be.calledWithMatch( "error", sinon.match.func );
					} );

					it( "should listen (once) to an 'end' event", function() {
						connInstance.once.getCall( 2 ).should.be.calledWithMatch( "end", sinon.match.func );
					} );

					it( "should handle 'connectionSuccess' input", function() {
						fakeFsm.handle.should.be.calledOnce.and.calledWith( "connectionSuccess" );
					} );

					describe( "when a connection 'error' is emitted", function() {
						it( "should set the connection property to null", function() {
							fakeFsm.connection = "TotallyNotNull";
							connInstance.once.getCall( 1 ).args[ 1 ]();
							expect( fakeFsm.connection ).to.eql( null );
						} );
					} );

					describe( "when a connection 'end' is emitted", function() {
						it( "should set the connection property to null", function() {
							fakeFsm.connection = "TotallyNotEndedYet";
							connInstance.once.getCall( 2 ).args[ 1 ]();
							expect( fakeFsm.connection ).to.eql( null );
						} );
					} );
				} );
			} );

			describe( "when config errors cause Connection instantiation failure", function() {
				let err;

				beforeEach( function() {
					err = new Error( "O NOES!" );
					Connection.throws( err );
					connectingState._onEnter.call( fakeFsm );
				} );

				it( "should set the err property on the fsm", function() {
					fakeFsm.err.should.eql( err );
				} );

				it( "should handle 'connectionFailure' input", function() {
					fakeFsm.handle.should.be.calledOnce.and.calledWith( "connectionFailure" );
				} );
			} );
		} );
	} );

	describe( "'acquiring' state", function() {
		let acquiringState;

		beforeEach( function() {
			acquiringState = fsm.states.acquiring;
		} );

		describe( "_onEnter", function() {
			describe( "when getting the next hival succeeds", function() {
				it( "should call _processHiValResponse", function(done) {
					fakeFsm._transitionToFailure = function() {};
					fakeFsm._processHiValResponse = function( val ) {
						val.should.eql( "HIVAL" );
						done();
					};
					acquiringState._onEnter.call( fakeFsm );
				} );
			} );

			describe( "when getting the next hival fails", function() {
				beforeEach( function() {
					fakeFsm.getNextHival.rejects();
				} );

				it( "should call _transitionToFailure", function(done) {
					fakeFsm._processHiValResponse = function () { };
					fakeFsm._transitionToFailure = function () {
						done();
					};
					acquiringState._onEnter.call( fakeFsm );
				} );
			} );
		} );

		describe( "nextId", function() {
			it( "should defer until transition", function() {
				acquiringState.nextId.call( fakeFsm );
				fakeFsm.deferUntilTransition.should.be.calledOnce();
			} );
		} );
	} );

	describe( "'dbFailure' state", function() {
		let dbFailureState;

		beforeEach( function() {
			dbFailureState = fsm.states.dbFailure;
		} );

		it( "should have 'uninitialized' as the next state for the 'cleanErrorState' input", function() {
			dbFailureState.clearErrorState = "uninitialized";
		} );

		describe( "_onEnter", function() {
			let origTimeout;

			beforeEach( function() {
				origTimeout = global.setTimeout;
				global.setTimeout = sinon.stub().returns( "TIMER" ).callsArg( 0 );
				dbFailureState._onEnter.call( fakeFsm );
			} );

			afterEach( function() {
				global.setTimeout = origTimeout;
			} );

			it( "should set a timeout to handle 'cleanErrorState'", function() {
				fakeFsm.timer = "TIMER";
				fakeFsm.handle.should.be.calledOnce.and.calledWith( "clearErrorState" );
			} );

			it( "should increment the retryDelay", function() {
				global.setTimeout.should.be.calledWithMatch( sinon.match.func, 1 );
				dbFailureState._onEnter.call( fakeFsm );
				global.setTimeout.should.be.calledWithMatch( sinon.match.func, 2 );
			} );
		} );

		describe( "_onExit", function() {
			let origClearTimeout;

			beforeEach( function() {
				origClearTimeout = global.clearTimeout;
				global.clearTimeout = sinon.stub();
				fakeFsm.timer = "IMMA TIMER";
				dbFailureState._onExit.call( fakeFsm );
			} );

			afterEach( function() {
				global.clearTimeout = origClearTimeout;
			} );

			it( "should clear the timeout", function() {
				global.clearTimeout.should.be.calledOnce.and.calledWith( "IMMA TIMER" );
			} );
		} );

		describe( "nextId", function() {
			describe( "when the err property is set", function() {
				let doneStub;

				beforeEach( function() {
					doneStub = sinon.stub();
					fakeFsm.err = "Error Pirates say Errrr";
					dbFailureState.nextId.call( fakeFsm, doneStub );
				} );

				it( "should pass the err prop to the given callback", function() {
					doneStub.should.be.calledOnce.and.calledWith( "Error Pirates say Errrr" );
				} );
			} );

			describe( "when the err property is not set", function() {
				let doneStub;

				beforeEach( function() {
					doneStub = sinon.stub();
					dbFailureState.nextId.call( fakeFsm, doneStub );
				} );

				it( "should pass a HiloGenerationError to the given callback", function() {
					HiloGenerationError.should.be.calledOnce.and.calledWith( "An unknown error has occurred." );
				} );
			} );
		} );
	} );

	describe( "'ready' state", function() {
		let readyState;

		beforeEach( function() {
			readyState = fsm.states.ready;
		} );

		describe( "nextId", function() {
			describe( "when we've exhausted the key range", function() {
				describe( "when we have a connection", function() {
					let doneStub;

					beforeEach( function() {
						doneStub = sinon.stub();
						fakeFsm.connection = "Yes, connected";
						fakeFsm.lo = 101;
						readyState.nextId.call( fakeFsm, doneStub );
					} );

					it( "should transition to 'acquiring'", function() {
						fakeFsm.transition.should.be.calledOnce.and.calledWith( "acquiring" );
					} );

					it( "should pass the id val to the given callback", function() {
						doneStub.should.be.calledOnce.and.calledWith( null, "1" );
					} );
				} );

				describe( "when we don't have a connection", function() {
					let doneStub;

					beforeEach( function() {
						doneStub = sinon.stub();
						fakeFsm.connection = null;
						fakeFsm.lo = 101;
						readyState.nextId.call( fakeFsm, doneStub );
					} );

					it( "should transition to 'connecting'", function() {
						fakeFsm.transition.should.be.calledOnce.and.calledWith( "connecting" );
					} );

					it( "should pass the id val to the given callback", function() {
						doneStub.should.be.calledOnce.and.calledWith( null, "1" );
					} );
				} );
			} );

			describe( "when we've not exhausted the key range", function() {
				let doneStub;

				beforeEach( function() {
					doneStub = sinon.stub();
					readyState.nextId.call( fakeFsm, doneStub );
				} );

				it( "should not call transition", function() {
					fakeFsm.transition.should.not.be.called();
				} );

				it( "it should pass the id al to the given callback", function() {
					doneStub.should.be.calledOnce.and.calledWith( null, "1" );
				} );
			} );
		} );
	} );

	describe( "_transitionToFailure", function() {
		beforeEach( function() {
			fsm.transition = sinon.stub();
			fsm._transitionToFailure( "O NOES!" );
		} );

		it( "should set the err property", function() {
			fsm.err = "O NOES!";
		} );

		it( "should transition to 'dbFailure'", function() {
			fsm.transition.should.be.calledOnce.and.calledWith( "dbFailure" );
		} );
	} );

	describe( "_processHiValResponse", function() {
		describe( "when val is null", function() {
			beforeEach( function() {
				fsm._transitionToFailure = sinon.stub();
				fsm.transition = sinon.stub();
				fsm._processHiValResponse( null );
			} );

			it( "should call _transitionToFailure", function() {
				fsm._transitionToFailure.should.be.calledOnce
					.and.calledWith();
			} );

			it( "should not transition to 'ready'", function() {
				fsm.transition.should.not.be.called();
			} );
		} );

		describe( "when val is undefined", function() {
			beforeEach( function() {
				fsm._transitionToFailure = sinon.stub();
				fsm.transition = sinon.stub();
				fsm._processHiValResponse( undefined );
			} );

			it( "should call _transitionToFailure", function() {
				fsm._transitionToFailure.should.be.calledOnce
					.and.calledWith();
			} );

			it( "should not transition to 'ready'", function() {
				fsm.transition.should.not.be.called();
			} );
		} );

		describe( "when val.length === 0", function() {
			beforeEach( function() {
				fsm._transitionToFailure = sinon.stub();
				fsm.transition = sinon.stub();
				fsm._processHiValResponse( "" );
			} );

			it( "should call _transitionToFailure", function() {
				fsm._transitionToFailure.should.be.calledOnce
					.and.calledWith();
			} );

			it( "should not transition to 'ready'", function() {
				fsm.transition.should.not.be.called();
			} );
		} );

		describe( "when dealing with a real val", function() {
			beforeEach( function() {
				fsm._transitionToFailure = sinon.stub();
				fsm.transition = sinon.stub();
				bigInt.returns( {
					equals: sinon.stub().returns( true ),
					times: sinon.stub().returns( "HI" )
				} );
				fsm._processHiValResponse( "90210" );
			} );

			it( "should not call _transitionToFailure", function() {
				fsm._transitionToFailure.should.not.be.called();
			} );

			it( "should transition to 'ready'", function() {
				fsm.transition.should.be.calledOnce.and.calledWith( "ready" );
			} );
		} );
	} );

	describe( "getNextHival", function() {
		describe( "when the request instantiation fails", function() {
			let err, res;

			beforeEach( async function() {
				err = new Error( "CALZONE MISSING" );
				Request.callsArgWith( 1, err, 0, [] );
				await fsm.getNextHival().catch( ex => {
					res = ex;
				} );
			} );

			it( "should reject with the error", function() {
				res.should.eql( err );
			} );
		} );

		describe( "when the request instantiation succeeds", function() {
			let res;

			beforeEach( async function() {
				fsm.connection = {
					execSql: sinon.stub()
				};
				Request.callsArgWith( 1, null, 1, [ { next_hi: { value: "VALUE" } } ] );  
				res = await fsm.getNextHival();
			} );

			it( "should execute the request", function() {
				fsm.connection.execSql.should.be.calledOnce();
			} );

			it( "should resolve with the correct value", function() {
				res.should.eql( "VALUE" );
			} );
		} );
	} );

	describe( "getNextId", function() {
		describe( "with success", function() {
			let res;

			beforeEach( function() {
				fsm.handle = sinon.stub().callsArgWith( 1, "O NOES!" );
				return fsm.nextId().catch( ex => {
					res = ex;
				} );
			} );

			it( "should reject with the error", function() {
				res.should.eql( "O NOES!" );
			} );
		} );

		describe( "with failure", function() {
			let res;

			beforeEach( async function() {
				fsm.handle = sinon.stub().callsArgWith( 1, null, "VAL" );
				res = await fsm.nextId();
			} );

			it( "should", function() {
				res.should.eql( "VAL" );
			} );
		} );
	} );
} );
