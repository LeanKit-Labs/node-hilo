const machina = require( "machina" );

describe( "hiloFsm", () => {
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

	beforeEach( () => {
		bigInt = sinon.stub();
		connInstance = {
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

		fsm = proxyquire( "../src/hiloFsm", {
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

	it( "should start in the 'uninitialized' state", () => {
		fsm.initialState.should.eql( "uninitialized" );
	} );

	describe( "'uninitialized' state", () => {
		describe( "nextId", () => {
			beforeEach( () => {
				const state = fsm.states.uninitialized;
				state.nextId.call( fakeFsm );
			} );

			it( "should defer handling", () => {
				fakeFsm.deferUntilTransition.should.be.calledOnce();
			} );

			it( "should transition to connecting state", () => {
				fakeFsm.transition.should.be.calledOnce.and.calledWith( "connecting" );
			} );
		} );
	} );

	describe( "'connecting' state", () => {
		let connectingState;

		beforeEach( () => {
			connectingState = fsm.states.connecting;
		} );

		it( "the next state for 'connectionFailure' should be 'dbFailure'", () => {
			connectingState.connectionFailure = "dbFailure";
		} );

		it( "the next state for 'connectionSuccess' should be 'acquiring'", () => {
			connectingState.connectionSuccess = "acquiring";
		} );

		describe( "_onEnter", () => {
			describe( "with no configuration errors", () => {
				beforeEach( () => {
					connectingState._onEnter.call( fakeFsm );
				} );

				it( "should instantiate a Connection", () => {
					Connection.should.be.calledOnce.and.calledWith( "TDS_CONFIG" );
				} );

				it( "should listen (once) to a 'connect' event", () => {
					connInstance.once.should.be.calledOnce
						.and.calledWithMatch( "connect", sinon.match.func );
				} );

				describe( "when connecting fails", () => {
					it( "should handle a 'connectionFailure' input", () => {
						connInstance.once.getCall( 0 ).args[ 1 ]( "connErr" );
						fakeFsm.handle.should.be.calledOnce.and.calledWith( "connectionFailure" );
						fakeFsm.err = "connErr";
					} );
				} );

				describe( "when connecting succeeds", () => {
					beforeEach( () => {
						connInstance.once.getCall( 0 ).args[ 1 ]();
					} );

					it( "should listen (once) to an 'error' event", () => {
						connInstance.once.getCall( 1 ).should.be.calledWithMatch( "error", sinon.match.func );
					} );

					it( "should listen (once) to an 'end' event", () => {
						connInstance.once.getCall( 2 ).should.be.calledWithMatch( "end", sinon.match.func );
					} );

					it( "should handle 'connectionSuccess' input", () => {
						fakeFsm.handle.should.be.calledOnce.and.calledWith( "connectionSuccess" );
					} );

					describe( "when a connection 'error' is emitted", () => {
						it( "should set the connection property to null", () => {
							fakeFsm.connection = "TotallyNotNull";
							connInstance.once.getCall( 1 ).args[ 1 ]();
							expect( fakeFsm.connection ).to.eql( null );
						} );
					} );

					describe( "when a connection 'end' is emitted", () => {
						it( "should set the connection property to null", () => {
							fakeFsm.connection = "TotallyNotEndedYet";
							connInstance.once.getCall( 2 ).args[ 1 ]();
							expect( fakeFsm.connection ).to.eql( null );
						} );
					} );
				} );
			} );

			describe( "when config errors cause Connection instantiation failure", () => {
				let err;

				beforeEach( () => {
					err = new Error( "O NOES!" );
					Connection.throws( err );
					connectingState._onEnter.call( fakeFsm );
				} );

				it( "should set the err property on the fsm", () => {
					fakeFsm.err.should.eql( err );
				} );

				it( "should handle 'connectionFailure' input", () => {
					fakeFsm.handle.should.be.calledOnce.and.calledWith( "connectionFailure" );
				} );
			} );
		} );
	} );

	describe( "'acquiring' state", () => {
		let acquiringState;

		beforeEach( () => {
			acquiringState = fsm.states.acquiring;
		} );

		describe( "_onEnter", () => {
			describe( "when getting the next hival succeeds", () => {
				it( "should call _processHiValResponse", done => {
					fakeFsm._transitionToFailure = function() {};
					fakeFsm._processHiValResponse = function( val ) {
						val.should.eql( "HIVAL" );
						done();
					};
					acquiringState._onEnter.call( fakeFsm );
				} );
			} );

			describe( "when getting the next hival fails", () => {
				beforeEach( () => {
					fakeFsm.getNextHival.rejects();
				} );

				it( "should call _transitionToFailure", done => {
					fakeFsm._processHiValResponse = function () { };
					fakeFsm._transitionToFailure = function () {
						done();
					};
					acquiringState._onEnter.call( fakeFsm );
				} );
			} );
		} );

		describe( "nextId", () => {
			it( "should defer until transition", () => {
				acquiringState.nextId.call( fakeFsm );
				fakeFsm.deferUntilTransition.should.be.calledOnce();
			} );
		} );
	} );

	describe( "'dbFailure' state", () => {
		let dbFailureState;

		beforeEach( () => {
			dbFailureState = fsm.states.dbFailure;
		} );

		it( "should have 'uninitialized' as the next state for the 'cleanErrorState' input", () => {
			dbFailureState.clearErrorState = "uninitialized";
		} );

		describe( "_onEnter", () => {
			let origTimeout;

			beforeEach( () => {
				origTimeout = global.setTimeout;
				global.setTimeout = sinon.stub().returns( "TIMER" ).callsArg( 0 );
				dbFailureState._onEnter.call( fakeFsm );
			} );

			afterEach( () => {
				global.setTimeout = origTimeout;
			} );

			it( "should set a timeout to handle 'cleanErrorState'", () => {
				fakeFsm.timer = "TIMER";
				fakeFsm.handle.should.be.calledOnce.and.calledWith( "clearErrorState" );
			} );

			it( "should increment the retryDelay", () => {
				global.setTimeout.should.be.calledWithMatch( sinon.match.func, 1 );
				dbFailureState._onEnter.call( fakeFsm );
				global.setTimeout.should.be.calledWithMatch( sinon.match.func, 2 );
			} );
		} );

		describe( "_onExit", () => {
			let origClearTimeout;

			beforeEach( () => {
				origClearTimeout = global.clearTimeout;
				global.clearTimeout = sinon.stub();
				fakeFsm.timer = "IMMA TIMER";
				dbFailureState._onExit.call( fakeFsm );
			} );

			afterEach( () => {
				global.clearTimeout = origClearTimeout;
			} );

			it( "should clear the timeout", () => {
				global.clearTimeout.should.be.calledOnce.and.calledWith( "IMMA TIMER" );
			} );
		} );

		describe( "nextId", () => {
			describe( "when the err property is set", () => {
				let doneStub;

				beforeEach( () => {
					doneStub = sinon.stub();
					fakeFsm.err = "Error Pirates say Errrr";
					dbFailureState.nextId.call( fakeFsm, doneStub );
				} );

				it( "should pass the err prop to the given callback", () => {
					doneStub.should.be.calledOnce.and.calledWith( "Error Pirates say Errrr" );
				} );
			} );

			describe( "when the err property is not set", () => {
				let doneStub;

				beforeEach( () => {
					doneStub = sinon.stub();
					dbFailureState.nextId.call( fakeFsm, doneStub );
				} );

				it( "should pass a HiloGenerationError to the given callback", () => {
					HiloGenerationError.should.be.calledOnce.and.calledWith( "An unknown error has occurred." );
				} );
			} );
		} );
	} );

	describe( "'ready' state", () => {
		let readyState;

		beforeEach( () => {
			readyState = fsm.states.ready;
		} );

		describe( "nextId", () => {
			describe( "when we've exhausted the key range", () => {
				describe( "when we have a connection", () => {
					let doneStub;

					beforeEach( () => {
						doneStub = sinon.stub();
						fakeFsm.connection = "Yes, connected";
						fakeFsm.lo = 101;
						readyState.nextId.call( fakeFsm, doneStub );
					} );

					it( "should transition to 'acquiring'", () => {
						fakeFsm.transition.should.be.calledOnce.and.calledWith( "acquiring" );
					} );

					it( "should pass the id val to the given callback", () => {
						doneStub.should.be.calledOnce.and.calledWith( null, "1" );
					} );
				} );

				describe( "when we don't have a connection", () => {
					let doneStub;

					beforeEach( () => {
						doneStub = sinon.stub();
						fakeFsm.connection = null;
						fakeFsm.lo = 101;
						readyState.nextId.call( fakeFsm, doneStub );
					} );

					it( "should transition to 'connecting'", () => {
						fakeFsm.transition.should.be.calledOnce.and.calledWith( "connecting" );
					} );

					it( "should pass the id val to the given callback", () => {
						doneStub.should.be.calledOnce.and.calledWith( null, "1" );
					} );
				} );
			} );

			describe( "when we've not exhausted the key range", () => {
				let doneStub;

				beforeEach( () => {
					doneStub = sinon.stub();
					readyState.nextId.call( fakeFsm, doneStub );
				} );

				it( "should not call transition", () => {
					fakeFsm.transition.should.not.be.called();
				} );

				it( "it should pass the id al to the given callback", () => {
					doneStub.should.be.calledOnce.and.calledWith( null, "1" );
				} );
			} );
		} );
	} );

	describe( "_transitionToFailure", () => {
		beforeEach( () => {
			fsm.transition = sinon.stub();
			fsm._transitionToFailure( "O NOES!" );
		} );

		it( "should set the err property", () => {
			fsm.err = "O NOES!";
		} );

		it( "should transition to 'dbFailure'", () => {
			fsm.transition.should.be.calledOnce.and.calledWith( "dbFailure" );
		} );
	} );

	describe( "_processHiValResponse", () => {
		describe( "when val is null", () => {
			beforeEach( () => {
				fsm._transitionToFailure = sinon.stub();
				fsm.transition = sinon.stub();
				fsm._processHiValResponse( null );
			} );

			it( "should call _transitionToFailure", () => {
				fsm._transitionToFailure.should.be.calledOnce
					.and.calledWith();
			} );

			it( "should not transition to 'ready'", () => {
				fsm.transition.should.not.be.called();
			} );
		} );

		describe( "when val is undefined", () => {
			beforeEach( () => {
				fsm._transitionToFailure = sinon.stub();
				fsm.transition = sinon.stub();
				fsm._processHiValResponse( undefined );
			} );

			it( "should call _transitionToFailure", () => {
				fsm._transitionToFailure.should.be.calledOnce
					.and.calledWith();
			} );

			it( "should not transition to 'ready'", () => {
				fsm.transition.should.not.be.called();
			} );
		} );

		describe( "when val.length === 0", () => {
			beforeEach( () => {
				fsm._transitionToFailure = sinon.stub();
				fsm.transition = sinon.stub();
				fsm._processHiValResponse( "" );
			} );

			it( "should call _transitionToFailure", () => {
				fsm._transitionToFailure.should.be.calledOnce
					.and.calledWith();
			} );

			it( "should not transition to 'ready'", () => {
				fsm.transition.should.not.be.called();
			} );
		} );

		describe( "when dealing with a real val", () => {
			beforeEach( () => {
				fsm._transitionToFailure = sinon.stub();
				fsm.transition = sinon.stub();
				bigInt.returns( {
					equals: sinon.stub().returns( true ),
					times: sinon.stub().returns( "HI" )
				} );
				fsm._processHiValResponse( "90210" );
			} );

			it( "should not call _transitionToFailure", () => {
				fsm._transitionToFailure.should.not.be.called();
			} );

			it( "should transition to 'ready'", () => {
				fsm.transition.should.be.calledOnce.and.calledWith( "ready" );
			} );
		} );
	} );

	describe( "getNextHival", () => {
		describe( "when the request instantiation fails", () => {
			let err, res;

			beforeEach( async () => {
				err = new Error( "CALZONE MISSING" );
				Request.callsArgWith( 1, err, 0, [] );
				await fsm.getNextHival().catch( ex => {
					res = ex;
				} );
			} );

			it( "should reject with the error", () => {
				res.should.eql( err );
			} );
		} );

		describe( "when the request instantiation succeeds", () => {
			let res;

			beforeEach( async () => {
				fsm.connection = {
					execSql: sinon.stub()
				};
				Request.callsArgWith( 1, null, 1, [ { next_hi: { value: "VALUE" } } ] ); /* eslint-disable-line */
				res = await fsm.getNextHival();
			} );

			it( "should execute the request", () => {
				fsm.connection.execSql.should.be.calledOnce();
			} );

			it( "should resolve with the correct value", () => {
				res.should.eql( "VALUE" );
			} );
		} );
	} );

	describe( "getNextId", () => {
		describe( "with success", () => {
			let res;

			beforeEach( () => {
				fsm.handle = sinon.stub().callsArgWith( 1, "O NOES!" );
				return fsm.nextId().catch( ex => {
					res = ex;
				} );
			} );

			it( "should reject with the error", () => {
				res.should.eql( "O NOES!" );
			} );
		} );

		describe( "with failure", () => {
			let res;

			beforeEach( async () => {
				fsm.handle = sinon.stub().callsArgWith( 1, null, "VAL" );
				res = await fsm.nextId();
			} );

			it( "should", () => {
				res.should.eql( "VAL" );
			} );
		} );
	} );
} );
