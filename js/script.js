function loadRoadmapItems() {
    let loaded = JSON.parse(localStorage.getItem('roadmap_items')) || null;
    if (!loaded || loaded.length === 0) {
        loaded = [
            {
                "id": "mock1",
                "title": "N체 시뮬레이션 웹 앱",
                "start": "2026-01-06",
                "end": "2026-05-02",
                "desc": "https://kimqyoung.github.io/nBodySimulator/\n\n고등학교 시절 보고서 과제로 작성",
                "yZone": "top",
                "rowOffset": 0,
                "yPx": 526,
                "color": "#44ff00",
                "type": "project"
            },
            {
                "id": "mock2",
                "title": "언어 학습 앱 프로젝트",
                "start": "2025-12-14",
                "end": "2026-03-23",
                "desc": "https://kimqyoung.github.io/web/\n\n개발자 도구에서 Shift + Ctrl + M 사용 시 정상 작동\n과거 제작했던 웹 앱",
                "yZone": "top",
                "rowOffset": 1,
                "yPx": 632.5,
                "type": "project",
                "color": "#790efb"
            },
            {
                "id": "1780801488269",
                "title": "리눅스 마스터 1급",
                "start": "2026-06-24",
                "end": "2026-12-19",
                "desc": "리눅스 마스터 1급 자격증 취득하기",
                "color": "#e6bf00",
                "yPx": 98,
                "type": "project"
            },
            {
                "id": "1780807910974",
                "title": "토익 공부하기",
                "type": "project",
                "start": "2026-06-26",
                "end": "2026-08-15",
                "desc": "토익 공부하기",
                "color": "#0071e3",
                "yPx": 188
            },
            {
                "id": "1780807950297",
                "title": "TOPCIT 공부",
                "type": "project",
                "start": "2026-06-26",
                "end": "2026-11-04",
                "desc": "TOPCIT 응시해보기",
                "color": "#ff004c",
                "yPx": 293
            }
        ];
        saveRoadmapItems(loaded);
    }
    return loaded;
}

function saveRoadmapItems(itemsArray) {
    localStorage.setItem('roadmap_items', JSON.stringify(itemsArray));
}

function setupCustomDropdown(selectId, inputId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const options = select.querySelectorAll('.custom-option');
    const input = document.getElementById(inputId);

    select.addEventListener('click', (e) => {
        e.stopPropagation();
        select.classList.toggle('open');
    });

    options.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            select.querySelector('.custom-select-trigger').textContent = option.textContent;
            if (input) {
                input.value = option.dataset.value;
                input.dispatchEvent(new Event('change'));
            }
            select.dataset.value = option.dataset.value;
            select.dispatchEvent(new Event('change'));
            select.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (!select.contains(e.target)) {
            select.classList.remove('open');
        }
    });
}

function setupAutoResizeTextarea(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    textarea.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
}

// 공통 함수로 아이템 불러오기
let items = loadRoadmapItems();

let currentZoom = 'quarter'; // 'week', 'month', 'quarter'
let viewportCenterDate = new Date(); // 첫 날짜가 화면 중앙에 오도록 함.
viewportCenterDate.setHours(0, 0, 0, 0);

const ZOOM_SCALES = {
    'week': 30,    // 1 day = 30px
    'month': 10,   // 1 day = 10px
    'quarter': 3   // 1 day = 3px
};

document.addEventListener('DOMContentLoaded', () => {
    const itemForm = document.getElementById('item-form');
    // init()를 부른 직후에 setTimeout을 0.1초 뒤에 하도록 넣음. (애니메이션 등 최적화 계산을 위해)
});

let currentViewItem = null;
let isDraggingAction = false; // 단순 클릭과 마우스 드래그를 구분하기 위한 변수

const timelineView = document.getElementById('timeline-view');
const itemsContainer = document.getElementById('items-container');
const quadrantGrid = document.getElementById('quadrant-grid');
let gridRect = quadrantGrid ? quadrantGrid.getBoundingClientRect() : null;

// 새 창 크기가 바뀔 때마다 격자 크기를 다시 잡음.
window.addEventListener('resize', () => {
    if (quadrantGrid) {
        gridRect = quadrantGrid.getBoundingClientRect();
        renderItems();
    }
});

