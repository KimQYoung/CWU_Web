/**
 * profile.js
 * 이 파일은 프로필 화면(Profile)의 요약 차트(Chart.js) 그리기, 포트폴리오 목록 나열,
 * 프로필 정보 수정, 그리고 AI 프롬프트 생성(추출) 로직을 담당함.
 */

// 페이지가 완전히 켜졌을 때 즉시 실행되는 초기화 구역임.
document.addEventListener('DOMContentLoaded', () => {
    // 1. script.js에 만들어둔 공통 함수로 아이템 데이터를 싹 불러옴.
    let items = loadRoadmapItems();

    // 2. 불러온 데이터를 바탕으로 각 화면 요소들을 그려주는 함수들을 차례로 호출함.
    renderDashboard(items);     // 차트와 통계 숫자를 그림
    renderPortfolioList(items); // 가로 연대기 포트폴리오 목록을 그림
    initProfileData();          // 사용자 이름, 소개글 등을 세팅
    initTabLogic();             // [프로필 요약] / [포트폴리오 목록] 탭 전환 기능 세팅
});

// --- 탭 메뉴(세그먼트 컨트롤) 동작 로직 ---
// 두 개의 탭 버튼을 클릭할 때마다 화면 내용을 바꿔치기 함.
function initTabLogic() {
    const segmentBtns = document.querySelectorAll('.segment-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    segmentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 버튼들 초기화하고 클릭한 것만 강조
            segmentBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 화면 전환 (hidden 클래스로 가리고 보이기)
            const targetId = btn.dataset.target;
            tabContents.forEach(content => {
                content.classList.add('hidden');
                content.classList.remove('active');
            });
            document.getElementById(targetId).classList.remove('hidden');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// 가로 연대기(점 찍히는 타임라인) 그리는 함수
// 처음에 이거 flex로 가로 정렬하느라 애먹었음
function renderPortfolioList(items, selectedId = null) {
    const dotsContainer = document.getElementById('h-timeline-dots');
    const displayContainer = document.getElementById('active-portfolio-display');

    if (dotsContainer) dotsContainer.innerHTML = '';
    if (displayContainer) displayContainer.innerHTML = '';

    if (!items || items.length === 0) {
        if (displayContainer) displayContainer.innerHTML = '<p style="text-align:center; color: var(--text-secondary); margin-top: 40px;">등록된 항목이 없습니다.</p>';
        return;
    }

    // 시간순으로 정렬 (예전 날짜부터 오름차순)
    const sortedItems = [...items].sort((a, b) => new Date(a.start) - new Date(b.start));

    // 처음에 띄워줄 첫 번째 항목
    let initialItem = sortedItems[0];

    // 점(Dot) 만들기 반복문
    sortedItems.forEach((item, index) => {
        const dotWrapper = document.createElement('div');
        dotWrapper.className = 'h-dot-wrapper'; // 점 감싸는 껍데기

        // 클릭했던 항목이거나 맨 처음 항목이면 불 들어오게 'active' 클래스 줌
        if (selectedId && item.id === selectedId) {
            initialItem = item;
            dotWrapper.classList.add('active');
        } else if (!selectedId && index === 0) {
            dotWrapper.classList.add('active');
        }

        // 색상이랑 날짜 라벨 준비
        const badgeColor = item.color || 'var(--accent-color)';
        const dateLabel = (item.start && item.start !== 'undefined') ? item.start : '날짜 없음';

        // 점이랑 라벨 HTML 쑤셔넣기
        dotWrapper.innerHTML = `
            <div class="h-date-label">${dateLabel}</div>
            <div class="h-dot" style="background: ${badgeColor};"></div>
        `;

        // [프로세스 3] 점 클릭 이벤트 부여
        // 사용자가 점을 클릭하면 현재 항목의 상세 카드(renderActivePortfolioCard)를 띄워줌.
        dotWrapper.addEventListener('click', () => {
            // 모든 점의 활성화 상태(파란색 하이라이트)를 끄고, 방금 클릭한 점만 다시 켬.
            document.querySelectorAll('.h-dot-wrapper').forEach(w => w.classList.remove('active'));
            dotWrapper.classList.add('active');
            renderActivePortfolioCard(item);
        });

        // 부모 컨테이너에 완성된 점 구조를 자식으로 추가(appendChild)함.
        if (dotsContainer) dotsContainer.appendChild(dotWrapper);
    });

    // [프로세스 4] 모든 점 생성이 끝나면, 맨 처음 항목의 카드를 강제로 보여줌.
    if (initialItem) renderActivePortfolioCard(initialItem);
}

// 클릭된 항목의 세부 포트폴리오 카드(설명, 제목 등)를 그리는 함수
function renderActivePortfolioCard(item) {
    const displayContainer = document.getElementById('active-portfolio-display');
    if (!displayContainer) return;

    const typeLabels = {
        'education': '학력',
        'experience': '경력',
        'project': '프로젝트',
        'portfolio': '포트폴리오',
        'certification': '자격증',
        'other': '기타'
    };
    let label = '기타';
    if (item.type && item.type !== 'undefined') {
        label = typeLabels[item.type] || item.type;
    }
    const badgeColor = item.color || 'var(--accent-color)';

    let dateText = item.start || '';
    if (item.end && item.end !== 'undefined' && item.end !== 'null' && item.end.trim() !== '') {
        dateText += ` ~ ${item.end}`;
    }

    const titleText = (item.title && item.title !== 'undefined') ? item.title : '제목 없음';
    const descText = (item.desc && item.desc !== 'undefined') ? formatDescription(item.desc) : '내용 없음';

    displayContainer.innerHTML = `
        <div class="portfolio-card" style="animation: fadeIn 0.3s ease; position: relative;">
            <button id="inline-edit-btn" style="position: absolute; top: 20px; right: 20px; background: none; border: none; color: var(--accent-color); cursor: pointer; font-size: 14px; font-weight: 600;">수정</button>
            <div class="portfolio-card-header" style="margin-right: 40px;">
                <div class="portfolio-card-title">${titleText}</div>
                <div class="portfolio-card-date">${dateText}</div>
            </div>
            <div class="portfolio-type-badge" style="background: ${badgeColor}20; color: ${badgeColor}; box-shadow: inset 0 0 0 1px ${badgeColor}40;">${label}</div>
            <div class="portfolio-card-desc">${descText}</div>
        </div>
    `;

    document.getElementById('inline-edit-btn').addEventListener('click', () => {
        renderActivePortfolioEdit(item);
    });
}

function renderActivePortfolioEdit(item) {
    const displayContainer = document.getElementById('active-portfolio-display');
    if (!displayContainer) return;

    displayContainer.innerHTML = `
        <div class="portfolio-card edit-mode" style="animation: fadeIn 0.2s ease;">
            <div class="form-group row" style="margin-bottom: 16px;">
                <div style="flex: 2;">
                    <label>제목</label>
                    <input type="text" id="inline-title" value="${item.title || ''}">
                </div>
                <div style="flex: 1;">
                    <label>카테고리</label>
                    <div class="custom-select-wrapper">
                        <div class="custom-select" id="inline-custom-category-select">
                            <span class="custom-select-trigger">${item.type === 'certification' ? '자격증' : (item.type === 'other' ? '기타' : '프로젝트')}</span>
                            <div class="custom-options">
                                <div class="custom-option ${item.type === 'project' || !item.type ? 'selected' : ''}" data-value="project">프로젝트</div>
                                <div class="custom-option ${item.type === 'certification' ? 'selected' : ''}" data-value="certification">자격증</div>
                                <div class="custom-option ${item.type === 'other' ? 'selected' : ''}" data-value="other">기타</div>
                            </div>
                        </div>
                        <input type="hidden" id="inline-type" value="${item.type || 'project'}">
                    </div>
                </div>
            </div>
            <div class="form-group row" style="margin-bottom: 16px;">
                <div style="flex: 1;">
                    <label>시작일</label>
                    <input type="date" id="inline-start" value="${item.start || ''}">
                </div>
                <div style="flex: 1;">
                    <label>종료일</label>
                    <input type="date" id="inline-end" value="${item.end || ''}">
                </div>
                <div style="flex: 0.5;">
                    <label>테마 색상</label>
                    <input type="color" id="inline-color" value="${item.color || '#0071e3'}" style="height: 38px; padding: 2px;">
                </div>
            </div>
            <div class="form-group" style="margin-bottom: 16px;">
                <label>설명 및 참고자료</label>
                <textarea id="inline-desc" rows="5">${item.desc || ''}</textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
                <button id="inline-cancel" class="modal-btn" style="background: rgba(120, 120, 128, 0.2); color: var(--text-primary); margin: 0; width: auto; padding: 10px 20px;">취소</button>
                <button id="inline-save" class="modal-btn" style="margin: 0; width: auto; padding: 10px 20px;">저장</button>
            </div>
        </div>
    `;

    // script.js의 공통 함수를 사용하여 텍스트 영역 자동 크기 조절과 드롭다운 이벤트를 초기화함.
    setupAutoResizeTextarea('inline-desc');
    const inlineDesc = document.getElementById('inline-desc');
    if (inlineDesc) inlineDesc.dispatchEvent(new Event('input')); // 열자마자 크기 맞추기

    setupCustomDropdown('inline-custom-category-select', 'inline-type');

    document.getElementById('inline-save').addEventListener('click', () => {
        let items = JSON.parse(localStorage.getItem('roadmap_items')) || [];
        const idx = items.findIndex(i => i.id === item.id);

        if (idx > -1) {
            items[idx].title = document.getElementById('inline-title').value;
            items[idx].type = document.getElementById('inline-type').value;
            items[idx].start = document.getElementById('inline-start').value;
            items[idx].end = document.getElementById('inline-end').value;
            items[idx].color = document.getElementById('inline-color').value;
            items[idx].desc = document.getElementById('inline-desc').value;

            localStorage.setItem('roadmap_items', JSON.stringify(items));

            // 변경된 데이터를 바탕으로 타임라인을 다시 그리고, 수정한 아이템을 선택된 상태로 유지함.
            renderPortfolioList(items, item.id);
        }
    });
}

// 프로필 데이터 로직
const profileModal = document.getElementById('profile-modal');

function formatDescription(text) {
    if (!text) return '설명이 없습니다.';

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    let html = '';
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) { // URL 링크 부분 처리
            const url = parts[i];
            const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^"&?\/\s]{11})/i);

            if (ytMatch && ytMatch[1]) {
                const vid = ytMatch[1];
                html += `<div style="margin: 12px 0; border-radius: 8px; overflow: hidden; background: #000; aspect-ratio: 16 / 9; resize: both; min-width: 300px; display: flex; flex-direction: column; position: relative;">
                            <iframe width="100%" height="100%" style="flex-grow: 1; border: none; display: block;" src="https://www.youtube-nocookie.com/embed/${vid}" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; text-align: center;">
                            <a href="${url}" target="_blank" style="color: var(--text-primary); text-decoration: none;">▶ 새 창에서 열기</a>
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
        } else { // 텍스트 부분 처리 (HTML 태그 필터링)
            html += parts[i].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
    }

    return html;
}
const closeProfileModalBtn = document.getElementById('close-profile-modal');
const btnEditProfile = document.getElementById('btn-edit-profile');
const profileForm = document.getElementById('profile-form');

const displayName = document.getElementById('display-name');
const displayBio = document.getElementById('display-bio');
const linkGithub = document.getElementById('link-github');

let userProfile = {
    name: '김규영',
    bio: '대학교 2학년 (학점 4.33/4.5, 전공학점 4.5/4.5)',
    github: 'https://github.com/KimQYoung',
    tech: 'C, C++, HTML, CSS, JavaScript, Dart, Flutter'
};

function initProfileData() {
    try {
        const storedProfile = localStorage.getItem('roadmap_user_profile');
        if (storedProfile) {
            userProfile = { ...userProfile, ...JSON.parse(storedProfile) };
        }
    } catch (e) {
        console.error('Failed to load profile', e);
    }
    renderProfileInfo();

    btnEditProfile.addEventListener('click', () => {
        document.getElementById('input-name').value = userProfile.name || '';
        document.getElementById('input-bio').value = userProfile.bio || '';
        document.getElementById('input-tech').value = userProfile.tech || '';
        document.getElementById('input-github').value = userProfile.github || '';
        profileModal.classList.remove('hidden');
    });

    closeProfileModalBtn.addEventListener('click', () => {
        profileModal.classList.add('hidden');
    });

    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        userProfile.name = document.getElementById('input-name').value;
        userProfile.bio = document.getElementById('input-bio').value;
        userProfile.tech = document.getElementById('input-tech').value;
        userProfile.github = document.getElementById('input-github').value;

        localStorage.setItem('roadmap_user_profile', JSON.stringify(userProfile));
        profileModal.classList.add('hidden');
        renderProfileInfo();
    });
}

function renderProfileInfo() {
    displayName.innerText = userProfile.name || '홍길동';
    displayBio.innerText = userProfile.bio || '웹 개발자 포트폴리오 로드맵';

    // 기술 스택 (Tech Stack) 화면에 그리기
    const techSection = document.getElementById('tech-stack-section');
    const techContainer = document.getElementById('tech-stack-container');
    techContainer.innerHTML = '';

    if (userProfile.tech) {
        const techs = userProfile.tech.split(',').map(t => t.trim()).filter(t => t.length > 0);
        if (techs.length > 0) {
            techSection.classList.remove('hidden');
            techs.forEach(tech => {
                const span = document.createElement('span');
                span.className = 'tech-badge';
                span.innerText = tech;
                techContainer.appendChild(span);
            });
        } else {
            techSection.classList.add('hidden');
        }
    } else {
        techSection.classList.add('hidden');
    }

    if (userProfile.github) {
        linkGithub.href = userProfile.github;
        linkGithub.classList.remove('hidden');
    } else {
        linkGithub.classList.add('hidden');
    }
}

let importanceChartInst = null;
let timeChartInst = null;

function renderDashboard(items) {
    const totalItems = items.length;
    document.getElementById('total-items-count').innerText = totalItems;

    let importantCount = 0;
    let lessImportantCount = 0;
    let pastCount = 0;
    let futureCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    // yPx 위치를 사분면의 중앙선과 비교하여 대략적인 중요도를 계산함. 
    // 그리드가 없는 일반 페이지 환경에서는 중앙선을 300px (600px의 절반)로 가정함.
    const centerY = 300;
    let upcomingGoals = [];

    items.forEach(item => {
        let y = item.yPx;
        if (y === undefined) y = item.yZone === 'top' ? 0 : centerY + 10;

        if (y < centerY) importantCount++;
        else lessImportantCount++;

        if (item.start > todayStr || item.end > todayStr) {
            futureCount++;
            upcomingGoals.push(item);
        } else {
            pastCount++;
        }
    });

    upcomingGoals.sort((a, b) => a.start.localeCompare(b.start));
    const goalsList = document.getElementById('upcoming-goals-list');
    goalsList.innerHTML = '';

    if (upcomingGoals.length === 0) {
        goalsList.innerHTML = '<li style="justify-content:center; color:var(--text-secondary);">예정된 목표가 없습니다.</li>';
    } else {
        upcomingGoals.slice(0, 5).forEach(g => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="goal-title" style="color: ${g.color || 'inherit'}">${g.title}</span>
                <span class="goal-date">${g.start}</span>
            `;
            goalsList.appendChild(li);
        });
    }

    const savedTheme = localStorage.getItem('app_theme') || 'auto';
    const isDark = savedTheme === 'dark' || (savedTheme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    Chart.defaults.color = isDark ? '#86868b' : '#86868b';
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    const ctxImp = document.getElementById('importanceChart').getContext('2d');
    if (importanceChartInst) importanceChartInst.destroy();
    importanceChartInst = new Chart(ctxImp, {
        type: 'doughnut',
        data: {
            labels: ['중요함 (상단)', '덜 중요함 (하단)'],
            datasets: [{
                data: [importantCount, lessImportantCount],
                backgroundColor: ['#ff3b30', '#ff9f0a'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    const ctxTime = document.getElementById('timeChart').getContext('2d');
    if (timeChartInst) timeChartInst.destroy();
    timeChartInst = new Chart(ctxTime, {
        type: 'bar',
        data: {
            labels: ['과거 (완료)', '미래 (예정/진행)'],
            datasets: [{
                label: '항목 수',
                data: [pastCount, futureCount],
                backgroundColor: ['#0071e3', '#34c759'],
                borderRadius: 8,
                barPercentage: 0.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, precision: 0 },
                    grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// 화면 아무 곳이나 클릭하면 열려있는 커스텀 드롭다운을 모두 닫음.
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('open'));
});

// --- AI 프롬프트 생성 로직 (프롬프트 추출기) ---
function generatePromptText() {
    // 1. 프로필 정보 불러오기
    const storedProfile = localStorage.getItem('roadmap_user_profile');
    let userProfile = storedProfile ? JSON.parse(storedProfile) : {
        name: "김규영",
        bio: "대학교 2학년 (학점 4.33/4.5, 전공학점 4.5/4.5)",
        tech: "C, C++, HTML, CSS, JavaScript, Dart, Flutter",
        github: "https://github.com/KimQYoung"
    };

    // 2. 포트폴리오(로드맵) 정보 불러오기
    let items = loadRoadmapItems();

    // 항목들을 시작일(최신순) 기준으로 정렬함.
    const sortedItems = [...items].sort((a, b) => b.start.localeCompare(a.start));

    let promptStr = `다음은 제 프로필과 포트폴리오 데이터입니다. 이 데이터를 바탕으로 채용 담당자나 외부 제출용으로 적합한 매력적인 포트폴리오 웹사이트 코드를 작성해주세요.\n\n`;

    promptStr += `[기본 프로필]\n`;
    promptStr += `- 이름: ${userProfile.name}\n`;
    if (userProfile.bio) promptStr += `- 소개: ${userProfile.bio}\n`;
    if (userProfile.tech) promptStr += `- 기술 스택: ${userProfile.tech}\n`;
    if (userProfile.github) promptStr += `- GitHub: ${userProfile.github}\n`;

    promptStr += `\n[포트폴리오 및 경험 목록]\n`;

    if (sortedItems.length === 0) {
        promptStr += `등록된 포트폴리오 항목이 없습니다.\n`;
    } else {
        // 각 항목마다 반복문을 돌면서 텍스트를 추가함.
        sortedItems.forEach(item => {
            const typeStr = item.type === 'project' ? '프로젝트' :
                (item.type === 'certification' ? '자격증' : '기타 경험');
            promptStr += `* ${item.title} (${typeStr})\n`;
            promptStr += `  - 기간: ${item.start} ~ ${item.end}\n`;
            if (item.desc) {
                // 설명문은 줄바꿈이 있을 수 있으니 깔끔하게 정리해서 넣음.
                const cleanDesc = item.desc.split('\n').map(line => `  - ${line}`).join('\n');
                promptStr += `${cleanDesc}\n`;
            }
            promptStr += `\n`;
        });
    }

    promptStr += `\n위 데이터를 바탕으로 다음 사항들을 적용하여 HTML, CSS, JavaScript 코드를 만들어주세요:
1. 트렌디하고 모던한 UI 디자인 (애플 스타일의 여백, 둥근 모서리, 부드러운 그림자)
2. 다크 모드 지원
3. 스마트폰에서도 잘 보이는 반응형 레이아웃
4. 포트폴리오 목록은 스크롤 애니메이션과 함께 타임라인 형태로 표시`;

    return promptStr;
}

const btnExportPrompt = document.getElementById('btn-export-prompt');
const promptModal = document.getElementById('prompt-modal');
const closePromptModalBtn = document.getElementById('close-prompt-modal');
const promptTextarea = document.getElementById('prompt-textarea');
const btnCopyPrompt = document.getElementById('btn-copy-prompt');

if (btnExportPrompt) {
    btnExportPrompt.addEventListener('click', () => {
        // 미리 만들어둔 generatePromptText() 함수를 호출하여 AI에게 줄 텍스트를 완성함.
        const promptText = generatePromptText();

        // 생성된 텍스트를 팝업창 안의 텍스트 상자(textarea)에 집어넣음.
        promptTextarea.value = promptText;

        // 팝업창을 화면에 보여줌.
        promptModal.classList.remove('hidden');
        btnCopyPrompt.textContent = '텍스트 복사하기';
    });
}

if (closePromptModalBtn) {
    // 닫기 버튼 클릭 시 팝업을 숨김.
    closePromptModalBtn.addEventListener('click', () => {
        promptModal.classList.add('hidden');
    });
}

if (btnCopyPrompt) {
    btnCopyPrompt.addEventListener('click', () => {
        // 텍스트 상자의 내용 전체를 선택(블록 지정)함.
        promptTextarea.select();

        // 사용자의 클립보드(복사 공간)에 해당 텍스트를 복사하는 명령어임.
        document.execCommand('copy');

        // 성공적으로 복사되었음을 버튼 글자를 바꿔서 알려줌.
        btnCopyPrompt.textContent = '✅ 복사 완료!';

        // 2초(2000ms) 뒤에 버튼 글자를 원래대로 돌려놓음.
        setTimeout(() => {
            btnCopyPrompt.textContent = '텍스트 복사하기';
        }, 2000);
    });
}
