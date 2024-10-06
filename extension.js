const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function activate(context) {
  const provider = new LilBuddyViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(LilBuddyViewProvider.viewType, provider)
  );
}

class LilBuddyViewProvider {
  static viewType = 'lilBuddySidebar';

  constructor(extensionUri) {
    this._extensionUri = extensionUri;
  }

  resolveWebviewView(webviewView, context, _token) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(this._handleMessage.bind(this));
  }

  _getHtmlForWebview(webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));

    const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.html');
    let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

    // Replace placeholders in the HTML with actual URIs
    htmlContent = htmlContent.replace('${styleUri}', styleUri.toString());
    htmlContent = htmlContent.replace('${scriptUri}', scriptUri.toString());

    return htmlContent;
  }

  async _handleMessage(message) {
    switch (message.command) {
      case 'sendMessage':
        const response = await this._sendToChatGPT(message.text);
        this._view.webview.postMessage({ command: 'displayResponse', text: response });
        break;
      case 'clearChat':
        // Handle clear chat if needed
        break;
    }
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
      vscode.window.showErrorMessage(`Error: ${error}`);
      return 'An error occurred while communicating with OpenAI API.';
    }
  }

  async _callOpenAIAPI(apiKey, model, userMessage) {
    const axios = require('axios');

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

function deactivate() {}

module.exports = {
  activate,
  deactivate
};