import {App, PluginSettingTab, Notice, Setting} from "obsidian";
import Author from "./main";
//@ts-ignore
import defaultPromptText from 'inline:./prompts/outline-prompt.md';

export interface MyPluginSettings {
	outlinePrompt: string;
	model: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	outlinePrompt: defaultPromptText,
	model: 'llama3'
}


export class StorySettingTab extends PluginSettingTab {
	plugin: Author;

	constructor(app: App, plugin: Author) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Model')
			.setDesc('Which model to use (e.g., mistral, llama3)')
			.addText(text => text
				.setValue(this.plugin.settings.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Outline Prompt')
			.setDesc('The instructions for the AI. Use {{brain_dump}} as a placeholder.')
			.addTextArea(text => text
				.setPlaceholder('Enter your prompt here...')
				.setValue(this.plugin.settings.outlinePrompt)
				.onChange(async (value) => {
					this.plugin.settings.outlinePrompt = value;
					await this.plugin.saveSettings();
				})
				.inputEl.rows = 10); // Makes the box bigger

		new Setting(containerEl)
			.setName('Reset to Default')
			.setDesc('Revert settings to the original file version.')
			.addButton(cb => cb
				.setButtonText('Reset')
				.onClick(async () => {
					this.plugin.settings.outlinePrompt = defaultPromptText;
					this.plugin.settings.model = DEFAULT_SETTINGS.model;
					await this.plugin.saveSettings();
					this.display(); // Refresh the UI to show the reset text
					new Notice("Prompt reset to default!");
				}));
	}
}
