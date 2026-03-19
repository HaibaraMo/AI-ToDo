// 全局变量
let todos = [];
let timeRecords = [];
let currentPriority = 'medium';
let currentFilter = 'all'; // 新增：当前筛选状态
let timers = {};

// DOM元素
const todoInput = document.getElementById('todo-input');
const addTodoBtn = document.getElementById('add-todo');
const priorityBtns = document.querySelectorAll('.priority-btn');
const todoList = document.getElementById('todo-list');
const todoAll = document.getElementById('todo-all');
const todoPending = document.getElementById('todo-pending');
const todoCompleted = document.getElementById('todo-completed');
const clearCompletedBtn = document.getElementById('clear-completed');
const statAll = document.querySelector('.stat.all');
const statPending = document.querySelector('.stat.pending');
const statCompleted = document.querySelector('.stat.completed');

const timeInput = document.getElementById('time-input');
const addTimeBtn = document.getElementById('add-time');
const timeList = document.getElementById('time-list');

// 初始化
function init() {
    console.log('Init function called');
    // 从LocalStorage加载数据
    loadData();
    
    // 添加测试数据以便测试标签联想
    if (todos.length === 0) {
        todos = [
            {
                id: '1',
                content: 'Buy groceries',
                tags: ['shopping', 'food'],
                priority: 'medium',
                completed: false,
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                content: 'Clean house',
                tags: ['home', 'chores'],
                priority: 'low',
                completed: false,
                createdAt: new Date().toISOString()
            }
        ];
        saveData();
    }
    
    console.log('Todos loaded:', todos);
    
    // 初始化展开的日期
    initExpandedDates();
    // 初始化标签联想
    console.log('Calling initTagAutocomplete');
    initTagAutocomplete();
    // 渲染待办事项
    renderTodos();
    // 渲染工时记录
    renderTimeRecords();
    // 绑定事件
    bindEvents();
}

// 绑定事件
function bindEvents() {
    // 待办事项事件
    addTodoBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });
    
    priorityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            priorityBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPriority = btn.dataset.priority;
        });
    });
    
    clearCompletedBtn.addEventListener('click', clearCompleted);
    
    // 新增：筛选事件
    statAll.addEventListener('click', () => setFilter('all'));
    statPending.addEventListener('click', () => setFilter('pending'));
    statCompleted.addEventListener('click', () => setFilter('completed'));
    
    // 工时记录事件
    addTimeBtn.addEventListener('click', addTimeRecord);
    timeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTimeRecord();
    });
}

// 新增：设置筛选状态
function setFilter(filter) {
    currentFilter = filter;
    // 更新筛选状态的视觉反馈
    document.querySelectorAll('.stat').forEach(stat => {
        stat.classList.remove('active');
    });
    if (filter === 'all') {
        statAll.classList.add('active');
    } else if (filter === 'pending') {
        statPending.classList.add('active');
    } else if (filter === 'completed') {
        statCompleted.classList.add('active');
    }
    renderTodos();
}

// 待办事项功能
function addTodo() {
    const content = todoInput.value.trim();
    if (content) {
        // 提取标签
        const { text, tags } = extractTags(content);
        
        const todo = {
            id: Date.now().toString(),
            content: text,
            tags,
            priority: currentPriority,
            completed: false,
            createdAt: new Date().toISOString()
        };
        todos.push(todo);
        saveData();
        renderTodos();
        todoInput.value = '';
    }
}

