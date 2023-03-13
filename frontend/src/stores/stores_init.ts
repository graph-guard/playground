type storesToInit = 'i18n'|'engine'|'uiState'

let _resolve: Function;
const _initedStores: storesToInit[] = []
export const storesInit = new Promise<void>((res)=> {_resolve = res})
export const mustBeInited: readonly storesToInit[] = [
	'i18n', 'engine', 'uiState',
]

export function initStore(name: storesToInit) {
	if (_initedStores.indexOf(name) !== -1) {
		throw new Error(`store "${name}" has been already initialized`)
	}
	_initedStores.push(name)
	if (_initedStores.length === mustBeInited.length) {_resolve()}
}
