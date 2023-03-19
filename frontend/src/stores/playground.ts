import type {Readable, Updater} from 'svelte/store'
import {writable, get as get$, derived} from 'svelte/store'
import {storeIsInited} from './stores_init'
import {randID} from '../utils/misc'
import debounce from 'lodash/debounce'
import newLocalStorageKey from './_local_storage_prefix'
import {importWorkspaceVersion} from '../utils/workspace_import'

export const WS_VERSION = 0
export const TEMPLATE_VERSION = 0
export const QUERY_VERSION = 0
export const STORE_VERSION = 0

// VersionedEntity such entities can be migrated if needed
export type VersionedEntity = {_version: number}

interface EngineAPI_Template {id: string, source: string}

export enum EngineAPI_InitErrorCode {
	SCHEMA_ERR = 'SCHEMA_ERR',
	INIT_GQT_PARSER = 'INIT_GQT_PARSER',
	TEMPLATE_ERR = 'TEMPLATE_ERR',
}

interface EngineAPI_InitErrorPayloadType {
	[EngineAPI_InitErrorCode.INIT_GQT_PARSER]: Array<string>
	[EngineAPI_InitErrorCode.SCHEMA_ERR]: Array<string>
	[EngineAPI_InitErrorCode.TEMPLATE_ERR]: {[key: string]: Array<string>}
}

type EngineAPI_InitError<T extends EngineAPI_InitErrorCode> = {
	code: T
	errors: EngineAPI_InitErrorPayloadType[T]
}

type EngineAPI_MatchAllResult = {
	error?: string
	matched?: Array<string>
}

enum OperationType {
	Query = 'Query',
	Mutation = 'Mutation',
	Subscription = 'Subscription',
}

type EngineAPI_Operation = {name: string, index: number, type: OperationType}

type EngineAPI_ParsedOperation = {
	operations?: Array<EngineAPI_Operation>
	code?: 'PARSE_OPR'
	errors?: string
}

interface EngineAPI {
	__run: ()=> void
	__inited: ()=> void // resolver of _init, which is called from Go
	__init: Promise<void> // resolved by the engine in Go
	init: <T extends EngineAPI_InitErrorCode>(schemaSrc: string, templates: Array<EngineAPI_Template>)=> EngineAPI_InitError<T>|null
	matchAll: (query: string, operationName: string, variablesJSON: string)=> EngineAPI_MatchAllResult
	parseOperation: (query: string)=> EngineAPI_ParsedOperation
}

export type GG_QueryResults = {
	matched: Array<string>
	error: string|null
}

export type GG_Query = VersionedEntity & {
	id: string
	name: string
	query: string
	variables: string
}

export type GG_Template = VersionedEntity & {
	id: string
	name: string
	source: string
}

export type GG_Workspace = VersionedEntity & {
	id: string
	name: string
	schema: string
	creation: number
	templates: Array<GG_Template>
	queries: Array<GG_Query>
	isSchemaless: boolean
}

export type GG_ImportQuery = Partial<VersionedEntity & {name: string, query: string, variables: string}>

export type GG_ImportTemplate = Partial<VersionedEntity & {name: string, source: string}>

export type GG_ImportWorkspace = Partial<VersionedEntity & {
	name: string
	schema: string
	creation: number
	templates: Array<GG_ImportQuery>
	queries: Array<GG_ImportTemplate>
}>

type t_$ = VersionedEntity & {
	workspaces: {[id: string]: GG_Workspace}
}

type t_$errors = {[wsID: string]: {
	gqt: null|Array<string>
	schema: null|Array<string>
	templates: {[tplID: string]: Array<string>}
	queries: {[queryID: string]: Array<string>}
}}

type t_$parsedOperations = {[wsID: string]: {[queryID: string]: Array<EngineAPI_Operation>}}

type t_$queryResults = {[wsID: string]: {[queryID: string]: GG_QueryResults}}

class Playground implements Readable<t_$> {
	#locStrID = newLocalStorageKey('workspaces')

	private _engine: EngineAPI

	#store = writable<t_$>({_version: STORE_VERSION, workspaces: {}})
	#errors = writable<t_$errors>({})
	#queryResults = writable<t_$queryResults>({})
	#engineInited = writable(false)
	#parsedOperations = writable<t_$parsedOperations>({})