// 生成随机颜色
function getRandomTagColor() {
    const colors = [
        { bg: '#e3f2fd', text: '#1971c2' }, // 蓝色
        { bg: '#ebfbee', text: '#2f9e44' }, // 绿色
        { bg: '#fff3bf', text: '#d9480f' }, // 黄色
        { bg: '#fff5f5', text: '#c92a2a' }, // 红色
        { bg: '#f3e8ff', text: '#7048e8' }, // 紫色
        { bg: '#e6f9ff', text: '#0ca678' }  // 青色
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 为标签分配颜色
function getTagColor(tag) {
    // 使用标签名的哈希值来确定颜色，确保同一标签始终使用同一颜色
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        { bg: '#e3f2fd', text: '#1971c2' },
        { bg: '#ebfbee', text: '#2f9e44' },
        { bg: '#fff3bf', text: '#d9480f' },
        { bg: '#fff5f5', text: '#c92a2a' },
        { bg: '#f3e8ff', text: '#7048e8' },
        { bg: '#e6f9ff', text: '#0ca678' }
    ];
    return colors[Math.abs(hash) % colors.length];
}

// 提取标签
function extractTags(text) {
    const tagRegex = /#([\u4e00-\u9fa5\w]+)/g;
    const tags = [];
    let match;
    
    while ((match = tagRegex.exec(text)) !== null) {
        tags.push(match[1]);
    }
    
    // 移除文本中的标签
    const cleanedText = text.replace(tagRegex, '').trim();
    
    return { text: cleanedText, tags };
}

// 计算标签热度
function calculateTagHeat(module = 'all') {
    const tagData = {};
    
    if (module === 'all' || module === 'todo') {
        // 计算待办事项中的标签
        todos.forEach(todo => {
            if (todo.tags && todo.tags.length > 0) {
                todo.tags.forEach(tag => {
                    if (tagData[tag]) {
                        tagData[tag].count++;
                    } else {
                        tagData[tag] = {
                            count: 1,
                            totalTime: 0
                        };
                    }
                });
            }
        });
    }
    
    if (module === 'all' || module === 'time') {
        // 计算工时记录中的标签
        timeRecords.forEach(record => {
            if (record.tags && record.tags.length > 0) {
                record.tags.forEach(tag => {
                    if (tagData[tag]) {
                        tagData[tag].count++;
                        // 只计算已结束的记录时间
                        if (record.status === 'ended' && record.duration) {
                            tagData[tag].totalTime += record.duration;
                        }
                    } else {
                        // 只计算已结束的记录时间
                        const duration = record.status === 'ended' && record.duration ? record.duration : 0;
                        tagData[tag] = {
                            count: 1,
                            totalTime: duration
                        };
                    }
                });
            }
        });
    }
    
    return tagData;
}



// 选择标签
function selectTag(tag, hashIndex, inputId = 'todo-input') {
    const input = document.getElementById(inputId);
    const currentValue = input.value;
    const newValue = currentValue.substring(0, hashIndex + 1) + tag + ' ';
    input.value = newValue;
    input.focus();
    
    // 隐藏联想
    const autocompleteContainer = document.getElementById(`tag-autocomplete-${inputId}`);
    if (autocompleteContainer) {
        autocompleteContainer.style.display = 'none';
    }
}

function toggleTodo(id) {
    todos = todos.map(todo => {
        if (todo.id === id) {
            return { ...todo, completed: !todo.completed };
        }
        return todo;
    });
    saveData();
    renderTodos();
}

function clearCompleted() {
    todos = todos.filter(todo => !todo.completed);
    saveData();
    renderTodos();
}

// 新增：编辑待办事项
function editTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        // 创建编辑表单
        const todoItem = document.querySelector(`[onclick="editTodo('${id}')"]`).closest('.todo-item');
        const todoContent = todoItem.querySelector('.todo-content');
        const originalContent = todo.content;
        
        // 替换为编辑表单
        todoContent.innerHTML = `
            <input type="text" id="edit-todo-${id}" value="${originalContent}" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
            <div style="margin-top: 5px; display: flex; gap: 5px;">
                <button onclick="saveTodoContent('${id}')" style="padding: 3px 8px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">保存</button>
                <button onclick="cancelEditTodo('${id}', '${originalContent}')" style="padding: 3px 8px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">取消</button>
            </div>
        `;
    }
}

// 新增：保存待办事项内容
function saveTodoContent(id) {
    const input = document.getElementById(`edit-todo-${id}`);
    const newContent = input.value.trim();
    if (newContent) {
        const todo = todos.find(t => t.id === id);
        if (todo) {
            todo.content = newContent;
            saveData();
            renderTodos();
        }
    }
}

// 新增：取消编辑待办事项
function cancelEditTodo(id, originalContent) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        renderTodos();
    }
}

