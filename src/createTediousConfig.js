"use strict";

const DEFAULT_CONNECT_TIMEOUT = 15000;
const DEFAULT_REQUEST_TIMEOUT = 15000;
const DEFAULT_PORT = 1433;

module.exports = config => {
	const {
		user,
		password,
		server,
		domain,
		host,
		port = DEFAULT_PORT,
		database,
		connectTimeout = DEFAULT_CONNECT_TIMEOUT,
		requestTimeout = DEFAULT_REQUEST_TIMEOUT,
		encrypt = false
	} = config;
	return {
		server: server ? server : host,
		authentication: {
			type: domain ? "ntlm" : "default",
			options: {
				userName: user,
				password,
				domain
			}
		},
		options: {
			port,
			database,
			connectTimeout,
			requestTimeout,
			encrypt,
			rowCollectionOnRequestCompletion: true,
			useColumnNames: true,
			abortTransactionOnError: true
		}
	};
};
