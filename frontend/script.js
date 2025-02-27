const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");

async function sendMessage() {
    const query = userInput.value.trim();
    if (!query) return;

    // Display user message
    chatBox.innerHTML += `<div><strong>You:</strong> ${query}</div>`;

    // Fetch response from backend
    const response = await fetch(`http://localhost:5000/search?q=${query}`);
    const data = await response.json();

    // Display bot response
    if (data.message) {
        chatBox.innerHTML += `<div><strong>Bot:</strong> ${data.message}</div>`;
    } else {
        data.forEach(entry => {
            chatBox.innerHTML += `<div><strong>${entry.platform}:</strong> ${entry.matched.join("<br>")}</div>`;
        });
    }

    // Clear input field
    userInput.value = "";
}
