<script lang='ts'>
import {createEventDispatcher} from 'svelte'
const dispatch = createEventDispatcher<{input: string}>()

export let label: string
export let value = ''
export let hasError = false
export let readonly = false
export let type: 'text'|'email'|'password' = 'text'
const _type =(node)=> {node.type = type}

let isFocused = false
$:isEmpty = (
	value === '' || value === null || value === undefined
)
$:maxlenreached = (
	$$restProps?.maxlength && (value.length || 0) >= $$restProps.maxlength
)
</script>



<div class='app-input flex flex-center-y {$$restProps?.class || ''}'
class:empty={isEmpty}
class:focused={isFocused}
class:error={hasError}
class:maxlenreached>
	<span class='label'>{label}</span>
	<input
		use:_type
		{...$$restProps}
		{readonly}
		bind:value={value}
		on:focus={()=> isFocused = true}
		on:blur={()=> isFocused = false}
		on:input={()=> dispatch('input', value)}
	/>
	{#if $$restProps.maxlength && value.length > ($$restProps.maxlength * .8)}
		<span class='max-length'>
			{value.length || 0} / {$$restProps.maxlength}
		</span>
	{/if}
</div>



<style lang='sass'>
.app-input
	position: relative
	border-radius: var(--inpt-rounding)
	background-color: rgba(var(--font-base-clr), 0.05)
	border: solid 1px rgba(var(--font-base-clr), 0.15)
	box-shadow: none
	transition: var(--trans)
	transition-property: border-color, background-color, box-shadow
	&.error
		background-color: rgba(var(--clr-red), 0.1)
		border-color: rgb(var(--clr-red))
	input
		margin: 0
		padding: var(--inpt-pdng)
		width: 100%
		line-height: 1
		border-radius: inherit
		box-shadow: none
		background: none
		transition: none
		border: none
		color: rgb(var(--font-heading-clr))
	.max-length, .label
		position: absolute
		padding: 0 .25em
		left: .75rem
		border-radius: .25em
		pointer-events: none
		transform: translateX(-.25em)
	.max-length
		bottom: -.75em
		font-size: .5em
		background-color: rgb(var(--box-bg))
	.label
		top: var(--inpt-pdng)
		left: var(--inpt-pdng)
		transition: var(--trans)
		transition-property: transform
		will-change: transform
	&:hover
		background-color: rgba(var(--clr-accent), 0.1)
		border-color: rgb(var(--clr-accent))
		color: rgb(var(--font-heading-clr))
	&.focused
		background-color: transparent
		box-shadow: 0 0 0 1px rgb(var(--box-bg)), 0 0 0 .25em rgba(var(--clr-accent), 0.1)
		border-color: rgb(var(--clr-accent))
		color: rgb(var(--font-heading-clr))
	&.focused, &:not(.empty)
		.label
			font-size: .75rem
			transform: translateY(-1.6em)
			background-color: rgb(var(--box-bg))
		&:not(:hover):not(.focused) .label
			color: rgba(var(--font-base-clr), 0.75)
	&.maxlenreached .max-length
		font-weight: 600
</style>
