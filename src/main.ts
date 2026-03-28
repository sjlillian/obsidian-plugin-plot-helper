import {Editor, MarkdownView, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, PluginSettings, StorySettingTab} from "./settings";
import {runArchitect} from "./architect";

// Remember to rename these classes and interfaces!

export default class Author extends Plugin {
	settings: PluginSettings;
	aiStatus: HTMLElement;
	outlinePrompt: string;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('book-marked', 'Author', () => {});
		this.aiStatus = this.addStatusBarItem();
		this.aiStatus.setText('Ready');
		this.addSettingTab(new StorySettingTab(this.app, this));
		this.outlinePrompt = this.settings.outlinePrompt;	

		this.addCommand({
			id: 'run-architect',
			name: 'Run Architect',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await this.runArchitect(editor);
			}
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async runArchitect(editor: Editor) {
		runArchitect(editor);
	}
}
