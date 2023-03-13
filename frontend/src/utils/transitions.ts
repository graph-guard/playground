import type {TransitionConfig} from 'svelte/transition'
import {cubicInOut, cubicOut} from 'svelte/easing'
import {appState} from '../App.svelte'

export function customTransition(config: TransitionConfig): TransitionConfig {
	return appState.$().a11y.reducedMotion ? {duration: 0} : config
}

export function fade(n, opts?: {duration?: number}) {
	return customTransition({
		duration: opts?.duration || 250,
		easing: cubicInOut,
		css: (t)=> `opacity: ${t};`,
	})
}

export function modalTransition(n, o?) {
	return customTransition({
		duration: 250,
		easing: cubicInOut,
		css: (t)=> (
			`transform: translateY(${1-t}rem) scale(${0.9 + 0.1 * t});` +
			`opacity: ${t};`
		),
	})
}

export function menuTransition(
	n, {x,y, duration = 150}: {
		x: 'left'|'right',
		y: 'top'|'bottom',
		duration?: number,
	},
) {
	return customTransition({
		duration,
		easing: cubicInOut,
		css: (t)=> (
			`transform-origin: ${x} ${y};` +
			`transform: scale(${0.9 + 0.1 * t});` +
			`opacity: ${t};`
		),
	})
}

export function navTransition(n, o?) {
	return customTransition({
		duration: 500,
		css: (t)=> (
			`transform-origin: left;` +
			`transform: translateX(-${110 - 110 * cubicInOut(t)}%);` +
			`opacity: ${cubicOut(t)};`
		),
	})
}

export function pageTransition(n, o?) {
	return customTransition({
		duration: 200,
		easing: cubicInOut,
		css: (t)=> (
			`opacity: ${t};` +
			`overflow: hidden;`
		),
	})
}

export function drawerTransition(node: HTMLElement, options?: {direction: 'left'|'right'}) {
	const elWidth = node.offsetWidth + 20
	return customTransition({
		duration: 300,
		easing: cubicInOut,
		css: (t)=> (
			`transform: translateX(${options?.direction === 'left' ? '':'-'}${elWidth * (1 - t)}px)`
		),
	})
}
