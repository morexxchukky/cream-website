import { css, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import type { SearchQuery } from '../../../../../git/search';
import type { Deferrable } from '../../../../../system/function';
import { debounce } from '../../../../../system/function';
import { GlElement } from '../element';
import type { PopMenu } from '../overlays/pop-menu';
import '../code-icon';
import '../overlays/tooltip';

export type SearchOperators =
	| '=:'
	| 'message:'
	| '@:'
	| 'author:'
	| '#:'
	| 'commit:'
	| '?:'
	| 'file:'
	| '~:'
	| 'change:';

export type HelpTypes = 'message:' | 'author:' | 'commit:' | 'file:' | 'change:';

const operatorsHelpMap = new Map<SearchOperators, HelpTypes>([
	['=:', 'message:'],
	['message:', 'message:'],
	['@:', 'author:'],
	['author:', 'author:'],
	['#:', 'commit:'],
	['commit:', 'commit:'],
	['?:', 'file:'],
	['file:', 'file:'],
	['~:', 'change:'],
	['change:', 'change:'],
]);

export interface SearchNavigationEventDetail {
	direction: 'first' | 'previous' | 'next' | 'last';
}

declare global {
	interface HTMLElementTagNameMap {
		'gl-search-input': GlSearchInput;
	}

	interface GlobalEventHandlersEventMap {
		'gl-search-inputchange': CustomEvent<SearchQuery>;
		'gl-search-navigate': CustomEvent<SearchNavigationEventDetail>;
	}
}

@customElement('gl-search-input')
export class GlSearchInput extends GlElement {
	static override styles = css`
		* {
			box-sizing: border-box;
		}

		:host {
			display: inline-flex;
			flex-direction: row;
			align-items: center;
			gap: 0.4rem;
			position: relative;

			flex: auto 1 1;
		}

		label {
			display: flex;
			justify-content: center;
			align-items: center;
			gap: 0.2rem;
			width: 3.2rem;
			height: 2.4rem;
			color: var(--vscode-input-foreground);
			cursor: pointer;
			border-radius: 3px;
		}
		label:hover {
			background-color: var(--vscode-toolbar-hoverBackground);
		}
		label:focus {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: -1px;
		}

		.icon-small {
			font-size: 1rem;
		}

		.field {
			position: relative;
			flex: auto 1 1;
		}

		input {
			width: 100%;
			height: 2.4rem;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			border-radius: 0.25rem;
			padding: 0 6.6rem 1px 0.4rem;
			font-family: inherit;
			font-size: inherit;
		}
		input:focus {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: -1px;
		}
		input::placeholder {
			color: var(--vscode-input-placeholderForeground);
		}

		input::-webkit-search-cancel-button {
			display: none;
		}

		input[aria-describedby='help-text'] {
			border-color: var(--vscode-inputValidation-infoBorder);
		}
		input[aria-describedby='help-text']:focus {
			outline-color: var(--vscode-inputValidation-infoBorder);
			border-bottom-left-radius: 0;
			border-bottom-right-radius: 0;
		}

		input[aria-valid='false'] {
			border-color: var(--vscode-inputValidation-errorBorder);
		}
		input[aria-valid='false']:focus {
			outline-color: var(--vscode-inputValidation-errorBorder);
		}

		.message {
			position: absolute;
			top: 100%;
			left: 0;
			width: 100%;
			padding: 0.4rem;
			transform: translateY(-0.1rem);
			z-index: 1000;
			background-color: var(--vscode-inputValidation-infoBackground);
			border: 1px solid var(--vscode-inputValidation-infoBorder);
			color: var(--vscode-input-foreground);
			font-size: 1.2rem;
			line-height: 1.4;
		}

		input[aria-valid='false'] + .message {
			background-color: var(--vscode-inputValidation-errorBackground);
			border-color: var(--vscode-inputValidation-errorBorder);
		}

		input:not([aria-describedby='help-text']:focus) + .message {
			display: none;
		}

		.controls {
			position: absolute;
			top: 0.2rem;
			right: 0.2rem;
			display: inline-flex;
			flex-direction: row;
			align-items: center;
			gap: 0.1rem;
		}

		button {
			padding: 0;
			color: var(--vscode-input-foreground);
			border: 1px solid transparent;
			background: none;
		}
		button:focus:not([disabled]) {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: -1px;
		}
		button:not([disabled]) {
			cursor: pointer;
		}

		.control {
			display: inline-flex;
			justify-content: center;
			align-items: center;
			width: 2rem;
			height: 2rem;
			text-align: center;
			border-radius: 0.25rem;
		}
		.control:hover:not([disabled]):not([aria-checked='true']) {
			background-color: var(--vscode-inputOption-hoverBackground);
		}
		.control[disabled] {
			opacity: 0.5;
		}
		.control[disabled][aria-checked='true'] {
			opacity: 0.8;
		}
		.control[aria-checked='true'] {
			background-color: var(--vscode-inputOption-activeBackground);
			color: var(--vscode-inputOption-activeForeground);
			border-color: var(--vscode-inputOption-activeBorder);
		}

		.control.is-hidden {
			display: none;
		}

		.action-button {
			position: relative;
			appearance: none;
			font-family: inherit;
			font-size: 1.2rem;
			line-height: 2.2rem;
			// background-color: var(--color-graph-actionbar-background);
			background-color: transparent;
			border: none;
			color: inherit;
			color: var(--color-foreground);
			padding: 0 0.75rem;
			cursor: pointer;
			border-radius: 3px;
			height: auto;

			display: grid;
			grid-auto-flow: column;
			grid-gap: 0.5rem;
			gap: 0.5rem;
			max-width: fit-content;
		}

		.action-button[disabled] {
			pointer-events: none;
			cursor: default;
			opacity: 1;
		}

		.action-button:hover {
			background-color: var(--color-graph-actionbar-selectedBackground);
			color: var(--color-foreground);
			text-decoration: none;
		}

		.action-button[aria-checked] {
			border: 1px solid transparent;
		}

		.action-button[aria-checked='true'] {
			background-color: var(--vscode-inputOption-activeBackground);
			color: var(--vscode-inputOption-activeForeground);
			border-color: var(--vscode-inputOption-activeBorder);
		}

		.action-button code-icon,
		.action-button .codicon[class*='codicon-'],
		.action-button .glicon[class*='glicon-'] {
			line-height: 2.2rem;
			vertical-align: bottom;
		}

		.action-button__more,
		.action-button__more.codicon[class*='codicon-'] {
			font-size: 1rem;
			margin-right: -0.25rem;
		}

		.action-button__more::before {
			margin-left: -0.25rem;
		}

		menu-item {
			padding: 0 0.5rem;
		}

		menu-list {
			padding-bottom: 0.5rem;
		}

		.menu-button {
			display: block;
			width: 100%;
			padding: 0.1rem 0.6rem 0 0.6rem;
			line-height: 2.2rem;
			text-align: left;
			color: var(--vscode-menu-foreground);
			border-radius: 3px;
		}

		.menu-button:hover {
			color: var(--vscode-menu-selectionForeground);
			background-color: var(--vscode-menu-selectionBackground);
		}
	`;

	@query('input') input!: HTMLInputElement;
	@query('pop-menu') popmenu!: PopMenu;

	@state() errorMessage = '';
	@state() helpType?: HelpTypes;

	@property({ type: String }) label = 'Search';
	@property({ type: String }) placeholder = 'Search...';
	@property({ type: String }) value = '';
	@property({ type: Boolean }) matchAll = false;
	@property({ type: Boolean }) matchCase = false;
	@property({ type: Boolean }) matchRegex = true;

	get matchCaseOverride() {
		return this.matchRegex ? this.matchCase : true;
	}

	override focus(options?: FocusOptions): void {
		this.input.focus(options);
	}

	handleFocus(_e: Event) {
		this.popmenu.close();
	}

	handleClear(_e: Event) {
		this.focus();
		this.value = '';
		this.debouncedOnSearchChanged();
	}

	private _updateHelpTextDebounced: Deferrable<GlSearchInput['updateHelpText']> | undefined;
	updateHelpText() {
		if (this._updateHelpTextDebounced == null) {
			this._updateHelpTextDebounced = debounce(this.updateHelpTextCore.bind(this), 200);
		}

		this._updateHelpTextDebounced();
	}

	updateHelpTextCore() {
		const cursor = this.input?.selectionStart;
		const value = this.value;
		if (cursor != null && value.length !== 0 && value.includes(':')) {
			const regex =
				/(?:^|[\b\s]*)((=:|message:|@:|author:|#:|commit:|\?:|file:|~:|change:)(?:"[^"]*"?|\w*))(?:$|[\b\s])/gi;

			let match;
			do {
				match = regex.exec(value);
				if (match == null) break;

				const [, part, op] = match;

				// console.log('updateHelpText', cursor, match.index, match.index + part.trim().length, match);
				if (cursor > match.index && cursor <= match.index + part.trim().length) {
					this.helpType = operatorsHelpMap.get(op as SearchOperators);
					return;
				}
			} while (true);
		}
		this.helpType = undefined;
	}

	handleInputClick(_e: MouseEvent) {
		this.updateHelpText();
	}

	handleInput(e: InputEvent) {
		const value = (e.target as HTMLInputElement)?.value;
		this.value = value;
		this.updateHelpText();
		this.debouncedOnSearchChanged();
	}

	handleMatchAll(_e: Event) {
		this.matchAll = !this.matchAll;
		this.debouncedOnSearchChanged();
	}

	handleMatchCase(_e: Event) {
		this.matchCase = !this.matchCase;
		this.debouncedOnSearchChanged();
	}

	handleMatchRegex(_e: Event) {
		this.matchRegex = !this.matchRegex;
		this.debouncedOnSearchChanged();
	}

	handleKeyup(_e: KeyboardEvent) {
		this.updateHelpText();
	}

	handleShortcutKeys(e: KeyboardEvent) {
		if (!['Enter', 'ArrowUp', 'ArrowDown'].includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) return true;

		e.preventDefault();
		if (e.key === 'Enter') {
			this.emit('gl-search-navigate', { direction: e.shiftKey ? 'previous' : 'next' });
		} else if (this.searchHistory.length !== 0) {
			const direction = e.key === 'ArrowDown' ? 1 : -1;
			const nextPos = this.searchHistoryPos + direction;
			if (nextPos > -1 && nextPos < this.searchHistory.length) {
				this.searchHistoryPos = nextPos;
				const value = this.searchHistory[nextPos];
				if (value !== this.value) {
					this.value = value;
					this.updateHelpText();
					this.debouncedOnSearchChanged();
				}
			}
		}

		return false;
	}

	handleInsertToken(token: string) {
		this.value += `${this.value.length > 0 ? ' ' : ''}${token}`;
		window.requestAnimationFrame(() => {
			this.updateHelpText();
			// `@me` can be searched right away since it doesn't need additional text
			if (token === '@me') {
				this.debouncedOnSearchChanged();
			}
			this.input.focus();
		});
	}

	private onSearchChanged() {
		const search: SearchQuery = {
			query: this.value,
			matchAll: this.matchAll,
			matchCase: this.matchCase,
			matchRegex: this.matchRegex,
		};
		this.emit('gl-search-inputchange', search);
	}
	private debouncedOnSearchChanged = debounce(this.onSearchChanged.bind(this), 250);

	setCustomValidity(errorMessage: string = '') {
		this.errorMessage = errorMessage;
	}

	searchHistory: string[] = [];
	searchHistoryPos = 0;
	logSearch(query: SearchQuery) {
		const lastIndex = this.searchHistory.length - 1;

		// prevent duplicate entries
		if (this.searchHistoryPos < lastIndex || this.searchHistory[lastIndex] === query.query) {
			return;
		}

		this.searchHistory.push(query.query);
		this.searchHistoryPos = this.searchHistory.length - 1;
	}

	override render() {
		return html`<gl-tooltip placement="top" style="margin-left: -0.25rem;"
				><pop-menu>
					<button type="button" class="action-button" slot="trigger" aria-label="${this.label}">
						<code-icon icon="search" aria-hidden="true"></code-icon>
						<code-icon class="action-button__more" icon="chevron-down" aria-hidden="true"></code-icon>
					</button>
					<menu-list slot="content">
						<menu-label>Search by</menu-label>
						<menu-item role="none">
							<button class="menu-button" type="button" @click="${() => this.handleInsertToken('@me')}">
								My changes <small>@me</small>
							</button>
						</menu-item>
						<menu-item role="none">
							<button
								class="menu-button"
								type="button"
								@click="${() => this.handleInsertToken('message:')}"
							>
								Message <small>message: or =:</small>
							</button>
						</menu-item>
						<menu-item role="none">
							<button
								class="menu-button"
								type="button"
								@click="${() => this.handleInsertToken('author:')}"
							>
								Author <small>author: or @:</small>
							</button>
						</menu-item>
						<menu-item role="none">
							<button
								class="menu-button"
								type="button"
								@click="${() => this.handleInsertToken('commit:')}"
							>
								Commit SHA <small>commit: or #:</small>
							</button>
						</menu-item>
						<menu-item role="none">
							<button class="menu-button" type="button" @click="${() => this.handleInsertToken('file:')}">
								File <small>file: or ?:</small>
							</button>
						</menu-item>
						<menu-item role="none">
							<button
								class="menu-button"
								type="button"
								@click="${() => this.handleInsertToken('change:')}"
							>
								Change <small>change: or ~:</small>
							</button>
						</menu-item>
					</menu-list>
				</pop-menu>
				<span slot="content">${this.label}</span>
			</gl-tooltip>
			<div class="field">
				<input
					id="search"
					part="search"
					type="text"
					spellcheck="false"
					placeholder="${this.placeholder}"
					.value="${this.value}"
					aria-valid="${!this.errorMessage}"
					aria-describedby="${this.errorMessage !== '' || this.helpType != null ? 'help-text' : ''}"
					@input="${this.handleInput}"
					@keydown="${this.handleShortcutKeys}"
					@keyup="${this.handleKeyup}"
					@click="${this.handleInputClick}"
					@focus="${this.handleFocus}"
				/>
				<div class="message" id="help-text" aria-live="polite">
					${this.errorMessage !== '' ? html`${this.errorMessage}${this.helpType ? html`<br />` : ''}` : ''}
					${this.helpType === 'message:'
						? html`<span
								>Message: use quotes to search for phrases, e.g. message:"Updates dependencies"</span
						  >`
						: ''}
					${this.helpType === 'author:'
						? html`<span>Author: use a user's account, e.g. author:eamodio</span>`
						: ''}
					${this.helpType === 'commit:'
						? html`<span>Commit: use a full or short Commit SHA, e.g. commit:4ce3a</span>`
						: ''}
					${this.helpType === 'file:'
						? html`<span
								>File: use a filename with extension, e.g. file:package.json, or a glob pattern, e.g.
								file:*graph*</span
						  >`
						: ''}
					${this.helpType === 'change:'
						? html`<span>Change: use a regex pattern, e.g. change:update&#92;(param</span>`
						: ''}
				</div>
			</div>
			<div class="controls">
				<gl-tooltip placement="bottom">
					<button
						class="control${this.value ? '' : ' is-hidden'}"
						type="button"
						role="button"
						aria-label="Clear"
						@click="${this.handleClear}"
						@focus="${this.handleFocus}"
					>
						<code-icon icon="close"></code-icon>
					</button>
					<span slot="content">Clear</span>
				</gl-tooltip>
				<gl-tooltip placement="bottom">
					<button
						class="control"
						type="button"
						role="checkbox"
						aria-label="Match All"
						aria-checked="${this.matchAll}"
						@click="${this.handleMatchAll}"
						@focus="${this.handleFocus}"
					>
						<code-icon icon="whole-word"></code-icon>
					</button>
					<span slot="content">Match All</span>
				</gl-tooltip>
				<gl-tooltip placement="bottom">
					<button
						class="control"
						type="button"
						role="checkbox"
						aria-label="Match Case${this.matchCaseOverride && !this.matchCase
							? ' (always on without regular expressions)'
							: ''}"
						?disabled="${!this.matchRegex}"
						aria-checked="${this.matchCaseOverride}"
						@click="${this.handleMatchCase}"
						@focus="${this.handleFocus}"
					>
						<code-icon icon="case-sensitive"></code-icon>
					</button>
					<span slot="content"
						>Match
						Case${this.matchCaseOverride && !this.matchCase
							? ' (always on without regular expressions)'
							: ''}</span
					>
				</gl-tooltip>
				<gl-tooltip placement="bottom">
					<button
						class="control"
						type="button"
						role="checkbox"
						aria-label="Use Regular Expression"
						aria-checked="${this.matchRegex}"
						@click="${this.handleMatchRegex}"
						@focus="${this.handleFocus}"
					>
						<code-icon icon="regex"></code-icon>
					</button>
					<span slot="content">Use Regular Expression</span>
				</gl-tooltip>
			</div>`;
	}
}
