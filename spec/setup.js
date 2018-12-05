var chai = require( "chai" );
chai.use( require( "sinon-chai" ) );
chai.use( require( "chai-as-promised" ) );
global.should = chai.should();
global.sinon = require( "sinon" );
global.bigInt = require( "big-integer" );
global.proxyquire = require( "proxyquire" );
