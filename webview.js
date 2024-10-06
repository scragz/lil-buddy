(function () {
  const vscode = acquireVsCodeApi();

  const chatContainer = document.getElementById('chat-container');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const clearButton = document.getElementById('clear-button');

  sendButton.addEventListener('click', sendMessage);
  clearButton.addEventListener('click', clearChat);
  userInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function sendMessage() {
    const text = userInput.value.trim();
    if (text) {
      appendMessage('You', text);
      vscode.postMessage({ command: 'sendMessage', text: text });
      userInput.value = '';
    }
  }

  function clearChat() {
    vscode.postMessage({ command: 'clearChat' });
    chatContainer.innerHTML = '';
  }

  function appendMessage(sender, text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message ' + sender.toLowerCase();
    messageElement.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Handle messages sent from the extension
  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
      case 'displayResponse':
        appendMessage('Assistant', message.text);
        break;
      case 'restoreChat':
        restoreChatHistory(message.history);
        break;
      case 'clearChat':
        chatContainer.innerHTML = '';
        break;
    }
  });

  function restoreChatHistory(history) {
    chatContainer.innerHTML = ''; // Clear existing messages
    history.forEach(msg => {
      const sender = msg.role === 'user' ? 'You' : 'Assistant';
      appendMessage(sender, msg.content);
    });
  }
})();