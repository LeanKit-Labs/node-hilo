# node-hilo

NHibernate-style hi/lo ID generator for node.js

## How to Use It

### Requiring & Configuring

node-hilo exports a factory function that takes an instance of [seriate](https://github.com/leankit-labs/seriate), and a configuration object:
```javascript
/*
	The configuration argument can contain the following:
	{
		hilo: {
			maxLo: 10 // an integer value for maxLo
		},
		// sql is a config object that seriate would understand
		sql: {
			user: "you_me_anyone",
			password: "superseekret",
			server: "some.server.com",
			database: "meh_databass"
		}
	}
*/
var hilo = require( "node-hilo" )( seriate, configuration );
```

### How to Use

node-hilo exports two module members: a `nextId` method and a read-only property called `hival`. You will likely *never* need to care about the `hival` value - it's there for diagnostics and testing. The `nextId` method returns a promise, with the newly generated ID being passed to the success callback:

```javascript
hilo.nextId(
	function( id ){
		// Now you can use the id on your object, etc.
		api.saveNewThing( id, newThing );
	},
	function( err) {
		console.log( "O NOES!", err );
	}
);
```

## The More You Know...
JavaScript doesn't natively support 64 bit integers - we're using a helper lib ([big-integer](https://www.npmjs.com/package/big-integer)) to allow us to properly represent them. Because of this, the generated IDs are passed back as strings (even though they're `long` values). You will need to ensure your DB server converts/casts them to `long` (which SQL will normally implicitly do for you).

If you'd like to learn more about the hi/lo algorithm:

* Look at the [NHibernate Source](https://github.com/nhibernate/nhibernate-core/blob/c85d038dce8ba87bd3f4de2458b4ef6e2497f7f8/src/NHibernate/Id/TableHiLoGenerator.cs#L82)
* [ID Generators](http://learningviacode.blogspot.com/2011/09/id-generators-2.html)
* [The Hi/Lo Algorithm](http://java.dzone.com/articles/hilo-algorithm)
* [Jon Skeet's answer on SO](http://stackoverflow.com/a/282113/713567)

## Tests, etc

* `gulp test` to run tests
* `gulp coverage` to run instanbul in the console
* `npm run coverage` to open the web istanbul report
* `gulp format` to run JSCS formatting rules
* `gulp jshint` to lint the code
* `gulp watch` to start a file watcher that re-runs tests with each change.
