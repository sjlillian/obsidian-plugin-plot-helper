import { App, FuzzySuggestModal, Editor, Notice, TFile, TFolder, requestUrl } from 'obsidian';
import Author from './main';

export async function runArchitect(editor: Editor) {
	Author.arguments.aiStatus.setText('Waiting for user input...');
	const selection = editor.getSelection();
	if (selection.length > 0) {
		// Option 1: Just process the highlighted text
		await processNotes(Author.arguments.outlinePrompt.replace("{{brain_dump}}", selection));
	} else {
		// Option 2: Open the Folder Picker
		new FolderSuggestionModal(Author.arguments.app, async (folder) => {
				const files = folder.children.filter(file => 
					file instanceof TFile && file.extension === 'md'
				) as TFile[];

				if (files.length === 0) {
					new Notice("No markdown files found in that folder.");
					return;
				}

				const contents = await Promise.all(files.map(file => Author.arguments.app.vault.read(file)));
				const combinedFiles = contents.join("\n\n---\n\n");

				await processNotes(combinedFiles);
			}).open();
		};
}

async function processNotes(text: string) {
	Author.arguments.aiStatus.setClass('is-loading');
	Author.arguments.aiStatus.setText('Thinking...');
	try {
		const result = await askModel(text);
		const fileName = `Story Outline - ${new Date().toLocaleDateString()}.md`;
		await Author.arguments.app.vault.create(fileName, result);
		Author.arguments.aiStatus.setText('Done!');
		Author.arguments.aiStatus.removeClass('is-loading');
	}  catch (error) {
		new Notice('AI Error occurred. Check console for details.');
		Author.arguments.aiStatus.setText('Error occurred.');
		Author.arguments.aiStatus.removeClass('is-loading');
		console.error(error);
	}
}

async function askModel(prompt: string) {
	const response = await requestUrl({
		url: "http://localhost:11434/api/generate",
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: Author.arguments.settings.model,
			prompt: prompt,
			stream: false 
		})
	});
	return response.json.response;
}

class FolderSuggestionModal extends FuzzySuggestModal<TFolder> {
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