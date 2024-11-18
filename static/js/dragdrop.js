let draggedItem = null;
let draggedStatus = null;

function initDragAndDrop() {
    const todoItems = document.querySelectorAll('.todo-item');
    const statusColumns = document.querySelectorAll('.status-column');

    todoItems.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
    });

    statusColumns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragStart(e) {
    draggedItem = e.target;
    draggedStatus = e.target.querySelector('.status-badge').textContent;
    e.target.classList.add('dragging');
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

async function handleDrop(e) {
    e.preventDefault();
    const column = e.target.closest('.status-column');
    if (!column) return;
    
    column.classList.remove('dragover');
    const newStatus = column.dataset.status;
    const todoItems = column.querySelector('.todo-items');
    
    if (draggedItem && newStatus && draggedStatus !== newStatus) {
        try {
            const response = await fetch(`/api/v1/todos/${draggedItem.dataset.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) throw new Error('ステータス更新に失敗しました');

            todoItems.appendChild(draggedItem);
            draggedItem.querySelector('.status-badge').textContent = newStatus;
            draggedStatus = newStatus;

            ws.send(JSON.stringify({
                type: 'status_change',
                todoId: draggedItem.dataset.id,
                newStatus: newStatus
            }));

            updateStatistics();
        } catch (error) {
            console.error('Error:', error);
            alert('ステータスの更新に失敗しました');
        }
    }
}

function handleDragEnter(e) {
    e.preventDefault();
    const column = e.target.closest('.status-column');
    if (column) {
        column.classList.add('dragover');
    }
}

function handleDragLeave(e) {
    e.preventDefault();
    const column = e.target.closest('.status-column');
    if (column) {
        column.classList.remove('dragover');
    }
}