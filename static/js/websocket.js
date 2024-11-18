let ws;

function connectWebSocket() {
    ws = new WebSocket(`ws://${window.location.host}/ws`);
    
    ws.onopen = () => {
        console.log('WebSocket接続が確立されました');
    };

    ws.onmessage = (event) => {
        handleWebSocketMessage(event);
    };

    ws.onclose = () => {
        console.log('WebSocket接続が切断されました');
        setTimeout(connectWebSocket, 1000);
    };
}

function handleWebSocketMessage(event) {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'update':
            updateTodoList(data.todos);
            updateStatistics();
            break;
        case 'error':
            console.error('エラー:', data.message);
            break;
        case 'status_change':
            handleStatusChange(data.todoId, data.newStatus);
            break;
    }
}

function handleStatusChange(todoId, newStatus) {
    const todoElement = document.querySelector(`[data-id="${todoId}"]`);
    if (todoElement) {
        const targetColumn = document.getElementById(`todo-${newStatus}`);
        if (targetColumn) {
            todoElement.querySelector('.status-badge').textContent = newStatus;
            targetColumn.appendChild(todoElement);
        }
    }
}

connectWebSocket();