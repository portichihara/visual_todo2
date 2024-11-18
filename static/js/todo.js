let currentFilter = {
    status: '',
    priority: '',
    search: ''
};

async function loadTodos() {
    try {
        let url = '/api/v1/todos';
        const params = new URLSearchParams();
        
        if (currentFilter.status) params.append('status', currentFilter.status);
        if (currentFilter.priority) params.append('priority', currentFilter.priority);
        if (currentFilter.search) params.append('search', currentFilter.search);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load todos');
        
        const todos = await response.json();
        updateTodoList(todos);
        updateStatistics();
    } catch (error) {
        console.error('Error loading todos:', error);
    }
}

function showAddTodoForm() {
    document.getElementById('add-todo').style.display = 'block';
}

function closeModal() {
    document.getElementById('add-todo').style.display = 'none';
}

function updateTodoList(todos) {
    const statusColumns = {
        '未着手': document.getElementById('todo-未着手'),
        '進行中': document.getElementById('todo-進行中'),
        '完了': document.getElementById('todo-完了')
    };

    Object.values(statusColumns).forEach(column => column.innerHTML = '');

    todos.forEach(todo => {
        const todoElement = createTodoElement(todo);
        const column = statusColumns[todo.status];
        if (column) {
            column.appendChild(todoElement);
        }
    });

    initDragAndDrop();
}

function createTodoElement(todo) {
    const div = document.createElement('div');
    div.className = `todo-item priority-${getPriorityClass(todo.priority)}`;
    div.draggable = true;
    div.setAttribute('data-id', todo.ID);

    const dueDate = todo.due_date ? new Date(todo.due_date) : null;
    const isOverdue = dueDate && dueDate < new Date();

    let actionButtons = '';
    if (todo.status === '完了') {
        actionButtons = `
            <button onclick="updateStatus('${todo.ID}', '未着手')">戻す</button>
            <button onclick="deleteTodo('${todo.ID}')">削除</button>
        `;
    } else {
        actionButtons = `
            <button onclick="updateStatus('${todo.ID}', '進行中')">進行中</button>
            <button onclick="updateStatus('${todo.ID}', '完了')">完了</button>
            <button onclick="deleteTodo('${todo.ID}')">削除</button>
        `;
    }

    div.innerHTML = `
        <div class="todo-header">
            <span class="status-badge status-${todo.status}">${todo.status}</span>
            <span class="due-date ${isOverdue ? 'overdue' : ''}">
                ${dueDate ? dueDate.toLocaleString() : '期限なし'}
            </span>
        </div>
        <h3>${todo.title}</h3>
        <p>${todo.description || ''}</p>
        <div class="todo-tags">
            ${(todo.tags || []).map(tag => 
                `<span class="tag" style="background-color: ${tag.color}">${tag.name}</span>`
            ).join('')}
        </div>
        <div class="todo-actions">
            ${actionButtons}
        </div>
    `;

    return div;
}

function getPriorityClass(priority) {
    switch (parseInt(priority)) {
        case 3: return 'high';
        case 2: return 'medium';
        case 1: return 'low';
        default: return 'low';
    }
}

document.getElementById('todo-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const dueDate = document.getElementById('due-date').value;
    const formattedDueDate = dueDate ? new Date(dueDate).toISOString() : null;

    const todo = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        priority: parseInt(document.getElementById('priority').value),
        due_date: formattedDueDate,
        status: "未着手",
        tags: document.getElementById('tags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag)
            .map(tagName => ({
                name: tagName,
                color: getRandomColor()
            }))
    };

    try {
        const response = await fetch('/api/v1/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(todo)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'タスクの作成に失敗しました');
        }

        closeModal();
        loadTodos();
        document.getElementById('todo-form').reset();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
});

function getRandomColor() {
    const colors = ['#FFB6C1', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// フィルター機能の実装
document.getElementById('search').addEventListener('input', debounce(function(e) {
    currentFilter.search = e.target.value;
    loadTodos();
}, 300));

document.getElementById('status-filter').addEventListener('change', function(e) {
    currentFilter.status = e.target.value;
    loadTodos();
});

document.getElementById('priority-filter').addEventListener('change', function(e) {
    currentFilter.priority = e.target.value;
    loadTodos();
});

// ヘルパー関数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 初期ロード
loadTodos();

async function updateStatistics() {
    try {
        const response = await fetch('/api/v1/todos/statistics');
        const stats = await response.json();
        
        document.getElementById('total-count').textContent = stats.total;
        document.getElementById('completed-count').textContent = stats.completed;
        document.getElementById('high-priority').textContent = stats.highPriority;
        document.getElementById('medium-priority').textContent = stats.mediumPriority;
        document.getElementById('low-priority').textContent = stats.lowPriority;
        
        const progressPercent = (stats.completed / stats.total) * 100;
        document.getElementById('progress-bar').style.width = `${progressPercent}%`;
    } catch (error) {
        console.error('統計情報の取得に失敗:', error);
    }
}

function showStatistics() {
    const statsModal = document.getElementById('statistics-modal');
    console.log('統計モーダル要素:', statsModal);
    if (statsModal) {
        statsModal.style.display = 'block';
        updateStatistics();
    } else {
        console.error('統計モーダルが見つかりません');
    }
}

function closeStatisticsModal() {
    const statsModal = document.getElementById('statistics-modal');
    if (statsModal) {
        statsModal.style.display = 'none';
    }
}

async function updateStatus(todoId, newStatus) {
    try {
        const response = await fetch(`/api/v1/todos/${todoId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('ステータスの更新に失敗しました');
        loadTodos();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

async function deleteTodo(todoId) {
    if (!confirm('本当に削除しますか？')) return;
    
    try {
        const response = await fetch(`/api/v1/todos/${todoId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('タスクの削除に失敗しました');
        loadTodos();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}