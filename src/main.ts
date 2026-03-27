import {App, Editor, FuzzySuggestModal, MarkdownView, Modal, Notice, Plugin, requestUrl, TFile, TFolder} from 'obsidian';
import {DEFAULT_SETTINGS, MyPluginSettings, StorySettingTab} from "./settings";

// Remember to rename these classes and interfaces!

export default class Author extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('book-marked', 'Author', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});

		/* This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status bar text');
		*/

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'run-architect',
			name: 'Run Architect',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.runArchitect(editor);
			}
		});
		
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new StorySettingTab(this.app, this));

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
						return;
					}

					const contents = await Promise.all(files.map(file => this.app.vault.read(file)));
					const combinedFiles = contents.join("\n\n---\n\n");

					await this.processNotes(combinedFiles);
				}).open();
			};

		new Notice("Outline started");

		const prompt = 'Say hello and who you are';
		try {
			
			const result = await this.askModel(prompt);

			await this.app.vault.create(`Story Outline ${Date.now()}.md`, result);
			new Notice(`Outline created`);

		} catch (error) {
			new Notice('This is an error.')
			console.error(error);
		}
	}

	async processNotes(text: string) {
		new Notice("Architect is building your story...");
		try {
			const result = await this.askModel(this.settings.outlinePrompt.replace("{{brain_dump}}", text));
			const fileName = `Story Outline - ${Date.now()}.md`;
			await this.app.vault.create(fileName, result);
			new Notice("Outline created!");
		} catch (e) {
			new Notice("AI Error!");
		}
	}

	async askModel(prompt: string) {
		const response = await requestUrl({
			url: "http://localhost:11434/api/generate",
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: this.settings.model, // Make sure this matches your downloaded model
				prompt: prompt,
				stream: false 
			})
		});

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
