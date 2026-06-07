// DOMContentLoaded 이벤트: HTML 문서가 완전히 불러와졌을 때 내부 코드를 실행함.
document.addEventListener('DOMContentLoaded', () => {
    // 1. 화면에서 사용할 HTML 요소(태그)들을 id를 이용해 가져옴.
    const navSettings = document.getElementById('nav-settings');           // 네비게이션 바의 '설정' 버튼
    const settingsModal = document.getElementById('settings-modal');       // 설정 팝업창(모달)
    const closeSettingsModal = document.getElementById('close-settings-modal'); // 설정 팝업창 닫기 버튼
    const themeSelect = document.getElementById('theme-select');           // 테마 선택 커스텀 드롭다운

    // 필수 요소들이 화면에 없으면 오류 방지를 위해 코드 실행을 중단함.
    if (!navSettings || !settingsModal || !themeSelect) return;

    // --- 1. 테마 불러오기 ---
    const savedTheme = localStorage.getItem('app_theme') || 'auto';
    // console.log("현재 테마: ", savedTheme);

    const trigger = themeSelect.querySelector('.custom-select-trigger');
    const options = themeSelect.querySelectorAll('.custom-option');
    options.forEach(opt => {
        if (opt.dataset.value === savedTheme) {
            opt.classList.add('selected');
            trigger.textContent = opt.textContent; // 선택한 테마로 글자 바꾸기
        } else {
            opt.classList.remove('selected');
        }
    });

    // --- 2. 설정 팝업 열고 닫기 ---
    navSettings.addEventListener('click', (e) => {
        e.preventDefault();
        settingsModal.classList.remove('hidden');
    });

    // X 버튼 누르면 모달창 숨기기
    closeSettingsModal.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    // 테마 적용 함수
    function applyTheme(theme) {
        if (theme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        
        // 차트 등 화면 리렌더링이 필요한 경우
        if (typeof renderDashboard === 'function') {
            // profile.js의 차트 색상 업데이트
            let items = [];
            if (typeof loadRoadmapItems === 'function') {
                items = loadRoadmapItems();
            }
            renderDashboard(items);
        }
    }

    // --- 3. 커스텀 테마 선택 드롭다운 로직 (script.js의 공통 함수 사용) ---
    setupCustomDropdown('theme-select', null);
    themeSelect.addEventListener('change', () => {
        const newTheme = themeSelect.dataset.value;
        localStorage.setItem('app_theme', newTheme);
        applyTheme(newTheme);
    });

    // 드롭다운 영역 바깥(빈 공간)을 클릭하면 열려있는 드롭다운을 닫아줌.
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select').forEach(el => el.classList.remove('open'));
    });
});

