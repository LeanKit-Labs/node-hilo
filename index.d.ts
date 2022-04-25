
export interface Hilo {
	nextId() : Promise<string>
	nextIds( count:number ) : Promise<string[]>
	hival: string | undefined
	retryDelay: number | undefined
}

export interface HiloConfig {
	sql: {
		user: string
		password: string;
		server?: string;
		domain?: string;
		host?: string;
		port?: number,
		database: string
		connectTimeout?: number;
		requestTimeout?: number;
		encrypt?: boolean
	},
	hilo?: {
		maxLo?: number;
		maxRetryDelay?: number
		table?: string
	}
}

declare function hiloFactory( config:HiloConfig ) : Hilo;

export = hiloFactory;
