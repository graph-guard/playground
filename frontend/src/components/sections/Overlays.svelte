<script lang='ts' context='module'>
/**
 * How to add/remove an overlay
 * 1. Import component & props interface
 * 2. Implement i_OverlayProps (if no props, set to void)
 * 3. Implement overlayComponent
 */

import Overlay_LoaderFail, {type Props as OverlayProps_LoaderFail} from '../overlays/ModalLoaderFail.svelte'
import Overlay_Dialog, {type Props as OverlayProps_Dialog} from '../overlays/ModalDialog.svelte'
import Overlay_About from '../overlays/ModalAboutGraphGuard.svelte'
import Overlay_CritErr, {type Props as OverlayProps_CritErr} from '../overlays/ModalCritErr.svelte'
import Overlay_WorkspacesSidebar from '../overlays/DrawerWorkspacesSidebar.svelte'

export interface i_OverlayProps {
	loaderFail: OverlayProps_LoaderFail
	dialog:     OverlayProps_Dialog
	about:      void
	critErr:    OverlayProps_CritErr
	workspaces: void
}

const overlayComponent: {[name in keyof i_OverlayProps]: typeof SvelteComponent} = {
	loaderFail: Overlay_LoaderFail,
	dialog:     Overlay_Dialog,
	about:      Overlay_About,
	critErr:    Overlay_CritErr,
	workspaces: Overlay_WorkspacesSidebar,
}

// -----------------------------------------------------------------------------

import {writable} from 'svelte/store'
import type {SvelteComponent} from 'svelte'
import {randID} from '../../utils/misc'
import {lockScroll, resolveAction, restrictFocus, stackAction, unlockScroll} from '../../App.svelte'

export type t_AppOverlay<T extends keyof i_OverlayProps> = {
	id:         string
	name:       T
	props:      i_OverlayProps[T]
	escapable?: boolean
}

const thisStore = writable<Array<t_AppOverlay<keyof i_OverlayProps>>>([])

let _overlayLastFocus = document.activeElement as HTMLElement
let _overlayResolver: {[id: string]: {
	resolve: Function, actionID: string,
	releaseFocusRestriction: ()=> void,
}} = {}

export type openOverlay = <mID extends keyof i_OverlayProps>(
	{name, props}: {name: mID, props?: i_OverlayProps[mID]},
)=> Promise<void>

export function openOverlay<mID extends keyof i_OverlayProps>(
	{name, props, escapable = true}: {
		name: mID
		props?: i_OverlayProps[mID]
		escapable?: boolean
	},
): Promise<void> {
	let resolve: Function;
	const promise = new Promise<void>((r)=> {resolve = r})

	thisStore.update(($)=> {
		if ($.length == 0) {
			_overlayLastFocus = document.activeElement as HTMLElement
		}
		if (name in overlayComponent) {
			const id = randID()
			$.push({id, name, props, escapable})
			lockScroll(id)
			const actionID = stackAction(function() {
				if (escapable) {closeOverlay(id)}
			})
			_overlayResolver[id] = {
				actionID,
				resolve,
				releaseFocusRestriction: ()=> {},
			}
		} else {
			throw new Error(`no overlay registered by name "${name}"`)
		}
		return $
	})
	return promise
}

export function closeOverlay(id: string): void {
	if (!(id in _overlayResolver)) {
		throw new Error(`closeOverlay: provided ID not existing`)
	}
	unlockScroll(id)
	resolveAction(_overlayResolver[id].actionID)
	thisStore.update(($)=> {

		const idx = $.findIndex((overlay)=> overlay.id === id)
		_overlayResolver[id].releaseFocusRestriction()
		_overlayResolver[id].resolve()
		delete _overlayResolver[id]
		$.splice(idx, 1);
		if ($.length < 1) {
			_overlayLastFocus.focus()
		}
		return $
	});
}

export function closeAllOverlays(): void {
	thisStore.update(($)=> {
		for (let idx = 0; idx < $.length; idx++) {
			unlockScroll($[idx].id)
			resolveAction(_overlayResolver[$[idx].id].actionID)
			_overlayResolver[$[idx].id].releaseFocusRestriction()
			_overlayResolver[$[idx].id].resolve()
		}
		_overlayResolver = {}
		$ = []
		return $
	});
	_overlayLastFocus.focus()
}

function _overlayMounted(id: string, el: HTMLElement) {
	_overlayResolver[id].releaseFocusRestriction = restrictFocus(el)
}
</script>



<div id='Overlays' class:active={$thisStore.length > 0}>
	{#each $thisStore as overlay (overlay.id)}
		<svelte:component
			this={overlayComponent[overlay.name]}
			{openOverlay}
			escapable={overlay.escapable}
			props={overlay.props}
			on:close|once={()=> closeOverlay(overlay.id)}
			on:mounted|once={({detail: el})=> _overlayMounted(overlay.id, el)}
		/>
	{/each}
</div>



<style lang='sass'>
#Overlays
	z-index: var(--idx-overlays)
	position: fixed
	top: 0
	left: 0
	width: 100%
	height: 100%
	overflow: auto
	overscroll-behavior: contain
	contain: strict
	&:not(.active)
		pointer-events: none
	:global(> *)
		pointer-events: auto
</style>
