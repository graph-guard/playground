import type {Readable} from 'svelte/store'
import {derived} from 'svelte/store'
import {init, register, locale, isLoading} from 'svelte-i18n'
import {initStore} from './stores_init'

/**
 * To add a new language you must add the corresponding enum in "Language",
 * the name of the language it's language in "LanguageName" (i.e. "Русский")
 * and the JSON file with the translations as "/public/lang/<abbrv>.json".
 */

export enum Language {en = 'en', ru = 'ru', de = 'de'}
export const LanguageList = <Language[]>[
	Language.en, Language.ru, Language.de
]
export const LanguageName = {
	en: 'English', ru: 'Русский', de: 'Deutsch',
}
export const DefaultLanguage = Language.en

class Store_i18n implements Readable<string> {
	// LocalStorage ID
	#locStrID = 'gg-proxy-playground__lang'

	public readonly subscribe = derived(locale, ($)=> $ ?? '').subscribe

	private _writeLocalStore($: string): void {
		if ('localStorage' in window) {
			localStorage.setItem(this.#locStrID, $)
		}
	}
	private _scanLocalStore(): string|null {
		if ('localStorage' in window) {
			return localStorage.getItem(this.#locStrID)
		}
		return null
	}

	constructor() {
		for (const lang of LanguageList) {
			register(lang, async ()=> {
				return await (await fetch(`/lang/${lang}.json`)).json()
			})
		}
		init({
			fallbackLocale: DefaultLanguage,
			initialLocale: DefaultLanguage,
		})
		const locStore = this._scanLocalStore()
		if (locStore !== null) {
			locale.set(locStore)
		}
		isLoading.subscribe(($)=> {
			if ($) {initStore('i18n')}
		})
	}

	public switch(lang: Language): void {
		if (!LanguageList.includes(lang)) {
			throw new Error('invalid language to switch to')
		}
		locale.set(lang)
		this._writeLocalStore(lang)
	}
}

export const $ = new Store_i18n()