// 新增：删除待办事项
function deleteTodo(id) {
    // 创建确认对话框
    const todoItem = document.querySelector(`[onclick="deleteTodo('${id}')"]`).closest('.todo-item');
    const todoContent = todoItem.querySelector('.todo-content');
    
    // 替换为确认对话框
    todoContent.innerHTML = `
        <div style="padding: 10px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
            <p style="margin: 0 0 10px 0;">确定要删除这条待办事项吗？</p>
            <div style="display: flex; gap: 10px;">
                <button onclick="confirmDeleteTodo('${id}')" style="padding: 5px 12px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">确定</button>
                <button onclick="cancelDeleteTodo()" style="padding: 5px 12px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">取消</button>
            </div>
        </div>
    `;
}

// 新增：确认删除待办事项
function confirmDeleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveData();
    renderTodos();
}

// 新增：取消删除待办事项
function cancelDeleteTodo() {
    renderTodos();
}

// 全局变量：当前选中的标签
let currentTag = null;
let currentTimeTag = null;

function renderTodos() {
    // 清空列表
    todoList.innerHTML = '';
    
    // 计算统计数据
    const all = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    const pending = all - completed;
    
    // 更新统计显示
    todoAll.textContent = all;
    todoPending.textContent = pending;
    todoCompleted.textContent = completed;
    
    // 计算待办事项标签热度
    const tagHeat = calculateTagHeat('todo');
    
    // 渲染标签筛选
    renderTagFilters(tagHeat);
    
    // 根据筛选条件过滤待办事项
    let filteredTodos = todos;
    if (currentFilter === 'pending') {
        filteredTodos = todos.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filteredTodos = todos.filter(todo => todo.completed);
    }
    
    // 根据标签筛选
    if (currentTag) {
        filteredTodos = filteredTodos.filter(todo => todo.tags && todo.tags.includes(currentTag));
    }
    
    // 渲染待办事项
    filteredTodos.forEach(todo => {
        const todoItem = document.createElement('div');
        todoItem.className = `todo-item ${todo.priority} ${todo.completed ? 'completed' : ''}`;
        
        // 渲染标签
        let tagsHTML = '';
        if (todo.tags && todo.tags.length > 0) {
            tagsHTML = todo.tags.map(tag => {
                const heat = tagHeat[tag] ? tagHeat[tag].count : 1;
                const fontSize = Math.max(12, Math.min(16, 12 + heat * 0.5));
                const padding = Math.max(2, Math.min(4, 2 + heat * 0.2));
                const borderRadius = Math.max(12, Math.min(16, 12 + heat * 0.5));
                const color = getTagColor(tag);
                return `<span class="todo-tag" style="font-size: ${fontSize}px; padding: ${padding}px ${padding + 6}px; border-radius: ${borderRadius}px; background-color: ${color.bg}; color: ${color.text};">#${tag}</span>`;
            }).join(' ');
        }
        
        todoItem.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo('${todo.id}')">
            <div class="todo-content">
                <div class="todo-text">${todo.content}${tagsHTML ? ` ` : ''}${tagsHTML}</div>
            </div>
            <div class="todo-actions">
                <button class="todo-btn edit hidden-action" onclick="editTodo('${todo.id}')"><img src="修改.png" alt="修改" style="width: 20px; height: 20px;"></button>
                <button class="todo-btn delete hidden-action" onclick="deleteTodo('${todo.id}')"><img src="删除.png" alt="删除" style="width: 20px; height: 20px;"></button>
            </div>
            <div class="todo-priority ${todo.priority}">${getPriorityText(todo.priority)}</div>
        `;
        todoList.appendChild(todoItem);
    });
}

// 渲染标签筛选
function renderTagFilters(tagHeat) {
    // 清空标签筛选区域
    const tagFiltersContainer = document.getElementById('tag-filters');
    if (!tagFiltersContainer) {
        // 创建标签筛选容器
        const container = document.createElement('div');
        container.id = 'tag-filters';
        container.className = 'tag-filters';
        
        // 插入到统计区域下方
        const statsContainer = document.querySelector('.todo-stats');
        statsContainer.parentNode.insertBefore(container, statsContainer.nextSibling);
    }
    
    const tagFilters = document.getElementById('tag-filters');
    
    // 转换为数组并按热度排序
    const sortedTags = Object.entries(tagHeat)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10); // 只显示前10个标签
    
    // 渲染标签筛选
    let tagsHTML = '';
    if (sortedTags.length > 0) {
        tagsHTML = `
            <div class="tag-filters-header">
                <span>标签筛选:</span>
                ${currentTag ? `<button class="tag-clear" onclick="clearTagFilter()">清除筛选</button>` : ''}
            </div>
            <div class="tag-filters-list">
                ${sortedTags.map(([tag, data]) => {
                    const fontSize = Math.max(14, Math.min(20, 14 + data.count * 0.5));
                    const padding = Math.max(8, Math.min(16, 8 + data.count * 0.5));
                    const borderRadius = Math.max(16, Math.min(24, 16 + data.count * 0.5));
                    const isActive = currentTag === tag;
                    const color = getTagColor(tag);
                    return `
                        <button 
                            class="tag-filter ${isActive ? 'active' : ''}" 
                            onclick="filterByTag('${tag}')"
                            style="font-size: ${fontSize}px; padding: ${padding}px ${padding + 8}px; border-radius: ${borderRadius}px; background-color: ${isActive ? '#51cf66' : color.bg}; color: ${isActive ? 'white' : color.text};">
                            #${tag} (${data.count})
                        </button>
                    `;
                }).join(' ')}
            </div>
        `;
    }
    
    tagFilters.innerHTML = tagsHTML;
}

// 按标签筛选
function filterByTag(tag) {
    currentTag = currentTag === tag ? null : tag;
    renderTodos();
}

// 按工时记录标签筛选
function filterTimeByTag(tag) {
    currentTimeTag = currentTimeTag === tag ? null : tag;
    renderTimeRecords();
}

// 清除标签筛选
function clearTagFilter() {
    currentTag = null;
    renderTodos();
}

// 清除工时记录标签筛选
function clearTimeTagFilter() {
    currentTimeTag = null;
    renderTimeRecords();
}

// 渲染工时记录标签筛选
function renderTimeTagFilters() {
    // 清空标签筛选区域
    const tagFiltersContainer = document.getElementById('time-tag-filters');
    if (!tagFiltersContainer) {
        // 创建标签筛选容器
        const container = document.createElement('div');
        container.id = 'time-tag-filters';
        container.className = 'tag-filters';
        
        // 插入到工时记录输入区域下方
        const timeInputArea = document.querySelector('.time-input-area');
        timeInputArea.parentNode.insertBefore(container, timeInputArea.nextSibling);
    }
    
    const tagFilters = document.getElementById('time-tag-filters');
    
    // 计算工时记录标签热度
    const tagHeat = calculateTagHeat('time');
    
    // 转换为数组并按热度排序
    const sortedTags = Object.entries(tagHeat)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10); // 只显示前10个标签
    
    // 渲染标签筛选
    let tagsHTML = '';
    if (sortedTags.length > 0) {
        tagsHTML = `
            <div class="tag-filters-header">
                <span>标签筛选:</span>
                ${currentTimeTag ? `<button class="tag-clear" onclick="clearTimeTagFilter()">清除筛选</button>` : ''}
            </div>
            <div class="tag-filters-list">
                ${sortedTags.map(([tag, data]) => {
                    const fontSize = Math.max(14, Math.min(20, 14 + data.count * 0.5));
                    const padding = Math.max(8, Math.min(16, 8 + data.count * 0.5));
                    const borderRadius = Math.max(16, Math.min(24, 16 + data.count * 0.5));
                    const isActive = currentTimeTag === tag;
                    const color = getTagColor(tag);
                    const totalTime = data.totalTime > 0 ? formatTime(data.totalTime) : '';
                    return `
                        <button 
                            class="tag-filter ${isActive ? 'active' : ''}" 
                            onclick="filterTimeByTag('${tag}')"
                            style="font-size: ${fontSize}px; padding: ${padding}px ${padding + 8}px; border-radius: ${borderRadius}px; background-color: ${isActive ? '#51cf66' : color.bg}; color: ${isActive ? 'white' : color.text};">
                            #${tag} (${data.count})${totalTime ? ' ' + totalTime : ''}
                        </button>
                    `;
                }).join(' ')}
            </div>
        `;
    }
    
    tagFilters.innerHTML = tagsHTML;
}

function getPriorityText(priority) {
    switch (priority) {
        case 'low': return '低';
        case 'medium': return '中';
        case 'high': return '高';
        default: return '中';
    }
}

// 工时记录功能
function addTimeRecord() {
    const name = timeInput.value.trim();
    if (name) {
        // 提取标签
        const { text, tags } = extractTags(name);
        
        const timeRecord = {
            id: Date.now().toString(),
            name: text,
            tags,
            startTime: null,
            endTime: null,
            duration: 0,
            status: 'idle', // 新增：初始状态为idle
            createdAt: new Date().toISOString()
        };
        timeRecords.push(timeRecord);
        saveData();
        renderTimeRecords();
        timeInput.value = '';
    }
}

function startTimer(id) {
    const timeRecord = timeRecords.find(record => record.id === id);
    if (timeRecord && (timeRecord.status === 'idle' || timeRecord.status === 'paused')) {
        const originalStatus = timeRecord.status;
        timeRecord.status = 'running';
        if (originalStatus === 'idle') {
            // 初始状态，设置开始时间
            timeRecord.startTime = new Date().toISOString();
        } else {
            // 暂停状态，继续计时，需要调整开始时间以保持累计时长
            const pausedDuration = timeRecord.duration;
            timeRecord.startTime = new Date(Date.now() - (pausedDuration * 1000)).toISOString();
        }
        timeRecord.endTime = null;
        
        // 启动计时器
        timers[id] = setInterval(() => {
            const startTime = new Date(timeRecord.startTime).getTime();
            const currentTime = new Date().getTime();
            timeRecord.duration = Math.floor((currentTime - startTime) / 1000);
            renderTimeRecords();
        }, 1000);
        
        saveData();
        renderTimeRecords();
    } else if (timeRecord && timeRecord.status === 'running') {
        // 暂停计时器
        clearInterval(timers[id]);
        timeRecord.status = 'paused'; // 改为paused状态
        const startTime = new Date(timeRecord.startTime).getTime();
        const currentTime = new Date().getTime();
        timeRecord.duration = Math.floor((currentTime - startTime) / 1000);
        
        saveData();
        renderTimeRecords();
    }
}

function stopTimer(id) {
    const timeRecord = timeRecords.find(record => record.id === id);
    if (timeRecord && (timeRecord.status === 'running' || timeRecord.status === 'paused')) {
        if (timeRecord.status === 'running') {
            clearInterval(timers[id]);
        }
        timeRecord.status = 'ended';
        timeRecord.endTime = new Date().toISOString();
        if (timeRecord.startTime) {
            const startTime = new Date(timeRecord.startTime).getTime();
            const endTime = new Date(timeRecord.endTime).getTime();
            timeRecord.duration = Math.floor((endTime - startTime) / 1000);
        }
        
        saveData();
        renderTimeRecords();
    }
}

// 新增：删除工时记录
function deleteTimeRecord(id) {
    // 创建确认对话框
    const timeItem = document.querySelector(`[onclick="deleteTimeRecord('${id}')"]`).closest('.time-item');
    const timeInfo = timeItem.querySelector('.time-info');
    
    // 替换为确认对话框
    timeInfo.innerHTML = `
        <div style="padding: 10px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
            <p style="margin: 0 0 10px 0;">确定要删除这条工作记录吗？</p>
            <div style="display: flex; gap: 10px;">
                <button onclick="confirmDeleteTimeRecord('${id}')" style="padding: 5px 12px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">确定</button>
                <button onclick="cancelDeleteTimeRecord()" style="padding: 5px 12px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">取消</button>
            </div>
        </div>
    `;
}

// 新增：确认删除工时记录
function confirmDeleteTimeRecord(id) {
    // 清除可能存在的计时器
    if (timers[id]) {
        clearInterval(timers[id]);
        delete timers[id];
    }
    // 从数组中删除记录
    timeRecords = timeRecords.filter(record => record.id !== id);
    saveData();
    renderTimeRecords();
}

// 新增：取消删除工时记录
function cancelDeleteTimeRecord() {
    renderTimeRecords();
}

// 新增：编辑工时记录名称
function editTimeRecord(id) {
    const timeRecord = timeRecords.find(record => record.id === id);
    if (timeRecord) {
        // 创建编辑表单
        const timeItem = document.querySelector(`[onclick="editTimeRecord('${id}')"]`).closest('.time-item');
        const timeInfo = timeItem.querySelector('.time-info');
        const originalName = timeRecord.name;
        
        // 替换为编辑表单
        timeInfo.innerHTML = `
            <input type="text" id="edit-name-${id}" value="${originalName}" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
            <div style="margin-top: 5px; display: flex; gap: 5px;">
                <button onclick="saveTimeRecordName('${id}')" style="padding: 3px 8px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">保存</button>
                <button onclick="cancelEditTimeRecord('${id}', '${originalName}')" style="padding: 3px 8px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">取消</button>
            </div>
        `;
    }
}

// 新增：保存工时记录名称
function saveTimeRecordName(id) {
    const input = document.getElementById(`edit-name-${id}`);
    const newName = input.value.trim();
    if (newName) {
        const timeRecord = timeRecords.find(record => record.id === id);
        if (timeRecord) {
            timeRecord.name = newName;
            saveData();
            renderTimeRecords();
        }
    }
}

// 新增：取消编辑工时记录名称
function cancelEditTimeRecord(id, originalName) {
    const timeRecord = timeRecords.find(record => record.id === id);
    if (timeRecord) {
        renderTimeRecords();
    }
}

function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 格式化时间为小时和分钟
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}小时${mins}分`;
}

// 全局变量：展开的日期
let expandedDates = new Set();

function renderTimeRecords() {
    // 清空列表
    timeList.innerHTML = '';
    
    // 根据标签筛选
    let filteredRecords = timeRecords;
    if (currentTimeTag) {
        filteredRecords = timeRecords.filter(record => record.tags && record.tags.includes(currentTimeTag));
    }
    
    // 渲染标签筛选
    renderTimeTagFilters();
    
    // 按日期分组并排序
    const groupedRecords = groupRecordsByDate(filteredRecords);
    
    // 渲染时间轴容器
    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'timeline-container';
    
    // 渲染每个日期组
    Object.entries(groupedRecords).forEach(([date, records], index, array) => {
        const isLast = index === array.length - 1;
        
        // 创建日期组容器
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        // 创建时间轴节点
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        
        // 创建时间轴节点
        const timelineNode = document.createElement('div');
        timelineNode.className = 'timeline-node';
        
        // 创建时间轴连接线
        const timelineLine = document.createElement('div');
        timelineLine.className = 'timeline-line';
        if (isLast) {
            timelineLine.classList.add('timeline-line-last');
        }
        
        // 创建日期标题
        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.onclick = () => toggleDate(date);
        dateHeader.innerHTML = `
            <div class="date-info">
                <span class="date-text">${formatDate(date)}</span>
                <span class="record-count">${records.length} 条记录</span>
            </div>
            <button class="expand-btn">
                ${expandedDates.has(date) ? '▼' : '▶'}
            </button>
        `;
        
        // 为时间轴节点添加点击事件
        timelineNode.onclick = () => toggleDate(date);
        timelineNode.style.cursor = 'pointer';
        
        // 创建记录容器
        const recordsContainer = document.createElement('div');
        recordsContainer.className = 'records-container';
        if (expandedDates.has(date)) {
            recordsContainer.classList.add('expanded');
        }
        
        // 渲染记录
        records.forEach(record => {
            const timeItem = document.createElement('div');
            timeItem.className = 'time-item';
            
            let actionsHTML = '';
            if (record.status === 'idle') {
                // 初始状态，显示开始和结束按钮
                actionsHTML = `
                    <button class="time-btn edit hidden-action" onclick="editTimeRecord('${record.id}')"><img src="修改.png" alt="修改" style="width: 24px; height: 24px;"></button>
                    <button class="time-btn delete hidden-action" onclick="deleteTimeRecord('${record.id}')"><img src="删除.png" alt="删除" style="width: 24px; height: 24px;"></button>
                    <button class="time-btn start" onclick="startTimer('${record.id}')">▶</button>
                    <button class="time-btn stop" onclick="stopTimer('${record.id}')">⏹</button>
                `;
            } else if (record.status === 'running') {
                // 运行状态，显示暂停和结束按钮
                actionsHTML = `
                    <button class="time-btn edit hidden-action" onclick="editTimeRecord('${record.id}')"><img src="修改.png" alt="修改" style="width: 24px; height: 24px;"></button>
                    <button class="time-btn delete hidden-action" onclick="deleteTimeRecord('${record.id}')"><img src="删除.png" alt="删除" style="width: 24px; height: 24px;"></button>
                    <button class="time-btn start" onclick="startTimer('${record.id}')">⏸</button>
                    <button class="time-btn stop" onclick="stopTimer('${record.id}')">⏹</button>
                `;
            } else if (record.status === 'paused') {
                // 暂停状态，显示继续和结束按钮
                actionsHTML = `
                    <button class="time-btn edit hidden-action" onclick="editTimeRecord('${record.id}')"><img src="修改.png" alt="修改" style="width: 24px; height: 24px;"></button>
                    <button class="time-btn delete hidden-action" onclick="deleteTimeRecord('${record.id}')"><img src="删除.png" alt="删除" style="width: 24px; height: 24px;"></button>
                    <button class="time-btn start" onclick="startTimer('${record.id}')">▶</button>
                    <button class="time-btn stop" onclick="stopTimer('${record.id}')">⏹</button>
                `;
            } else if (record.status === 'ended') {
                // 已结束状态，只显示已结束标签
                actionsHTML = `
                    <button class="time-btn edit hidden-action" onclick="editTimeRecord('${record.id}')"><img src="修改.png" alt="修改" style="width: 24px; height: 24px;"></button>
                    <button class="time-btn delete hidden-action" onclick="deleteTimeRecord('${record.id}')"><img src="删除.png" alt="删除" style="width: 24px; height: 24px;"></button>
                    <div class="time-status">已结束</div>
                `;
            }
            
            timeItem.innerHTML = `
                <div class="time-info">
                    <div class="time-name">${record.name}${record.tags && record.tags.length > 0 ? ` ` : ''}${record.tags && record.tags.length > 0 ? record.tags.map(tag => {
                                const color = getTagColor(tag);
                                return `<span class="time-tag" style="background-color: ${color.bg}; color: ${color.text};">#${tag}</span>`;
                            }).join(' ') : ''}</div>
                    <div class="time-duration">${formatDuration(record.duration)}</div>
                </div>
                <div class="time-actions">
                    ${actionsHTML}
                </div>
            `;
            recordsContainer.appendChild(timeItem);
        });
        
        // 组装时间轴项目
        timelineItem.appendChild(timelineNode);
        timelineItem.appendChild(timelineLine);
        dateGroup.appendChild(timelineItem);
        dateGroup.appendChild(dateHeader);
        dateGroup.appendChild(recordsContainer);
        timelineContainer.appendChild(dateGroup);
    });
    
    timeList.appendChild(timelineContainer);
    
    // 为每个时间项添加点击事件，在移动端显示隐藏的按钮
    document.querySelectorAll('.time-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // 只有在移动端才触发点击显示
            if (window.innerWidth <= 768) {
                // 避免点击按钮时触发
                if (!e.target.classList.contains('time-btn')) {
                    this.classList.toggle('show-actions');
                }
            }
        });
    });
}

// 按日期分组记录
function groupRecordsByDate(records) {
    // 按创建时间从新到旧排序
    const sortedRecords = [...records].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // 按日期分组
    const grouped = {};
    sortedRecords.forEach(record => {
        const date = new Date(record.createdAt).toISOString().split('T')[0];
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(record);
    });
    
    return grouped;
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // 获取星期几
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    
    return `${year}-${month}-${day} ${weekday}`;
}

// 切换日期展开/折叠状态
function toggleDate(date) {
    if (expandedDates.has(date)) {
        expandedDates.delete(date);
    } else {
        expandedDates.add(date);
    }
    renderTimeRecords();
}

// 初始化时默认展开今天的记录
function initExpandedDates() {
    const today = new Date().toISOString().split('T')[0];
    expandedDates.add(today);
}

// 数据持久化
function saveData() {
    localStorage.setItem('todos', JSON.stringify(todos));
    localStorage.setItem('timeRecords', JSON.stringify(timeRecords));
}

function loadData() {
    const savedTodos = localStorage.getItem('todos');
    const savedTimeRecords = localStorage.getItem('timeRecords');
    
    if (savedTodos) {
        todos = JSON.parse(savedTodos);
    }
    
    if (savedTimeRecords) {
        timeRecords = JSON.parse(savedTimeRecords);
        // 恢复计时器
        timeRecords.forEach(record => {
            if (record.status === 'running') {
                record.status = 'ended';
            }
        });
        saveData();
    }
}

// 初始化输入框标签联想
function initTagAutocomplete() {
    console.log('Tag autocomplete function called');
    
    // 为待办事项输入框初始化
    initInputAutocomplete('todo-input');
    // 为工时记录输入框初始化
    initInputAutocomplete('time-input');
}

// 为指定输入框初始化标签联想
function initInputAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    let autocompleteContainer = null;
    
    if (!input) {
        console.error(`${inputId} element not found`);
        return;
    }
    
    input.addEventListener('input', function(e) {
        const value = e.target.value;
        const lastHashIndex = value.lastIndexOf('#');
        
        if (lastHashIndex !== -1) {
            const partialTag = value.substring(lastHashIndex + 1);
            // 即使partialTag为空，也要显示所有标签
            showTagSuggestions(partialTag, lastHashIndex, input);
        } else {
            hideTagSuggestions();
        }
    });
    
    function showTagSuggestions(partialTag, hashIndex, inputElement) {
        // 根据输入框ID确定模块类型
        const module = inputId === 'todo-input' ? 'todo' : 'time';
        const tagHeat = calculateTagHeat(module);
        const allTags = Object.keys(tagHeat);
        
        let matchedTags;
        if (partialTag === '') {
            // 如果partialTag为空，显示所有标签
            matchedTags = allTags;
        } else {
            // 否则，过滤匹配的标签
            matchedTags = allTags.filter(tag => 
                tag.toLowerCase().startsWith(partialTag.toLowerCase())
            );
        }
        
        if (matchedTags.length === 0) {
            hideTagSuggestions();
            return;
        }
        
        if (!autocompleteContainer) {
            autocompleteContainer = document.createElement('div');
            autocompleteContainer.id = `tag-autocomplete-${inputId}`;
            autocompleteContainer.className = 'tag-autocomplete';
            document.body.appendChild(autocompleteContainer);
        }
        
        const rect = inputElement.getBoundingClientRect();
        autocompleteContainer.style.left = rect.left + 'px';
        autocompleteContainer.style.top = (rect.bottom + window.scrollY + 8) + 'px';
        autocompleteContainer.style.width = rect.width + 'px';
        autocompleteContainer.style.position = 'fixed';
        autocompleteContainer.style.zIndex = '10000';
        
        autocompleteContainer.innerHTML = matchedTags.map(tag => {
            const color = getTagColor(tag);
            return `<div class="tag-suggestion" onclick="selectTag('${tag}', ${hashIndex}, '${inputId}')" style="background-color: ${color.bg}; color: ${color.text};">#${tag}</div>`;
        }).join('');
        
        autocompleteContainer.style.display = 'block';
    }
    
    function hideTagSuggestions() {
        if (autocompleteContainer) {
            autocompleteContainer.style.display = 'none';
        }
    }
    
    document.addEventListener('click', function(e) {
        if (autocompleteContainer && !input.contains(e.target) && !autocompleteContainer.contains(e.target)) {
            hideTagSuggestions();
        }
    });
}

// 启动应用
// 确保所有函数都已定义后再调用init
window.addEventListener('DOMContentLoaded', init);