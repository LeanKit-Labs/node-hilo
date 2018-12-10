module.exports = {
	extends: "leankit/test",

	rules: {
		strict: "off",
		"new-cap": 0,
		"no-var": 0,
		"vars-on-top": 0
	},

	globals: {
		sinon: true,
		bigInt: true,
		should: true,
		getExpected: true,
		proxyquire: true,
		expect: true
	}
};
