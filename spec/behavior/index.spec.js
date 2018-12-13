describe( "index", () => {
	let subject, fsmFactory, fsm, config;

	beforeEach( () => {
		fsm = {
			nextId: sinon.stub().resolves( "ID" ),
			hival: 1,
			retryDelay: "RETRYDELAY"
		};
		config = "CONFIG";
		fsmFactory = sinon.stub().returns( fsm );
		subject = proxyquire( "../src/index", {
			"./hiloFsm": fsmFactory
		} )( config );
	} );

	it( "should get a nextId", async () => {
		const result = await subject.nextId();
		result.should.eql( "ID" );
	} );

	it( "should get a list of nextIds", async () => {
		const result = await subject.nextIds( 3 );
		result.should.eql( [ "ID", "ID", "ID" ] );
	} );

	it( "should have a hival property", () => {
		subject.hival.should.eql( "1" );
	} );

	it( "should have a retryDelay property", () => {
		subject.retryDelay.should.eql( "RETRYDELAY" );
	} );
} );
