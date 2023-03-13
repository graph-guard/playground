<script lang='ts' context='module'>
import {writable, get as get$} from 'svelte/store'
import {randID} from '../../utils/misc'

type CloseCallback = (close: ()=> void)=> void
type Timeout = number

export enum e_ToastStyle {
	Error = 'error', Info = 'info',
	Warn = 'warn', Success = 'success'
}

export type t_Toast = {
	id:           string
	style?:       e_ToastStyle
	msg:          string
	duration:     number // 0 means it have to be closed manually
	beingHovered: boolean
	action?: {
		label: string
		fn:    CloseCallback
	}
}

const thisStore = writable<Array<t_Toast>>([])

let _toasterTimer: {[id: string]: Timeout} = {}
let _actionID: string|null = null

export function popToast(
	{style, msg, duration = 5e3, action}:
	{
		style?: e_ToastStyle, msg: string, duration?: number,
		action?: {label: string, fn: CloseCallback},
	}
) {
	thisStore.update(($)=> {
		const id = randID()
		if ($.length < 1) {
			_actionID = stackAction(function() {
				closeToast(get$(thisStore)[0].id)
			})
		}
		$.push({
			id, style, msg, duration, action,
			beingHovered: false,
		})
		startToastTimer(id)
		return $
	})
}

export function closeToast(id: string) {
	thisStore.update(($)=> {
		const idx = $.findIndex((toast)=> toast.id === id)
		if (idx >= 0) {
			$.splice(idx, 1)
			clearTimeout(_toasterTimer[id])
			delete _toasterTimer[id]
			if ($.length < 1) {
				resolveAction(_actionID as string)
				_actionID = null
			}
		}
		return $
	})
}

export function stopToastTimer(id: string) {
	thisStore.update(($)=> {
		if (id in _toasterTimer) {
			clearTimeout(_toasterTimer[id])
			const idx = $.findIndex((toast)=> toast.id === id)
			$[idx].beingHovered = true
		}
		return $
	})
}

export function startToastTimer(id: string) {
	thisStore.update(($)=> {
		const idx = $.findIndex((toast)=> toast.id === id)
		if (idx >= 0 && $[idx].duration > 0) {
			$[idx].beingHovered = false
			_toasterTimer[id] = setTimeout(
				closeToast.bind(this, id),
				$[idx].duration,
			)
		}
		return $
	})
}
</script>



<script lang='ts'>
import {appState, resolveAction, stackAction} from '../../App.svelte'
import Toast from '../snippets/Toast.svelte'
import {flip} from 'svelte/animate'
</script>



<div id='Toasts' class='overlay-fixed'>
	<div class='toasts-stack grid'>
		{#each $thisStore as toast (toast)}
			<div animate:flip={{duration: $appState.a11y.reducedMotion ? 0 : 500}}>
				<Toast {toast}
					on:close|once={()=> closeToast(toast.id)}
					on:pointerOver={()=> stopToastTimer(toast.id)}
					on:pointerLeave={()=> startToastTimer(toast.id)}
				/>
			</div>
		{/each}
	</div>
</div>



<style lang='sass'>
#Toasts
	z-index: var(--idx-toasts)
	overflow: hidden
	pointer-events: none
	contain: strict
	> .toasts-stack
		z-index: 0
		position: absolute
		pointer-events: auto
		bottom: 1rem
		left: 1rem
</style>