	public readonly subscribe = this.#store.subscribe
	public errors = derived(this.#errors, ($)=> $)
	public results = derived(this.#queryResults, ($)=> $)
	public isEngineInited = derived(this.#engineInited, ($)=> $)
	public parsedOperations = derived(this.#parsedOperations, ($)=> $)

	private _panicWhenEngineIsIniting() {
		if (!get$(this.isEngineInited)) {throw new Error('cannot interrupt engine init process')}
	}

	public $() {return get$(this)}

	private _update(fn: Updater<t_$>) {
		this.#store.update(($)=> {
			$ = fn($)
			this._writeLocalStore($)
			return $
		})
	}

	private _writeLocalStore($: t_$): void {
		if ('localStorage' in window) {
			localStorage.setItem(this.#locStrID, JSON.stringify($))
		}
	}
	private _scanLocalStore(): t_$|null {
		if ('localStorage' in window) {
			const locStore = localStorage.getItem(this.#locStrID)
			try {
				if (locStore) {
					return JSON.parse(locStore)
				}
			} catch {
				localStorage.setItem(this.#locStrID + '__BACKUP', locStore as string)
				console.error(
					'unable to read and prase local storage - corrupted data? ' +
					'The data was saved in another local storage entry prefixed with "__BACKUP".'
				)
			}
		}
		return null
	}

	private _validateTemplate(possibleTpl: GG_Template): GG_Template|null {
		const tpl = this._newTemplateObj()
		if (typeof possibleTpl.id === 'string') {
			tpl.id = possibleTpl.id
		}
		if (typeof possibleTpl.name === 'string') {
			tpl.name = possibleTpl.name
		}
		if (typeof possibleTpl.source === 'string') {
			tpl.source = possibleTpl.source
		}

		// if (tpl._version !== TEMPLATE_VERSION) {/* migrate */}
		return tpl
	}

	private _validateQuery(possibleQuery: GG_Query): GG_Query|null {
		const query = this._newQueryObj()
		if (typeof possibleQuery.id === 'string') {
			query.id = possibleQuery.id
		}
		if (typeof possibleQuery.name === 'string') {
			query.name = possibleQuery.name
		}
		if (typeof possibleQuery.query === 'string') {
			query.query = possibleQuery.query
		}
		if (typeof possibleQuery.variables === 'string') {
			query.variables = possibleQuery.variables
		}

		// if (query._version !== QUERY_VERSION) {/* migrate */}
		return query
	}

	private _validateWorkspace(possibleWs: GG_Workspace): GG_Workspace|null {
		const ws = this._newWorkspaceObj()
		if (typeof possibleWs.id === 'string') {
			ws.id = possibleWs.id
		}
		if (typeof possibleWs.name === 'string') {
			ws.name = possibleWs.name
		}
		if (typeof possibleWs.schema === 'string') {
			ws.schema = possibleWs.schema
		}
		if (typeof possibleWs.isSchemaless === 'boolean') {
			ws.isSchemaless = possibleWs.isSchemaless
		}

		if (Number.isFinite(possibleWs.creation)) {
			ws.creation = possibleWs.creation
		}

		if (Array.isArray(possibleWs.queries) && possibleWs.queries.length > 0) {
			ws.queries = []
			possibleWs.queries.forEach((possibleQuery)=> {
				const query = this._validateQuery(possibleQuery)
				if (query !== null) {
					ws.queries.push(query)
				}
			})
		}

		if (Array.isArray(possibleWs.templates) && possibleWs.templates.length > 0) {
			ws.templates = []
			possibleWs.templates.forEach((possibleTpl)=> {
				const tpl = this._validateTemplate(possibleTpl)
				if (tpl !== null) {
					ws.templates.push(tpl)
				}
			})
		}

		// if (ws._version !== WS_VERSION) {/* migrate */}
		return ws
	}

	constructor() {
		const locStrore = this._scanLocalStore()
		this.#store.update(($)=> {
			if (locStrore) {
				$._version = locStrore._version
				if (locStrore.workspaces) {
					Object.values(locStrore.workspaces).forEach((possibleWs)=> {
						const ws = this._validateWorkspace(possibleWs)
						if (ws !== null) {$.workspaces[ws.id] = ws}
					})
				}
			}

			if (Object.keys($.workspaces).length < 1) {
				const ws = this._newWorkspaceObj('')
				$.workspaces[ws.id] = ws
			}

			// if ($._version !== STORE_VERSION) {/* migrate */}
			return $
		})
		this._engine = window['engine'] as EngineAPI
		this._engine.__run()
		storeIsInited('playground')
		this._engine.__init.then(()=> storeIsInited('engine'))
	}

	public derivedTemplatesIDMapByWS =(wsID: string)=> (
		derived(this, ($)=> {
			const map: {[id: string]: GG_Template} = {}
			if (wsID in $.workspaces) {
				$.workspaces[wsID].templates.forEach((tpl)=> map[tpl.id] = tpl)
			}
			return map
		})
	)

	public getTemplateByID(wsID: string, tplIDs: Array<string>): Array<GG_Template> {
		const $ = this.$()
		if (!(wsID in $.workspaces)) {
			throw new Error(`workspace by id "${wsID}" not existing`)
		}
		return $.workspaces[wsID].templates.filter(({id})=> tplIDs.includes(id))
	}

	public export(wsID: string): GG_ImportWorkspace {
		this._panicWhenEngineIsIniting()

		const $ = this.$()
		return {
			_version: $.workspaces[wsID]._version,
			name: $.workspaces[wsID].name || undefined,
			schema: $.workspaces[wsID].schema || undefined,
			creation: $.workspaces[wsID].creation,
			templates: (
				$.workspaces[wsID].templates.length ? $.workspaces[wsID].templates.map(
					({_version, name, source})=> ({
						_version,
						name: name || undefined,
						source: source || undefined,
					})
				) : undefined
			),
			queries: (
				$.workspaces[wsID].queries.length ? $.workspaces[wsID].queries.map(
					({_version, name, query, variables})=> ({
						_version,
						name: name || undefined,
						query: query || undefined,
						variables: variables || undefined,
					})
				) : undefined
			),
		}
	}

	public import(input: GG_ImportWorkspace): string {
		this._panicWhenEngineIsIniting()

		const ws = importWorkspaceVersion(input)
		this._update(($)=> {
			$.workspaces[ws.id] = ws
			return $
		})
		return ws.id
	}

	public eraseAllData(): void {
		this._panicWhenEngineIsIniting()

		this._update(($)=> {
			$.workspaces = {}
			const ws = this._newWorkspaceObj('')
			$.workspaces[ws.id] = ws
			return $
		})
	}

	private _newTemplateObj(name?: string): GG_Template {
		return {
			_version: TEMPLATE_VERSION,
			id: randID(),
			name: name ?? '',
			source: '',
		}
	}

	private _newQueryObj(name?: string): GG_Query {
		return {
			_version: QUERY_VERSION,
			id: randID(),
			name: name ?? '',
			query: '',
			variables: '',
		}
	}

	private _newWorkspaceObj(name?: string): GG_Workspace {
		return {
			_version: WS_VERSION,
			id: randID(),
			name: name ?? '',
			schema: '',
			creation: Date.now(),
			templates: [this._newTemplateObj()],
			queries: [this._newQueryObj()],
			isSchemaless: false,
		}
	}

	/* :: WORKSPACE ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: */

	public newWorkspace(name: string): string {
		this._panicWhenEngineIsIniting()

		let wsID = ''
		this._update(($)=> {
			const newWs = this._newWorkspaceObj(name)
			$.workspaces[newWs.id] = newWs
			wsID = newWs.id
			return $
		})
		return wsID
	}

	public deleteWorkspace(wsID: string): void {
		this._panicWhenEngineIsIniting()

		this._update(($)=> {
			if (Object.keys($.workspaces).length < 2) {
				$.workspaces[wsID].name = ''
				$.workspaces[wsID].schema = ''
				$.workspaces[wsID].creation = Date.now()
				$.workspaces[wsID].templates = [this._newTemplateObj()]
				$.workspaces[wsID].queries = [this._newQueryObj()]
			} else {
				delete $.workspaces[wsID]
			}
			this.#errors.update(($)=> {
				delete $[wsID]
				return $
			})
			this.#queryResults.update(($)=> {
				delete $[wsID]
				return $
			})
			this.#parsedOperations.update(($)=> {
				delete $[wsID]
				return $
			})
			return $
		})
	}

	public updateWorkspace(
		wsID: string,
		{name, schema, isSchemaless}: {name?: string, schema?: string, isSchemaless?: boolean},
	): void {
		let initEngine = false
		let err: Error|null = null
		this._update(($)=> {
			if (!(wsID in $.workspaces)) {
				err = new Error(`no workspace by id "${wsID}" exsiting`)
				return $
			}
			if (typeof name === 'string') {
				$.workspaces[wsID].name = name
			}
			if (typeof schema === 'string') {
				initEngine = true
				$.workspaces[wsID].schema = schema
			}
			if (typeof isSchemaless === 'boolean') {
				initEngine = true
				$.workspaces[wsID].isSchemaless = isSchemaless
			}
			return $
		})
		if (err !== null) {throw err}
		if (initEngine) {this._debouncedEngineInit(wsID)}
	}

	/* :: TEMPLATE :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: */

	public newTemplate(wsID: string): string {
		let tplID = ''
		this._update(($)=> {
			const newTpl = this._newTemplateObj()
			$.workspaces[wsID].templates.push(newTpl)
			tplID = newTpl.id
			return $
		})
		this.initEngine(wsID)
		return tplID
	}

	public deleteTemplate(wsID: string, idx: number): void {
		let err: Error|null = null
		let tplID = ''
		this._update(($)=> {
			if (idx < 0 || idx >= $.workspaces[wsID].templates.length) {
				err = new Error(`no template by index "${idx}" existing`)
				return $
			}

			tplID = $.workspaces[wsID].templates[idx].id
			if ($.workspaces[wsID].templates.length < 2) {
				$.workspaces[wsID].templates[0].name = ''
				$.workspaces[wsID].templates[0].source = ''
			} else {
				$.workspaces[wsID].templates.splice(idx, 1)
			}
			return $
		})
		if (err !== null) {throw err}
		this.#errors.update(($)=> {
			delete $[wsID].templates[tplID]
			return $
		})
		this.initEngine(wsID)
	}

	public duplicateTemplate(wsID: string, idx: number): void {
		let err: Error|null = null
		this._update(($)=> {
			if (idx < 0 || idx >= $.workspaces[wsID].templates.length) {
				err = new Error(`no template by index "${idx}" existing`)
				return $
			}

			const tpl = $.workspaces[wsID].templates[idx]
			$.workspaces[wsID].templates.splice(idx+1, 0, {
				_version: tpl._version,
				id: randID(),
				name: tpl.name ? tpl.name + ' - copy' : '',
				source: tpl.source,
			})
			return $
		})
		if (err !== null) {throw err}
		this.initEngine(wsID)
	}

	public updateTemplate(
		wsID: string,
		idx: number,
		{name, source}: Partial<Exclude<GG_Template, 'id'>>,
	): void {
		let err: Error|null = null
		this._update(($)=> {
			if (idx < 0 || idx >= $.workspaces[wsID].templates.length) {
				err = new Error(`no template by index "${idx}" existing`)
				return $
			}

			if (typeof name === 'string') {
				$.workspaces[wsID].templates[idx].name = name
			}
			if (typeof source === 'string') {
				$.workspaces[wsID].templates[idx].source = source
			}
			return $
		})
		if (err !== null) {throw err}
		this._debouncedEngineInit(wsID)
	}

	/* :: QUERY ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: */

	public newQuery(wsID: string): string {
		let queryID = ''
		this._update(($)=> {
			const newQuery = this._newQueryObj()
			$.workspaces[wsID].queries.push(newQuery)
			queryID = newQuery.id
			return $
		})
		return queryID
	}

	public deleteQuery(wsID: string, idx: number): void {
		let err: Error|null = null
		let queryID = ''
		this._update(($)=> {
			if (idx < 0 || idx >= $.workspaces[wsID].queries.length) {
				err = new Error(`no query by index "${idx}" existing`)
				return $
			}

			queryID = $.workspaces[wsID].queries[idx].id
			if ($.workspaces[wsID].queries.length < 2) {
				$.workspaces[wsID].queries[0].name = ''
				$.workspaces[wsID].queries[0].query = ''
				$.workspaces[wsID].queries[0].variables = ''
			} else {
				$.workspaces[wsID].queries.splice(idx, 1)
			}
			return $
		})
		if (err !== null) {throw err}
		this.#errors.update(($)=> {
			delete $[wsID][queryID]
			return $
		})
		this.#queryResults.update(($)=> {
			delete $[wsID][queryID]
			return $
		})
		this.#parsedOperations.update(($)=> {
			delete $[wsID][queryID]
			return $
		})
	}

	public duplicateQuery(wsID: string, idx: number): void {
		let err: Error|null = null
		this._update(($)=> {
			if (idx < 0 || idx >= $.workspaces[wsID].queries.length) {
				err = new Error(`no query by index "${idx}" existing`)
				return $
			}

			const query = $.workspaces[wsID].queries[idx]
			$.workspaces[wsID].queries.splice(idx+1, 0, {
				_version: query._version,
				id: randID(),
				name: query.name ? query.name + ' - copy' : '',
				query: query.query,
				variables: query.variables,
			})
			return $
		})
		if (err !== null) {throw err}
		this.parseOperation(wsID, idx)
	}

	public updateQuery(
		wsID: string,
		idx: number,
		{name, query, variables}: Partial<Exclude<GG_Query, 'id'>>,
	): void {
		let shouldParseQuery = false
		let err: Error|null = null
		let queryID = ''
		this._update(($)=> {
			if (wsID === null) {
				err = new Error('no workspace selected')
				return $
			}
			if (idx < 0 || idx >= $.workspaces[wsID].queries.length) {
				err = new Error(`no query by index "${idx}" existing`)
				return $
			}

			queryID = $.workspaces[wsID].queries[idx].id
			if (typeof name === 'string') {
				$.workspaces[wsID].queries[idx].name = name
			}
			if (typeof query === 'string') {
				shouldParseQuery = true
				$.workspaces[wsID].queries[idx].query = query
			}
			if (typeof variables === 'string') {
				$.workspaces[wsID].queries[idx].variables = variables
			}
			return $
		})
		if (err !== null) {throw err}
		this.#queryResults.update(($)=> {
			delete $[wsID][queryID]
			return $
		})
		if (shouldParseQuery) {this._debouncedParseOperation(wsID, idx)}
	}

	/* :: ENGINE :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: */

	private _debouncedEngineInit = debounce((wsID: string)=> this.initEngine(wsID), 300)

	public initEngine(wsID: string): EngineAPI_InitError<any>|null {
		const $ws = this.$()
		this.#engineInited.set(false)
		const schemaSource = $ws.workspaces[wsID].isSchemaless ? '' : $ws.workspaces[wsID].schema
		const err = this._engine.init<any>(schemaSource, $ws.workspaces[wsID].templates)
		this.#queryResults.update(($)=> {
			$[wsID] = {}
			return $
		})
		this.#errors.update(($)=> {
			if (err === null) {
				delete $[wsID]
				return $
			}
			switch (err.code) {
			case EngineAPI_InitErrorCode.INIT_GQT_PARSER:
				$[wsID] = {gqt: err.errors, schema: null, templates: {}, queries: {}}
				break
			case EngineAPI_InitErrorCode.SCHEMA_ERR:
				$[wsID] = {schema: err.errors, gqt: null, templates: {}, queries: {}}
				break
			case EngineAPI_InitErrorCode.TEMPLATE_ERR:
				$[wsID] = {templates: err.errors, gqt: null, schema: null, queries: {}}
				break
			}
			return $
		})
		this.parseAllOperations(wsID)
		this.#engineInited.set(true)
		return err
	}

	private _engineMatchAll(query: string, operationName: string, variablesJSON: string): EngineAPI_MatchAllResult {
		return this._engine.matchAll(query, operationName, variablesJSON)
	}

	public executeQuery(wsID: string, queryID: string, operationName?: string) {
		this._panicWhenEngineIsIniting()

		const $ = this.$()
		if (!(wsID in $.workspaces)) {
			throw new Error(`workspace by id "${wsID}" not existing`)
		}

		const ws = $.workspaces[wsID]
		const queryIdx = ws.queries.findIndex(({id})=> id === queryID)
		if (queryIdx === -1) {
			throw new Error(`query by id "${queryID}" not existing`)
		}
	
		const result = this._engineMatchAll(
			ws.queries[queryIdx].query,
			typeof operationName === 'string' ? operationName : '',
			ws.queries[queryIdx].variables,
		)

		this.#queryResults.update(($)=> {
			$[wsID][ws.queries[queryIdx].id] = {
				matched: result.matched || [],
				error: result?.error || null,
			}
			return $
		})
	}

	private _debouncedParseOperation = debounce(
		(wsID: string, queryIdx: number)=> this.parseOperation(wsID, queryIdx),
		300,
	)

	public parseAllOperations(wsID: string) {
		const $ws = this.$().workspaces[wsID]
		$ws.queries.forEach((_, idx)=> this.parseOperation(wsID, idx))
	}

	public parseOperation(wsID: string, queryIdx: number) {
		const $ws = this.$().workspaces[wsID]
		const query = $ws.queries[queryIdx]
		const parsed = this._engine.parseOperation(query.query)
		if (typeof parsed.code === 'string') {
			this.#errors.update(($)=> {
				if (!(wsID in $)) {
					$[wsID] = {
						gqt: null,
						schema: null,
						templates: {},
						queries: {[query.id]: [parsed.errors as string]},
					}
				} else {
					$[wsID].queries[query.id] = [parsed.errors as string]
				}
				return $
			})
		}
		else if (parsed.operations) {
			const ops = parsed.operations as Array<EngineAPI_Operation>
			this.#errors.update(($)=> {
				if (wsID in $) {delete $[wsID].queries[query.id]}
				return $
			})
			this.#parsedOperations.update(($)=> {
				if (!(wsID in $)) {$[wsID] = {}}
				if (ops.length < 1) {delete $[wsID][query.id]}
				else {$[wsID][query.id] = ops}
				return $
			})
		}
	}
}

export const $ = new Playground()
