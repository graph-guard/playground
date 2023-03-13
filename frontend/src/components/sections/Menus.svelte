<script lang='ts' context='module'>
/**
 * How to add/remove a menu
 * 1. Import component & props interface
 * 2. Implement i_MenuProps (if no props, set to null)
 * 3. Implement menuComponent
*/

import Menu_List from '../menus/List.svelte'
import type {Props as MenuProps_List} from '../menus/List.svelte'

import Menu_Selection from '../menus/Selection.svelte'
import type {Props as MenuProps_Selection} from '../menus/Selection.svelte'

export interface i_MenuProps {
	list: MenuProps_List
	selection: MenuProps_Selection
}

const menuComponent: {[name: string]: typeof SvelteComponent} = {
	list: Menu_List,
	selection: Menu_Selection,
}

// -----------------------------------------------------------------------------

import type {Readable} from 'svelte/store'
import {writable, get as get$} from 'svelte/store'
import type {SvelteComponent} from 'svelte'
import {resolveAction, restrictFocus, stackAction, lockScroll, unlockScroll} from '../../App.svelte'
import debounce from 'lodash/debounce'
import {randID} from '../../utils/misc'

const _lockScrollID = randID()

export type t_AppMenuDirection = {x: 'left'|'right', y: 'top'|'bottom'}
export type t_AppMenuCoordinates = {x: number, y: number}
export type t_AppMenuDimensions = {width: number|null, height: number|null}
export type t_AppMenuOffset = {x?: 'left'|'right', y?: 'top'|'bottom'}

export type t_AppMenu<T extends keyof i_MenuProps> = {
	name: T
	props: Readable< i_MenuProps[T]>
	origin: {
		position: t_AppMenuCoordinates
		dimensions: t_AppMenuDimensions
	}
	position: t_AppMenuCoordinates
	dimensions: t_AppMenuDimensions
	offset?: t_AppMenuOffset
}

const thisStore = writable<Array<t_AppMenu<keyof i_MenuProps>>>([])

let _menuLastFocus = document.activeElement
const _menuResolver: Array<{
	actionID: string, resolve: Function,
	el: HTMLElement|null, index: number,
	releaseFocusRestriction: ()=> void,
}> = []

export function openMenu<T extends keyof i_MenuProps>(
	{name, props, position, dimensions, offset}: {
		name: T
		props: Readable<i_MenuProps[T]>
		position: t_AppMenuCoordinates
		dimensions?: t_AppMenuDimensions
		offset?: t_AppMenuOffset
	}
) {
	let resolve: Function = ()=> {}
	const promise = new Promise<void>((r)=> {resolve = r})

	if (get$(thisStore).length > 0) {
		closeMenu(0)
	}

	lockScroll(_lockScrollID)
	if (dimensions === undefined || dimensions === null) {
		dimensions = {width: null, height: null}
	}
	_menuResolver[0] = {
		actionID: stackAction(()=> closeMenu(0)),
		index: 0,
		el: null,
		resolve,
		releaseFocusRestriction: ()=> {},
	}
	thisStore.update(($)=> {
		$ = [{
			name, props, position, offset,
			dimensions: dimensions as t_AppMenuDimensions,
			origin: {
				position: {
					x: position.x,
					y: position.y,
				},
				dimensions: {
					width: dimensions?.width || null,
					height: dimensions?.height || null,
				},
			},
		}]
		return $
	})
	_menuLastFocus = document.activeElement

	return promise
}

export function openSubMenu<T extends keyof i_MenuProps>(
	idx: number, menu: t_AppMenu<T>,
) {
	let resolve: Function;
	const promise = new Promise<void>((r)=> {resolve = r})

	if (idx >= get$(thisStore).length - 1) {
		closeMenu(idx)
	}
	thisStore.update(($)=> {
		if ($.length > 0) {
			_menuResolver[$.length] = {
				actionID: stackAction(()=> closeMenu($.length)),
				index: $.length,
				el: null,
				resolve,
				releaseFocusRestriction: ()=> {},
			}
			$.push(menu)
		} else {
			throw new Error('cannot open a sub menu without an open menu')
		}
		return $
	})

	return promise
}

export function closeMenu(idx: number) {
	thisStore.update(($)=> {
		for (let i = $.length-1; i >= idx; i--) {
			resolveAction(_menuResolver[i].actionID)
			_menuResolver[i].releaseFocusRestriction()
			_menuResolver[i].resolve()
			_menuResolver.splice(i, 1)
			$.pop()
		}
		return $
	});
	if (idx === 0) {
		unlockScroll(_lockScrollID)
	};
	(_menuLastFocus as HTMLElement).focus();
}

interface i_HasMenu_Options<T extends keyof i_MenuProps> {
	name: T
	props: i_MenuProps[T]
	offset?: {
		y?: 'top'|'bottom'
		x?: 'left'|'right'
	}
	fillWidth?: boolean
}

