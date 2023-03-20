import type {Readable, Updater} from 'svelte/store'
import {writable, get as get$, derived} from 'svelte/store'
import {storeIsInited} from './stores_init'
import {randID} from '../utils/misc'
import debounce from 'lodash/debounce'
import newLocalStorageKey from './_local_storage_prefix'
import {importWorkspaceVersion} from '../utils/workspace_import'

export const WS_VERSION = 0
export const TEMPLATE_VERSION = 0
export const OPERATION_VERSION = 0
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
	Operation = 'Operation',
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
	matchAll: (source: string, operationName: string, variablesJSON: string)=> EngineAPI_MatchAllResult
	parseOperation: (source: string)=> EngineAPI_ParsedOperation
}

export type GG_OperationResults = {
	matched: Array<string>
	error: string|null
}

export type GG_Operation = VersionedEntity & {
	id: string
	name: string
	source: string
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
	operations: Array<GG_Operation>
	isSchemaless: boolean
}

export type GG_ImportOperation = Partial<VersionedEntity & {name: string, source: string, variables: string}>

export type GG_ImportTemplate = Partial<VersionedEntity & {name: string, source: string}>

export type GG_ImportWorkspace = Partial<VersionedEntity & {
	name: string
	schema: string
	creation: number
	isSchemaless: boolean
	templates: Array<GG_ImportOperation>
	operations: Array<GG_ImportTemplate>
}>

type t_$ = VersionedEntity & {
	workspaces: {[id: string]: GG_Workspace}
}

type t_$errors = {[wsID: string]: {
	gqt: null|Array<string>
	schema: null|Array<string>
	templates: {[tplID: string]: Array<string>}
	operations: {[opID: string]: Array<string>}
}}

type t_$parsedOperations = {[wsID: string]: {[opID: string]: Array<EngineAPI_Operation>}}

type t_$operationResults = {[wsID: string]: {[opID: string]: GG_OperationResults}}

class Playground implements Readable<t_$> {
	#locStrID = newLocalStorageKey('workspaces')

	private _engine: EngineAPI

	#store = writable<t_$>({_version: STORE_VERSION, workspaces: {}})
	#errors = writable<t_$errors>({})
	#operationResults = writable<t_$operationResults>({})
	#engineInited = writable(false)
	#parsedOperations = writable<t_$parsedOperations>({})

