import {App, Editor, FuzzySuggestModal, MarkdownView, Modal, Notice, Plugin, requestUrl, TFile, TFolder} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, StorySettingTab} from "./settings";

// Remember to rename these classes and interfaces!

export default class Author extends Plugin {
	settings: MyPluginSettings;
	aiStatus: HTMLElement;
	outlinePrompt: string;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('book-marked', 'Author', () => {});
		this.aiStatus = this.addStatusBarItem();
		this.aiStatus.setText('Ready');
		this.addSettingTab(new StorySettingTab(this.app, this));
		this.outlinePrompt = this.settings.outlinePrompt;	

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'run-architect',
			name: 'Run Architect',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.runArchitect(editor);
			}
		});

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	new Notice("Click");
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

	}

	onunload() {
	}

	async runArchitect(editor: Editor) {
		const selection = editor.getSelection();
		this.aiStatus.addClass('is-loading');
		if (selection.length > 0) {
			// Option 1: Just process the highlighted text
			await this.processNotes(selection);
		} else {
			// Option 2: Open the Folder Picker
			new FolderSuggestionModal(this.app, async (folder) => {
					const files = folder.children.filter(file => 
						file instanceof TFile && file.extension === 'md'
					) as TFile[];

					if (files.length === 0) {
						new Notice("No markdown files found in that folder.");
						this.aiStatus.setText('No markdown files found in that folder.');
						setTimeout(() => this.aiStatus.setText(''), 5000);
						return;
					}

					const contents = await Promise.all(files.map(file => this.app.vault.read(file)));
					const combinedFiles = contents.join("\n\n---\n\n");

					await this.processNotes(combinedFiles);
				}).open();
			};
	}

	async processNotes(text: string) {
		try {
			const result = await this.askModel(this.outlinePrompt.replace("{{brain_dump}}", text));
			const fileName = `Story Outline - ${new Date().toLocaleDateString()}.md`;
			await this.app.vault.create(fileName, result);
			this.aiStatus.setText('Outline created');
			this.aiStatus.removeClass('is-loading');
			setTimeout(() => this.aiStatus.setText('Ready'), 5000);
		}  catch (error) {
			new Notice('AI Error occurred. Check console for details.');
			this.aiStatus.setText('AI Error');
			this.aiStatus.removeClass('is-loading');
			setTimeout(() => this.aiStatus.setText('Ready'), 5000);
			console.error(error);
		}
	}

	async askModel(prompt: string) {
		this.aiStatus.setText('Asking...');
		const response = await requestUrl({
			url: "http://localhost:11434/api/generate",
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: this.settings.model,
				prompt: prompt,
				stream: false 
			})
		});
		this.aiStatus.setText('Thinking...');
		return response.json.response;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

export class FolderSuggestionModal extends FuzzySuggestModal<TFolder> {
	onChoose: (folder: TFolder) => void;

	constructor(app: App, onChoose: (folder: TFolder) => void) {
		super(app);
		this.onChoose = onChoose;
	}

	getItems(): TFolder[] {
		return this.app.vault.getAllLoadedFiles()
			.filter(file => file instanceof TFolder) as TFolder[];
	}

	getItemText(folder: TFolder): string {
		return folder.path;
	}

	onChooseItem(folder: TFolder, evt: MouseEvent | KeyboardEvent) {
		this.onChoose(folder);
	}
}
