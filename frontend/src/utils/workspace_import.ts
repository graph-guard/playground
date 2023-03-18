import type {GG_ImportQuery, GG_ImportTemplate, GG_ImportWorkspace, GG_Query, GG_Template, GG_Workspace, VersionedEntity} from '../stores/playground'
import {WS_VERSION, TEMPLATE_VERSION, QUERY_VERSION} from '../stores/playground'
import {randID} from './misc'

export function importQueryVersion(input: Partial<VersionedEntity> & {[key: string]: any}): GG_Query {
	if (
		input._version === undefined || input._version === null ||
		input._version < 0 || input._version > QUERY_VERSION
	) {
		console.error('no or invalid query version provided. this may import data incorrectly.')
		input._version = QUERY_VERSION
	}
	const id = randID()
	switch (input._version) {
	case 0: {
		const query = input as GG_ImportQuery
		return {
			_version: query._version ?? QUERY_VERSION,
			id,
			name: query.name ?? '',
			query: query.query ?? '',
			variables: query.variables ?? '',
			results: null,
		}
	}
	default:
		throw new Error('was unable to import query')
	}
}

export function importTemplateVersion(input: Partial<VersionedEntity> & {[key: string]: any}): GG_Template {
	if (
		input._version === undefined || input._version === null ||
		input._version < 0 || input._version > TEMPLATE_VERSION
	) {
		console.error('no or invalid template version provided. this may import data incorrectly.')
		input._version = TEMPLATE_VERSION
	}
	const id = randID()
	switch (input._version) {
	case 0: {
		const tpl = input as GG_ImportTemplate
		return {
			_version: tpl._version ?? TEMPLATE_VERSION,
			id,
			name: tpl.name ?? '',
			source: tpl.source ?? '',
		}
	}
	default:
		throw new Error('was unable to import template')
	}
}

export function importWorkspaceVersion(input: Partial<VersionedEntity> & {[key: string]: any}): GG_Workspace {
	if (
		input._version === undefined || input._version === null ||
		input._version < 0 || input._version > WS_VERSION
	) {
		console.error('no or invalid workspace version provided. this may import data incorrectly.')
		input._version = WS_VERSION
	}
	const id = randID()
	switch (input._version) {
	case 0: {
		const ws = input as GG_ImportWorkspace
		return {
			_version: ws._version ?? WS_VERSION,
			id,
			name: ws.name ?? '',
			schema: ws.schema ?? '',
			creation: Date.now(),
			templates: (input.templates || []).map(importTemplateVersion),
			queries: (input.queries || []).map(importQueryVersion),
		}
	}
	default:
		throw new Error(`was unable to import workspace by version "${input._version}"`)
	}
}
