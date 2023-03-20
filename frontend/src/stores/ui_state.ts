import type {Readable, Unsubscriber, Updater} from 'svelte/store'
import {writable, get as get$} from 'svelte/store'
import {$ as workspace} from './playground'
import {storeIsInited} from './stores_init'
import newLocalStorageKey from './_local_storage_prefix'

const UI_STATE_VERSION = 0

export enum PlaygroundTab {
	SchemaAndTemplates = 'SchemaAndTemplates',
	Operations = 'Operations',
}

type GG_WorkspaceUIState = {
	selectedTemplateIndex: number
	selectedOperationIndex: number
	selectedOperationName: {[opID: string]: string}
}

type t_$ = {
	_version: number // indicates the version of the store. different store can be migrated differently.
	selectedTab: PlaygroundTab
	selectedWorkspaceID: string
	workspaces: {[id: string]: GG_WorkspaceUIState}
}

class UIState implements Readable<t_$> {
	#locStrID = newLocalStorageKey('ui-state')

	#store = writable<t_$>({
		_version: UI_STATE_VERSION,
		selectedTab: PlaygroundTab.SchemaAndTemplates,
		selectedWorkspaceID: '',
		workspaces: {},
	})
	public readonly subscribe = this.#store.subscribe
	public $() {return get$(this)}

	public playLogoAnim = writable(false)

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
			try {
				return JSON.parse(localStorage.getItem(this.#locStrID) as string)
			} catch {
				localStorage.removeItem(this.#locStrID)
			}
		}
		return null
	}

	private _unsubWsStore: Unsubscriber

	constructor() {
		const locStore = this._scanLocalStore()
		if (locStore) {
			this.#store.update(($)=> {
				if (locStore.selectedWorkspaceID) {
					const $ws = workspace.$()
					$.selectedWorkspaceID = (
						locStore.selectedWorkspaceID in $ws.workspaces ?
						locStore.selectedWorkspaceID : $.selectedWorkspaceID = Object.keys($ws.workspaces)[0]
					)
				}
				if (locStore.selectedTab && Object.values(PlaygroundTab).includes(locStore.selectedTab as PlaygroundTab)) {
					$.selectedTab = locStore.selectedTab as PlaygroundTab
				}
				if (locStore.workspaces) {
					$.workspaces = locStore.workspaces
				}
				return $
			})
		}
		this._unsubWsStore = workspace.subscribe(($ws)=> {
			this.#store.update(($)=> {
				let hasChanges = false

				const uiStateWsIDs = Object.keys($.workspaces)
				for (const id of uiStateWsIDs) {
					if (!(id in $ws.workspaces)) {
						hasChanges = true
						delete $.workspaces[id]
					}
				}

				if (!($.selectedWorkspaceID in $ws.workspaces)) {
					hasChanges = true
					$.selectedWorkspaceID = Object.keys($ws.workspaces)[0]
				}

				if (!($.selectedWorkspaceID in $.workspaces)) {
					hasChanges = true
					$.workspaces[$.selectedWorkspaceID] = {
						selectedTemplateIndex: 0,
						selectedOperationIndex: 0,
						selectedOperationName: {},
					}
				}

				if (hasChanges) {this._writeLocalStore($)}
				return $
			})
		})
		storeIsInited('uiState')
	}

	public destroy() {
		this._unsubWsStore()
	}

	public selectWorkspace(wsID: string): void {
		this._update(($)=> {
			$.selectedWorkspaceID = wsID
			if (!(wsID in $.workspaces)) {
				$.workspaces[wsID] = {
					selectedTemplateIndex: 0,
					selectedOperationIndex: 0,
					selectedOperationName: {},
				}
			}
			return $
		})
		workspace.initEngine(wsID)
	}

	public setTab(tab: PlaygroundTab): void {
		this._update(($)=> {
			$.selectedTab = tab
			return $
		})
	}

	public selectTemplate(idx: number): void {
		let err: Error|null = null
		this._update(($)=> {
			if ($.selectedWorkspaceID === null) {
				err = new Error('workspace not selected')
			} else {
				$.workspaces[$.selectedWorkspaceID].selectedTemplateIndex = idx
			}
			return $
		})
		if (err !== null) {throw err}
	}

	public selectOperation(idx: number): void {
		let err: Error|null = null
		this._update(($)=> {
			if ($.selectedWorkspaceID === null) {
				err = new Error('workspace not selected')
			} else {
				$.workspaces[$.selectedWorkspaceID].selectedOperationIndex = idx
			}
			return $
		})
		if (err !== null) {throw err}
	}

	public selectOperationName(wsID: string, opID: string, name: string|null) {
		this._update(($)=> {
			if (name === null) {
				delete $.workspaces[wsID].selectedOperationName[opID]
			} else {
				$.workspaces[wsID].selectedOperationName[opID] = name
			}
			return $
		})
	}
}

export const $ = new UIState()