// 초기화 함수
function init() {
    if (!timelineView) return; // 프로필 페이지 등 메인 뷰가 없는 곳에서는 실행 안함
    setZoom(currentZoom);
    setupEventListeners();

    // 오늘 날짜 표시선(마커) 추가
    const todayMarker = document.createElement('div');
    todayMarker.id = 'today-marker';
    todayMarker.style.position = 'absolute';
    todayMarker.style.top = '0';
    todayMarker.style.bottom = '0';
    todayMarker.style.width = '2px';
    todayMarker.style.backgroundColor = 'rgba(255, 59, 48, 0.6)';
    todayMarker.style.zIndex = '10';
    todayMarker.style.pointerEvents = 'none';
    quadrantGrid.appendChild(todayMarker);
}

// --- 좌표 ↔ 날짜 변환 핵심 수학 함수들 ---

// 현 화면에서 며칠(가로)을 볼지, 하루(1일)가 몇 픽셀인지 반환함.
function getPixelsPerDay() {
    return ZOOM_SCALES[currentZoom];
}

// 특정 날짜(문자열)를 입력하면 화면(격자)의 X 좌표(픽셀)를 반환함.
function dateToX(dateStr) {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - viewportCenterDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const centerX = gridRect.width / 2;
    return centerX + (diffDays * getPixelsPerDay());
}

// 화면 상 X 좌표(픽셀)를 입력하면 해당하는 날짜(YYYY-MM-DD)를 반환함.
function xToDate(xPx) {
    const centerX = gridRect.width / 2;
    const diffDays = (xPx - centerX) / getPixelsPerDay();
    const targetDate = new Date(viewportCenterDate.getTime() + diffDays * (1000 * 60 * 60 * 24));
    return targetDate.toISOString().split('T')[0];
}

function setupEventListeners() {
    const addNavBtn = document.getElementById('add-nav-btn');
    if (addNavBtn) {
        addNavBtn.addEventListener('click', () => {
            const todayStr = new Date().toISOString().split('T')[0];
            const defaultYPx = gridRect.height / 2 - 25; // 화면 정중앙 위치
            openModal({ start: todayStr, end: todayStr, yPx: defaultYPx });
        });
    }

    quadrantGrid.addEventListener('dblclick', (e) => {
        if (e.target.closest('.roadmap-item') || e.target.closest('.time-label') || e.target.closest('.zoom-level')) return;
        const yPx = e.clientY - gridRect.top - 25;
        const clickX = e.clientX - gridRect.left;
        const clickedDate = xToDate(clickX);
        openModal({ start: clickedDate, end: clickedDate, yPx: yPx });
    });

    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('item-modal').classList.add('hidden');
    });

    document.getElementById('close-view-modal').addEventListener('click', () => {
        document.getElementById('view-modal').classList.add('hidden');
    });

    setupCustomDropdown('custom-category-select', 'item-type');
    setupAutoResizeTextarea('item-desc');

    document.getElementById('btn-edit-item').addEventListener('click', () => {
        document.getElementById('view-modal').classList.add('hidden');
        openModal(currentViewItem);
    });

    document.getElementById('btn-delete-item').addEventListener('click', () => {
        if (confirm('정말 삭제하시겠습니까?')) {
            items = items.filter(i => i.id !== currentViewItem.id);
            localStorage.setItem('roadmap_items', JSON.stringify(items));
            document.getElementById('view-modal').classList.add('hidden');
            renderItems();
        }
    });

    document.getElementById('item-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveItem();
    });

    document.querySelectorAll('.zoom-level button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setZoom(e.target.id.replace('btn-', ''));
        });
    });

}

