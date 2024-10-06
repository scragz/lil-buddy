(function () {
  const vscode = acquireVsCodeApi();

  const sendButton = document.getElementById('send-button');
  const clearButton = document.getElementById('clear-button');
  const userInput = document.getElementById('user-input');
  const chatContainer = document.getElementById('chat-container');

  sendButton.addEventListener('click', sendMessage);
  userInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  clearButton.addEventListener('click', () => {
    vscode.postMessage({ command: 'clearChat' });
    chatContainer.innerHTML = '';
  });

  function sendMessage() {
    const text = userInput.value.trim();
    if (text) {
      appendMessage('You', text);
      vscode.postMessage({ command: 'sendMessage', text: text });
      userInput.value = '';
    }
  }

  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
      case 'displayResponse':
        appendMessage('Assistant', message.text);
        break;
    }
  });

  function appendMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message ' + sender.toLowerCase();
    messageElement.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
})();
