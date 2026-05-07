describe( "HiloGenerationError", function() {
	let subject;

	beforeEach( function() {
		const HiloGenerationError = require( "../../src/HiloGenerationError" );
		subject = new HiloGenerationError( "MESSAGE" );
	} );

	it( "should set the error message", function() {
		subject.message.should.eql( "MESSAGE" );
	} );

	it( "should set the error name", function() {
		subject.name.should.eql( "HiloGenerationError" );
	} );
} );
