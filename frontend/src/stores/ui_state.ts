import type {Readable, Unsubscriber, Updater} from 'svelte/store'
import {writable, get as get$} from 'svelte/store'
import {$ as workspace} from './playground'
import {initStore} from './stores_init'

export enum PlaygroundTab {
	SchemaAndTemplates = 'SchemaAndTemplates',
	Queries = 'Queries',
}

type GG_WorkspaceUIState = {
	selectedTemplateIndex: number
	selectedQueryIndex: number
}

type t_$ = {
	version: number // indicates the version of the store. different store can be migrated differently.
	selectedTab: PlaygroundTab
	selectedWorkspaceID: string
	workspaces: {[id: string]: GG_WorkspaceUIState}
}

class UIState implements Readable<t_$> {
	#locStrID = 'gg-proxy-playground__ui-state'

	#store = writable<t_$>({
		version: 0,
		selectedTab: PlaygroundTab.SchemaAndTemplates,
		selectedWorkspaceID: '',
		workspaces: {},
	})
	public readonly subscribe = this.#store.subscribe
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
						selectedQueryIndex: 0,
					}
				}

				if (hasChanges) {this._writeLocalStore($)}
				return $
			})
		})
		initStore('uiState')
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
					selectedQueryIndex: 0,
				}
			}
			return $
		})
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

	public selectQuery(idx: number): void {
		let err: Error|null = null
		this._update(($)=> {
			if ($.selectedWorkspaceID === null) {
				err = new Error('workspace not selected')
			} else {
				$.workspaces[$.selectedWorkspaceID].selectedQueryIndex = idx
			}
			return $
		})
		if (err !== null) {throw err}
	}
}

export const $ = new UIState()
