describe( "HiloGenerationError", () => {
	let subject;

	beforeEach( () => {
		const HiloGenerationError = require( "../../src/HiloGenerationError" );
		subject = new HiloGenerationError( "MESSAGE" );
	} );

	it( "should set the error message", () => {
		subject.message.should.eql( "MESSAGE" );
	} );

	it( "should set the error name", () => {
		subject.name.should.eql( "HiloGenerationError" );
	} );
} );