	public readonly subscribe = this.#store.subscribe
	public errors = derived(this.#errors, ($)=> $)
	public results = derived(this.#operationResults, ($)=> $)
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

	private _validateOperation(possibleOp: GG_Operation): GG_Operation|null {
		const op = this._newOperationObj()
		if (typeof possibleOp.id === 'string') {
			op.id = possibleOp.id
		}
		if (typeof possibleOp.name === 'string') {
			op.name = possibleOp.name
		}
		if (typeof possibleOp.source === 'string') {
			op.source = possibleOp.source
		}
		if (typeof possibleOp.variables === 'string') {
			op.variables = possibleOp.variables
		}

		// if (op._version !== OPERATION_VERSION) {/* migrate */}
		return op
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

		if (Array.isArray(possibleWs.operations) && possibleWs.operations.length > 0) {
			ws.operations = []
			possibleWs.operations.forEach((possibleOp)=> {
				const op = this._validateOperation(possibleOp)
				if (op !== null) {ws.operations.push(op)}
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
		this._initWorkspace()
	}

	private async _initWorkspace(): Promise<void> {
		let initExampleWorkspace = false
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

			initExampleWorkspace = Object.keys($.workspaces).length < 1

			// if ($._version !== STORE_VERSION) {/* migrate */}
			return $
		})

		if (initExampleWorkspace) {
			await this.addExampleWorkspaceStarwars()
		}

		this._engine = window['engine'] as EngineAPI
		this._engine.__run()
		storeIsInited('playground')
		this._engine.__init.then(()=> storeIsInited('engine'))
	}

	public async addExampleWorkspaceStarwars(): Promise<string> {
		const exampleWS = await import('../utils/default_workspace.json')
		const ws = importWorkspaceVersion(exampleWS)
		this._update(($)=> {
			$.workspaces[ws.id] = ws
			return $
		})
		return ws.id
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
			operations: (
				$.workspaces[wsID].operations.length ? $.workspaces[wsID].operations.map(
					({_version, name, source, variables})=> ({
						_version,
						name: name || undefined,
						source: source || undefined,
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

	private _newOperationObj(name?: string): GG_Operation {
		return {
			_version: OPERATION_VERSION,
			id: randID(),
			name: name ?? '',
			source: '',
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
			operations: [this._newOperationObj()],
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
				$.workspaces[wsID].operations = [this._newOperationObj()]
			} else {
				delete $.workspaces[wsID]
			}
			this.#errors.update(($)=> {
				delete $[wsID]
				return $
			})
			this.#operationResults.update(($)=> {
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

	/* :: OPERATION ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: */

	public newOperation(wsID: string): string {
		let opID = ''
		this._update(($)=> {
			const newOp = this._newOperationObj()
			$.workspaces[wsID].operations.push(newOp)
			opID = newOp.id
			return $
		})
		return opID
	}

	public deleteOperation(wsID: string, idx: number): void {
		let err: Error|null = null
		let opID = ''
		this._update(($)=> {
			if (idx < 0 || idx >= $.workspaces[wsID].operations.length) {
				err = new Error(`no operation by index "${idx}" existing`)
				return $
			}

			opID = $.workspaces[wsID].operations[idx].id
			if ($.workspaces[wsID].operations.length < 2) {
				$.workspaces[wsID].operations[0].name = ''
				$.workspaces[wsID].operations[0].source = ''
				$.workspaces[wsID].operations[0].variables = ''
			} else {
				$.workspaces[wsID].operations.splice(idx, 1)
			}
			return $
		})
		if (err !== null) {throw err}
		this.#errors.update(($)=> {
			delete $[wsID][opID]
			return $
		})
		this.#operationResults.update(($)=> {
			delete $[wsID][opID]
			return $
		})
		this.#parsedOperations.update(($)=> {
			delete $[wsID][opID]
			return $
		})
	}

	public duplicateOperation(wsID: string, idx: number): void {
		let err: Error|null = null
		this._update(($)=> {
			if (idx < 0 || idx >= $.workspaces[wsID].operations.length) {
				err = new Error(`no operation by index "${idx}" existing`)
				return $
			}

			const op = $.workspaces[wsID].operations[idx]
			$.workspaces[wsID].operations.splice(idx+1, 0, {
				_version: op._version,
				id: randID(),
				name: op.name ? op.name + ' - copy' : '',
				source: op.source,
				variables: op.variables,
			})
			return $
		})
		if (err !== null) {throw err}
		this.parseOperation(wsID, idx)
	}

	public updateOperation(
		wsID: string,
		idx: number,
		{name, source, variables}: Partial<Exclude<GG_Operation, 'id'>>,
	): void {
		let shouldParseOperation = false
		let err: Error|null = null
		let opID = ''
		this._update(($)=> {
			if (wsID === null) {
				err = new Error('no workspace selected')
				return $
			}
			if (idx < 0 || idx >= $.workspaces[wsID].operations.length) {
				err = new Error(`no operation by index "${idx}" existing`)
				return $
			}

			opID = $.workspaces[wsID].operations[idx].id
			if (typeof name === 'string') {
				$.workspaces[wsID].operations[idx].name = name
			}
			if (typeof source === 'string') {
				shouldParseOperation = true
				$.workspaces[wsID].operations[idx].source = source
			}
			if (typeof variables === 'string') {
				$.workspaces[wsID].operations[idx].variables = variables
			}
			return $
		})
		if (err !== null) {throw err}
		this.#operationResults.update(($)=> {
			delete $[wsID][opID]
			return $
		})
		if (shouldParseOperation) {this._debouncedParseOperation(wsID, idx)}
	}

	/* :: ENGINE :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: */

	private _debouncedEngineInit = debounce((wsID: string)=> this.initEngine(wsID), 300)

	public initEngine(wsID: string): EngineAPI_InitError<any>|null {
		const $ws = this.$()
		this.#engineInited.set(false)
		const schemaSource = $ws.workspaces[wsID].isSchemaless ? '' : $ws.workspaces[wsID].schema
		const err = this._engine.init<any>(schemaSource, $ws.workspaces[wsID].templates)
		this.#operationResults.update(($)=> {
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
				$[wsID] = {gqt: err.errors, schema: null, templates: {}, operations: {}}
				break
			case EngineAPI_InitErrorCode.SCHEMA_ERR:
				$[wsID] = {schema: err.errors, gqt: null, templates: {}, operations: {}}
				break
			case EngineAPI_InitErrorCode.TEMPLATE_ERR:
				$[wsID] = {templates: err.errors, gqt: null, schema: null, operations: {}}
				break
			}
			return $
		})
		this.parseAllOperations(wsID)
		this.#engineInited.set(true)
		return err
	}

	private _engineMatchAll(source: string, operationName: string, variablesJSON: string): EngineAPI_MatchAllResult {
		return this._engine.matchAll(source, operationName, variablesJSON)
	}

	public executeOperation(wsID: string, opID: string, operationName?: string) {
		this._panicWhenEngineIsIniting()

		const $ = this.$()
		if (!(wsID in $.workspaces)) {
			throw new Error(`workspace by id "${wsID}" not existing`)
		}

		const ws = $.workspaces[wsID]
		const opIdx = ws.operations.findIndex(({id})=> id === opID)
		if (opIdx === -1) {
			throw new Error(`operation by id "${opID}" not existing`)
		}
	
		const result = this._engineMatchAll(
			ws.operations[opIdx].source,
			typeof operationName === 'string' ? operationName : '',
			ws.operations[opIdx].variables,
		)

		this.#operationResults.update(($)=> {
			$[wsID][ws.operations[opIdx].id] = {
				matched: result.matched || [],
				error: result?.error || null,
			}
			return $
		})
	}

	private _debouncedParseOperation = debounce(
		(wsID: string, opIdx: number)=> this.parseOperation(wsID, opIdx),
		300,
	)

	public parseAllOperations(wsID: string) {
		const $ws = this.$().workspaces[wsID]
		$ws.operations.forEach((_, idx)=> this.parseOperation(wsID, idx))
	}

	public parseOperation(wsID: string, opIdx: number) {
		const $ws = this.$().workspaces[wsID]
		const op = $ws.operations[opIdx]
		const parsed = this._engine.parseOperation(op.source)
		if (typeof parsed.code === 'string') {
			this.#errors.update(($)=> {
				if (!(wsID in $)) {
					$[wsID] = {
						gqt: null,
						schema: null,
						templates: {},
						operations: {[op.id]: [parsed.errors as string]},
					}
				} else {
					$[wsID].operations[op.id] = [parsed.errors as string]
				}
				return $
			})
		}
		else if (parsed.operations) {
			const ops = parsed.operations as Array<EngineAPI_Operation>
			this.#errors.update(($)=> {
				if (wsID in $) {delete $[wsID].operations[op.id]}
				return $
			})
			this.#parsedOperations.update(($)=> {
				if (!(wsID in $)) {$[wsID] = {}}
				if (ops.length < 1) {delete $[wsID][op.id]}
				else {$[wsID][op.id] = ops}
				return $
			})
		}
	}
}

export const $ = new Playground()
