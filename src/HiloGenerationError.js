"use strict";
var util = require( "util" );

function HiloGenerationError() {
	this.message = util.format.apply( null, arguments );
	this.name = "HiloGenerationError";
}

HiloGenerationError.prototype = Object.create( Error.prototype );
HiloGenerationError.prototype.constructor = HiloGenerationError;

module.exports = HiloGenerationError;