function setZoom(level) {
    document.querySelectorAll('.zoom-level button').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${level}`).classList.add('active');
    currentZoom = level;
    renderItems();
}

function formatDescription(text) {
    if (!text) return '설명이 없습니다.';

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    let html = '';
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) {
            const url = parts[i];
            const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^"&?\/\s]{11})/i);

            if (ytMatch && ytMatch[1]) {
                const vid = ytMatch[1];
                html += `<div style="margin: 12px 0; border-radius: 8px; overflow: hidden; background: #000; aspect-ratio: 16 / 9; resize: both; min-width: 300px; display: flex; flex-direction: column; position: relative;">
                            <iframe width="100%" height="100%" style="flex-grow: 1; border: none; display: block;" src="https://www.youtube-nocookie.com/embed/${vid}" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; text-align: center;">
                            (로컬 환경 오류 시 외부 열기) <a href="${url}" target="_blank" style="color: var(--text-primary); text-decoration: none;">▶ 새 창에서 열기</a>
                        </div>`;
            } else {
                html += `<div style="display: flex; justify-content: flex-end; margin-top: 12px; margin-bottom: -8px; z-index: 1; position: relative;">
                            <button onclick="const wrapper = this.parentElement.nextElementSibling; wrapper.style.width = '768px'; wrapper.style.maxWidth = '100%'; wrapper.style.aspectRatio = '3/4'; wrapper.style.margin = '12px auto'; this.style.display = 'none';" style="background: var(--nav-bg); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 12px; padding: 4px 10px; font-size: 11px; cursor: pointer; backdrop-filter: blur(10px);">📱 태블릿 사이즈로 강제 고정</button>
                        </div>
                        <div style="margin: 12px 0; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; background: var(--item-bg); resize: both; aspect-ratio: 16 / 9; min-width: 300px; display: flex; flex-direction: column; position: relative;">
                            <iframe width="100%" style="flex-grow: 1; border: none; display: block;" src="${url}" title="External Web Page"></iframe>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; text-align: center;">
                            (웹사이트 보안 설정으로 인해 위 화면이 보이지 않는다면) <a href="${url}" target="_blank" style="color: var(--text-primary); text-decoration: none;">▶ 새 창에서 열기</a>
                        </div>`;
            }
        } else {
            html += parts[i].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
    }

    return html;
}

function openViewModal(item) {
    currentViewItem = item;
    document.getElementById('view-title').innerText = item.title;
    document.getElementById('view-date').innerText = `${item.start} ~ ${item.end}`;
    document.getElementById('view-desc').innerHTML = formatDescription(item.desc);
    document.getElementById('view-modal').classList.remove('hidden');
}

function openModal(data = null) {
    const form = document.getElementById('item-form');
    form.reset();
    form.dataset.editId = data?.id || '';

    if (data) {
        document.getElementById('item-start').value = data.start;
        if (data.start === data.end) {
            const ed = new Date(data.start);
            ed.setDate(ed.getDate() + 14);
            document.getElementById('item-end').value = ed.toISOString().split('T')[0];
        } else {
            document.getElementById('item-end').value = data.end;
        }

        if (data.title) document.getElementById('item-title').value = data.title;

        const customSelect = document.getElementById('custom-category-select');
        const customOptions = customSelect.querySelectorAll('.custom-option');
        const customTrigger = customSelect.querySelector('.custom-select-trigger');

        if (data.type) {
            document.getElementById('item-type').value = data.type;
            const option = Array.from(customOptions).find(opt => opt.dataset.value === data.type);
            if (option) {
                customTrigger.textContent = option.textContent;
                customOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            }
        } else {
            document.getElementById('item-type').value = 'project';
            customTrigger.textContent = '프로젝트';
            customOptions.forEach(opt => opt.classList.remove('selected'));
            if (customOptions.length > 0) customOptions[0].classList.add('selected');
        }

        const descEl = document.getElementById('item-desc');
        if (data.desc) {
            descEl.value = data.desc;
        } else {
            descEl.value = '';
        }
        setTimeout(() => {
            descEl.style.height = 'auto';
            descEl.style.height = descEl.scrollHeight + 'px';
        }, 0);

        document.getElementById('item-color').value = data.color || '#0071e3';

        if (data.yPx !== undefined) form.dataset.yPx = data.yPx;
    }

    document.getElementById('item-modal').classList.remove('hidden');
}

// 아이템 저장 버튼 눌렀을 때 실행되는 함수
function saveItem() {
    const form = document.getElementById('item-form');
    const editId = form.dataset.editId;
    const storedYPx = form.dataset.yPx;

    const itemData = {
        title: document.getElementById('item-title').value,
        type: document.getElementById('item-type').value,
        start: document.getElementById('item-start').value,
        end: document.getElementById('item-end').value,
        desc: document.getElementById('item-desc').value,
        color: document.getElementById('item-color').value
    };

    if (editId) {
        // 기존 아이템 수정하는 경우
        const idx = items.findIndex(i => i.id === editId);
        if (idx > -1) {
            items[idx] = { ...items[idx], ...itemData };
        }
    } else {
        // 새로 추가하는 경우
        items.push({
            id: Date.now().toString(),
            ...itemData,
            yPx: storedYPx !== undefined ? parseFloat(storedYPx) : (gridRect.height / 2 - 25)
        });
    }

    saveRoadmapItems(items);
    document.getElementById('item-modal').classList.add('hidden');
    renderItems();
}

// 메인 화면에 아이템들 그리는 함수
function renderItems() {
    itemsContainer.innerHTML = '';
    const todayStr = new Date().toISOString().split('T')[0];

    // 오늘 날짜 표시선 위치 옮겨주기
    const todayMarker = document.getElementById('today-marker');
    if (todayMarker) {
        const todayX = dateToX(todayStr);
        todayMarker.style.left = `${todayX}px`;
    }

    // 배열 돌면서 네모 박스 하나씩 만들기
    items.forEach((item) => {
        const div = document.createElement('div');

        if (item.end < todayStr) {
            div.className = 'roadmap-item past-item';
        } else {
            div.className = 'roadmap-item future-item';
        }

        div.dataset.id = item.id;

        const startX = dateToX(item.start);
        const endX = dateToX(item.end);
        let width = endX - startX;
        if (width < 30) width = 30;

        const centerY = gridRect.height / 2;
        let topPx = item.yPx;
        // 예전 데이터에는 yPx가 없어서 에러나는거 방지용
        if (topPx === undefined) {
            const rowHeight = 50;
            const offset = (item.rowOffset || 0) * rowHeight;
            if (item.yZone === 'top') {
                topPx = 20 + offset;
            } else {
                topPx = centerY + 20 + offset;
            }
        }

        div.style.left = `${startX}px`;
        div.style.top = `${topPx}px`;
        div.style.width = `${width}px`;
        if (item.color) {
            if (item.end < todayStr) {
                div.style.backgroundColor = item.color;
                div.style.borderColor = item.color;
                div.style.color = '#fff';
            } else {
                let r = parseInt(item.color.slice(1, 3), 16) || 0;
                let g = parseInt(item.color.slice(3, 5), 16) || 113;
                let b = parseInt(item.color.slice(5, 7), 16) || 227;
                div.style.backgroundColor = `rgba(${r},${g},${b},0.4)`;
                div.style.borderColor = item.color;
            }
        }
        div.innerHTML = `
            <div class="resize-handle left-handle"></div>
            <div class="item-title">${item.title}</div>
            <div class="item-date">${item.start.substring(5)} ~ ${item.end.substring(5)}</div>
            <div class="resize-handle right-handle"></div>
        `;

        div.addEventListener('click', (e) => {
            if (isDraggingAction) return;
            e.stopPropagation();
            openViewModal(item);
        });

        div.addEventListener('mousedown', startDrag);

        const leftHandle = div.querySelector('.left-handle');
        const rightHandle = div.querySelector('.right-handle');

        leftHandle.addEventListener('mousedown', (e) => startResize(e, 'left', div));
        rightHandle.addEventListener('mousedown', (e) => startResize(e, 'right', div));

        itemsContainer.appendChild(div);
    });

    renderTimeAxis();
}

// 시간축(X축)의 날짜 눈금(라벨)을 화면에 그리는 함수
function renderTimeAxis() {
    document.querySelectorAll('.time-label').forEach(el => el.remove());

    const centerX = gridRect.width / 2;
    const pixelsPerDay = getPixelsPerDay();
    const daysVisibleHalf = centerX / pixelsPerDay;

    const startDate = new Date(viewportCenterDate);
    startDate.setDate(startDate.getDate() - daysVisibleHalf - 5);

    const endDate = new Date(viewportCenterDate);
    endDate.setDate(endDate.getDate() + daysVisibleHalf + 5);

    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    while (current <= endDate) {
        let draw = false;
        let text = '';

        if (currentZoom === 'week') {
            draw = true;
            text = `${current.getMonth() + 1}/${current.getDate()}`;
        } else if (currentZoom === 'month') {
            if (current.getDay() === 1) {
                draw = true;
                text = `${current.getMonth() + 1}/${current.getDate()}`;
            }
        } else if (currentZoom === 'quarter') {
            if (current.getDate() === 1) {
                draw = true;
                text = `${current.getFullYear()}.${current.getMonth() + 1}`;
            }
        }

        if (draw) {
            const xPx = dateToX(current.toISOString().split('T')[0]);
            const label = document.createElement('div');
            label.className = 'time-label';
            label.innerText = text;
            label.style.left = `${xPx}px`;
            label.style.top = `${gridRect.height / 2 + 10}px`;
            quadrantGrid.appendChild(label);
        }

        current.setDate(current.getDate() + 1);
    }
}

let draggedElement = null;
let draggedItem = null;
let dragStartX, dragStartY;
let initialLeft, initialTop;

function startDrag(e) {
    if (e.target.classList.contains('resize-handle')) return;

    draggedElement = e.currentTarget;
    const itemId = draggedElement.dataset.id;
    draggedItem = items.find(i => i.id === itemId);

    dragStartX = e.clientX;
    dragStartY = e.clientY;
    initialLeft = parseFloat(draggedElement.style.left);
    initialTop = parseFloat(draggedElement.style.top);

    draggedElement.style.zIndex = 100;

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
}

// 마우스 드래그 기능
function onDrag(e) {
    if (!draggedElement) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    // 클릭인지 드래그인지 구분하려고 3px 이상 움직였을 때만 드래그로 판정
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        isDraggingAction = true;
    }

    draggedElement.style.left = `${initialLeft + dx}px`;
    draggedElement.style.top = `${initialTop + dy}px`;
}

function endDrag(e) {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);

    if (!draggedElement) return;

    if (isDraggingAction) {
        const itemId = draggedElement.dataset.id;
        const item = items.find(i => i.id === itemId);
        if (item) {
            const newLeft = parseFloat(draggedElement.style.left);
            const newWidth = parseFloat(draggedElement.style.width);

            item.start = xToDate(newLeft);
            item.end = xToDate(newLeft + newWidth);

            const newTop = parseFloat(draggedElement.style.top);
            item.yPx = newTop;

            localStorage.setItem('roadmap_items', JSON.stringify(items));
            renderItems();
        }
    } else {
        // 마우스를 떼지않고 쭉 누른 채로 드래그를 함. 클릭으로 간주하고 드래그를 취소함.
        draggedElement.style.left = `${initialLeft}px`;
        draggedElement.style.top = `${initialTop}px`;
    }

    draggedElement.style.zIndex = '';
    draggedElement = null;

    setTimeout(() => { isDraggingAction = false; }, 50);
}

quadrantGrid.addEventListener('wheel', (e) => {
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    const daysToShift = (delta > 0 ? 1 : -1) * 3;

    viewportCenterDate.setDate(viewportCenterDate.getDate() + daysToShift);
    renderItems();
    e.preventDefault();
}, { passive: false });

// 크기 조절 로직
let isResizing = false;
let resizeDirection = '';
let resizeElement = null;
let resizeStartX = 0;
let resizeInitialWidth = 0;
let resizeInitialLeft = 0;

function startResize(e, dir, el) {
    e.stopPropagation();
    isResizing = true;
    resizeDirection = dir;
    resizeElement = el;
    resizeStartX = e.clientX;
    resizeInitialWidth = parseFloat(el.style.width);
    resizeInitialLeft = parseFloat(el.style.left);

    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', endResize);
}

function onResize(e) {
    if (!isResizing) return;
    const dx = e.clientX - resizeStartX;

    if (Math.abs(dx) > 3) isDraggingAction = true;

    if (resizeDirection === 'right') {
        const newWidth = Math.max(30, resizeInitialWidth + dx);
        resizeElement.style.width = `${newWidth}px`;
    } else if (resizeDirection === 'left') {
        const newWidth = Math.max(30, resizeInitialWidth - dx);
        if (newWidth > 30) {
            resizeElement.style.left = `${resizeInitialLeft + dx}px`;
            resizeElement.style.width = `${newWidth}px`;
        }
    }
}

function endResize(e) {
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', endResize);

    if (isResizing && resizeElement && isDraggingAction) {
        const itemId = resizeElement.dataset.id;
        const item = items.find(i => i.id === itemId);
        if (item) {
            const newLeft = parseFloat(resizeElement.style.left);
            const newWidth = parseFloat(resizeElement.style.width);

            item.start = xToDate(newLeft);
            item.end = xToDate(newLeft + newWidth);

            localStorage.setItem('roadmap_items', JSON.stringify(items));
            renderItems();
        }
    } else if (resizeElement) {
        resizeElement.style.width = `${resizeInitialWidth}px`;
        resizeElement.style.left = `${resizeInitialLeft}px`;
    }

    isResizing = false;
    resizeElement = null;

    setTimeout(() => { isDraggingAction = false; }, 50);
}

setTimeout(init, 100);
