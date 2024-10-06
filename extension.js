const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

function activate(context) {
	console.log('Activating Lil Buddy extension');
	const provider = new LilBuddyViewProvider(context.extensionUri, context.globalState);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(LilBuddyViewProvider.viewType, provider)
	);
}

class LilBuddyViewProvider {
	static viewType = 'lilBuddySidebar';

	constructor(extensionUri, globalState) {
		this._extensionUri = extensionUri;
		this._globalState = globalState;
		this._view = null;
	}

	resolveWebviewView(webviewView, context, _token) {
		console.log('Resolving Webview View');
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(this._handleMessage.bind(this));

		// Restore chat history
		this._restoreChatHistory();

		// Set up a listener for when the webview becomes visible
		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				console.log('Webview became visible, restoring chat history');
				this._restoreChatHistory();
			}
		});
	}

	_restoreChatHistory() {
		const chatHistory = this._globalState.get('chatHistory', []);
		console.log('Retrieved chat history:', chatHistory);
		if (chatHistory.length > 0) {
			this._view.webview.postMessage({ command: 'restoreChat', history: chatHistory });
		}
	}

	_getHtmlForWebview(webview) {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview.js'));
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));

		const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.html');
		let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

		htmlContent = htmlContent.replace('${styleUri}', styleUri.toString());
		htmlContent = htmlContent.replace('${scriptUri}', scriptUri.toString());

		return htmlContent;
	}

	async _handleMessage(message) {
		console.log('Received message:', message);
		switch (message.command) {
			case 'sendMessage':
				await this._updateChatHistory('user', message.text);
				const response = await this._sendToChatGPT(message.text);
				this._view.webview.postMessage({ command: 'displayResponse', text: response });
				await this._updateChatHistory('assistant', response);
				break;
			case 'clearChat':
				await this._clearChatHistory();
				this._view.webview.postMessage({ command: 'clearChat' });
				break;
		}
	}

	async _updateChatHistory(role, content) {
		const chatHistory = this._globalState.get('chatHistory', []);
		chatHistory.push({ role, content });
		await this._globalState.update('chatHistory', chatHistory);
		console.log('Updated chat history:', chatHistory);
	}

	async _clearChatHistory() {
		console.log('Clearing chat history');
		await this._globalState.update('chatHistory', []);
		console.log('Chat history cleared');
	}

	async _sendToChatGPT(userMessage) {
		const apiKey = vscode.workspace.getConfiguration('lil-buddy').get('apiKey');
		const model = vscode.workspace.getConfiguration('lil-buddy').get('model') || 'gpt-4';

		if (!apiKey) {
			vscode.window.showErrorMessage('Please set your OpenAI API key in the settings.');
			return 'Error: API key not set';
		}

		try {
			const response = await this._callOpenAIAPI(apiKey, model, userMessage);
			return response;
		} catch (error) {
			console.error('Error calling OpenAI API:', error);
			vscode.window.showErrorMessage(`Error: ${error.message}`);
			return 'An error occurred while communicating with OpenAI API.';
		}
	}

	async _callOpenAIAPI(apiKey, model, userMessage) {
		const data = {
			model: model,
			messages: [{ role: 'user', content: userMessage }]
		};

		const response = await axios.post('https://api.openai.com/v1/chat/completions', data, {
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`
			}
		});

		if (response.data && response.data.choices && response.data.choices.length > 0) {
			return response.data.choices[0].message.content.trim();
		} else {
			throw new Error('Invalid response from OpenAI API');
		}
	}
}

function deactivate() {
	console.log('Deactivating Lil Buddy extension');
}

module.exports = {
	activate,
	deactivate
};