export function hasMenu<T extends keyof i_MenuProps>(
	node: HTMLElement,
	{name, props, offset, fillWidth}: i_HasMenu_Options<T>,
) {
	let _offset = {y: offset?.y, x: offset?.x}
	const _props = writable(props)
	let _fillWidth = fillWidth
	let _isOpen = false
	async function callback() {
		_isOpen = true
		const bounding = node.getBoundingClientRect()

		let y = bounding.y
		if (_offset.y === 'top') {
			y += node.offsetHeight
		}

		let x = bounding.x
		if (_offset.x === 'left') {
			x += node.offsetWidth
		}


		await openMenu({
			name: name,
			props: {subscribe: _props.subscribe},
			position: {x, y},
			offset: _offset,
			dimensions: {
				width: _fillWidth ? node.offsetWidth : null,
				height: null,
			},
		})
		_isOpen = false
	}
	node.addEventListener('click', callback)
	return {
		update(
			{props, offset, fillWidth}: i_HasMenu_Options<T>,
		) {
			_props.set(props)
			_offset = {y: offset?.y, x: offset?.x}
			_fillWidth = fillWidth
			thisStore.update(($)=> {
				if ($.length > 0) {
					$[$.length - 1].props = _props
				}
				return $
			})
		},
		destroy() {
			if (_isOpen) {closeMenu(0)}
			node.removeEventListener('click', callback)
		},
	}
}

function _checkBoundingBox(menuIdx: number) {
	const node = _menuResolver[menuIdx].el
	if (node === null) {return}
	thisStore.update(($)=> {
		node.style.height = ''

		$[menuIdx].position.x = $[menuIdx].origin.position.x
		if ($[menuIdx].offset?.x === 'right') {
			$[menuIdx].position.x -= node.offsetWidth
		}

		$[menuIdx].position.y = $[menuIdx].origin.position.y
		if ($[menuIdx].offset?.y === 'bottom') {
			$[menuIdx].position.y -= node.offsetHeight
		}

		// 16(px) is the font size
		// 32(px) is double the font size

		// check if higher then screenspace
		if (node.offsetHeight > window.innerHeight - 32) {
			$[menuIdx].position.y = 16
			node.style.height = window.innerHeight - 32 + 'px'
		}
		// else check if y position plus hight is within screenspace
		else if (
			$[menuIdx].position.y + node.offsetHeight > window.innerHeight - 16
		) {
			$[menuIdx].position.y = (
				window.innerHeight - 16 - node.offsetHeight
			)
		}
		// else check if y position minus hight is within screenspace
		else if ($[menuIdx].position.y < 16) {
			$[menuIdx].position.y = 16
		}

		// check if wider then screenspace
		if (node.offsetWidth > window.innerWidth - 32) {
			$[menuIdx].position.x = 16
			node.style.width = window.innerWidth - 32 + 'px'
		}
		// else check if x position plus width is within screenspace
		else if (
			$[menuIdx].position.x + node.offsetWidth > window.innerWidth - 16
		) {
			$[menuIdx].position.x = (
				window.innerWidth - 16 - node.offsetWidth
			)
		}
		// else check if x position minus width is within screenspace
		else if ($[menuIdx].position.x < 16) {
			$[menuIdx].position.x = 16
		}
		return $
	})
}

function _onMenuMounted(idx: number, el: HTMLElement) {
	_menuResolver[idx].releaseFocusRestriction = restrictFocus(el)
	_menuResolver[idx].el = el
}
</script>



<svelte:window
	on:resize={debounce(()=> {
		for (const menu of _menuResolver) {
			_checkBoundingBox(menu.index)
		}
	}, 150)}
	on:click|capture={(event)=> {
		if ($thisStore.length > 0) {
			let isOutsideClick = true
			for (const el of event.composedPath()) {
				for (let i = 0; i < $thisStore.length; i++) {
					if (el === _menuResolver[i].el) {
						isOutsideClick = false
						break
					}
				}
				if (!isOutsideClick) {break}
			}
			if (isOutsideClick) {closeMenu(0)}
			return true
		}
	}}
/>



<div id='MenusContainer'>
	{#each $thisStore as menu, menuIdx (menu)}
		<svelte:component
			this={menuComponent[menu.name]}
			props={menu.props}
			position={menu.position}
			dimensions={menu.dimensions}
			offset={menu.offset}
			checkBoundingBox={()=> _checkBoundingBox(menuIdx)}
			on:close={()=> closeMenu(menuIdx)}
			on:mounted|once={({detail: el})=> _onMenuMounted(menuIdx, el)}
		/>
	{/each}
</div>



<style lang='sass'>
#MenusContainer
	z-index: var(--idx-menus)
	position: fixed
	top: 0
	left: 0
	width: 100%
	height: 100%
	pointer-events: none
	:global(> *)
		pointer-events: all

:global(.app-menu)
	position: absolute
	pointer-events: all
	contain: content
	overscroll-behavior: contain
:global(.app-menu.default-style)
	padding: 0.5rem 0
	border: var(--modal-border)
	background-color: var(--modal-bg)
	box-shadow: var(--shadow-contrast), var(--shadow-contrast), 0 4px 10px -4px var(--shadow-dark-clr), 0 8px 20px var(--shadow-clr)
	border-radius: 0.5rem
</style>
