
export interface Hilo {
	nextId() : Promise<string>
	nextIds( count:number ) : Promise<string[]>
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

export default function hiloFactory( config:HiloConfig ) : Hilo;
