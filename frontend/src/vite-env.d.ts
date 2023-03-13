/// <reference types="svelte" />
/// <reference types="vite/client" />

declare type EnginePanic = {reason: string, stackTrace: string}
declare namespace svelte.JSX {
	interface HTMLAttributes<T> {
		onpanic?: (event: CustomEvent<EnginePanic> & { target: EventTarget & T }) => any;
	}
}
