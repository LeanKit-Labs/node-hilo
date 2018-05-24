var chai = require( "chai" );
chai.use( require( "sinon-chai" ) );
chai.use( require( "chai-as-promised" ) );
global.should = chai.should();
global.sinon = require( "sinon" );
require( "sinon-as-promised" );
global.when = require( "when" );
global.bigInt = require( "big-integer" );
global.getHiloInstance = require( "../src" );

global.getIds = function getIds( cnt, hilo ) {
	const p = [];
	let idx = 0;
	while ( idx < cnt ) {
		p.push( hilo.nextId() );
		idx++;
	}
	return when.all( p );
};

global.getExpected = function getExpected( cnt, startIdx ) {
	const expected = [];
	let idx = 0;
	if ( startIdx.equals( 0 ) ) {
		startIdx = startIdx.add( 1 );
	}
	while ( idx < cnt ) {
		expected.push( startIdx.toString() );
		startIdx = startIdx.add( 1 );
		idx++;
	}
	return expected;
};
