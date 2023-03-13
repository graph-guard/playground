<script lang='ts'>
import {createEventDispatcher} from 'svelte'
import {randID} from '../../utils/misc'
const dispatch = createEventDispatcher<{
	input:   string
	change:  string
	keydown: KeyboardEvent & {
		currentTarget: EventTarget & HTMLInputElement;
	}
}>()

const inptID = randID()
export let label = ''
export let value: string
export let readonly = false
export let type: 'text'|'email'|'password' = 'text'
export let hasError = false
export let noStyle = false
let isFocused = false

$:isEmpty = (
	value === '' || value === null || value === undefined
)

const _type =(node)=> {node.type = type}
</script>



<div class='app-input-auto-width {$$restProps.class || ''}'
class:empty={isEmpty} class:readonly
class:focused={isFocused} class:has-error={hasError}
class:no-style={noStyle}>
	{#if label && isEmpty}
		<span class='label'>{label}</span>
	{/if}
	{#if !isEmpty}
		<span class='value'>{value}</span>
	{/if}
	<input
		{...$$restProps}
		use:_type
		id={inptID}
		readonly={readonly}
		bind:value
		on:input={()=> dispatch('input', value)}
		on:change={()=> dispatch('change', value)}
		on:keydown={(e)=> dispatch('keydown', e)}
		on:focus={()=> isFocused = true}
		on:blur={()=> isFocused = false}
	/>
</div>



<style lang='sass'>
.app-input-auto-width
	display: inline-flex
	align-content: center
	align-items: center
	position: relative
	contain: layout
	max-width: 100%
	> input
		display: inline-block
		position: absolute
		top: 0
		left: 0
		width: 100%
		height: 100%
		margin: 0
		padding: inherit
		box-shadow: none
		background: none
		transition: none
		border: none
		border-radius: inherit
		font: inherit
		line-height: 1
	> .label, > .value
		display: inline-block
		min-width: 2ch
		max-width: 100%
		pointer-events: none
		white-space: pre
		font: inherit
		line-height: 1
	> .value
		overflow: hidden
	&:not(.focused) > input
		opacity: 0
	&:not(.readonly).focused > .value
		opacity: 0
	&.readonly > .label
		display: none

.app-input-auto-width:not(.no-style)
	border-radius: var(--inpt-rounding)
	transition: var(--trans)
	transition-property: border-color, background-color, color, box-shadow
	will-change: border-color, background-color, color, box-shadow
	color: rgb(var(--font-heading-clr))
	border: solid 1px rgba(var(--font-base-clr), 0.25)
	&.readonly
		background-color: transparent
	> .label
		color: rgba(var(--font-base-clr), 0.5)
	> .value, > input, > .label
		padding: var(--app-inpt-pdng, .25rem)
	> input
		transition: var(--trans)
		transition-property: color
		will-change: color
	&:not(.readonly)
		background-color: rgba(var(--font-base-clr), 0.05)
		&.has-error
			background-color: rgba(var(--clr-red), 0.1)
			> .label
				color: rgba(var(--clr-red), 0.5)
		&:hover
			background-color: rgba(var(--font-base-clr), 0.15)
		&.focused
			box-shadow: 0 0 0 1px rgb(var(--clr-accent)), 0 0 0 0.25em rgba(var(--clr-accent), 0.15)
			background-color: rgba(var(--clr-accent), 0.15)
</style>
