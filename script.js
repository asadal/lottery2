// 전역 변수
let data = [];
let previousWinners = [];
let currentRound = 1;

// DOM 요소
const uploadOption = document.getElementById('uploadOption');
const googleSheetOption = document.getElementById('googleSheetOption');
const directInputOption = document.getElementById('directInputOption');

const uploadSection = document.getElementById('uploadSection');
const googleSheetSection = document.getElementById('googleSheetSection');
const directInputSection = document.getElementById('directInputSection');

const fileInput = document.getElementById('fileInput');
const addFileButton = document.getElementById('addFileButton');
const fileMessage = document.getElementById('fileMessage');

const googleSheetURL = document.getElementById('googleSheetURL');
const addGoogleSheetButton = document.getElementById('addGoogleSheetButton');
const googleSheetMessage = document.getElementById('googleSheetMessage');

const directInput = document.getElementById('directInput');
const addDirectInputButton = document.getElementById('addDirectInputButton');
const directInputMessage = document.getElementById('directInputMessage');

const dataTableSection = document.getElementById('dataTableSection');
const tableHeader = document.getElementById('tableHeader');
const tableBody = document.getElementById('tableBody');
const dataMessage = document.getElementById('dataMessage');

const drawControlsSection = document.getElementById('drawControlsSection');
const winnerNumber = document.getElementById('winnerNumber');
const excludePrevious = document.getElementById('excludePrevious');
const drawName = document.getElementById('drawName');
const drawButton = document.getElementById('drawButton');
const drawMessage = document.getElementById('drawMessage');

const winnersSection = document.getElementById('winnersSection');
const winnersBody = document.getElementById('winnersBody');
const downloadWinnersCSV = document.getElementById('downloadWinnersCSV');
const downloadWinnersExcel = document.getElementById('downloadWinnersExcel');

const allWinnersSection = document.getElementById('allWinnersSection');
const downloadAllWinnersCSV = document.getElementById('downloadAllWinnersCSV');
const downloadAllWinnersExcel = document.getElementById('downloadAllWinnersExcel');

const previousWinnersSection = document.getElementById('previousWinnersSection');
const previousWinnersContainer = document.getElementById('previousWinnersContainer');

const resetButton = document.getElementById('resetButton');

// 초기 설정
function initialize() {
    // 데이터 소스 선택에 따른 섹션 표시
    document.getElementsByName('dataSource').forEach(radio => {
        radio.addEventListener('change', toggleDataSource);
    });
    toggleDataSource();

    // 버튼 이벤트 리스너
    addFileButton.addEventListener('click', handleFileUpload);
    addGoogleSheetButton.addEventListener('click', handleGoogleSheet);
    addDirectInputButton.addEventListener('click', handleDirectInput);
    drawButton.addEventListener('click', handleDraw);
    downloadWinnersCSV.addEventListener('click', downloadWinnersAsCSV);
    downloadWinnersExcel.addEventListener('click', downloadWinnersAsExcel);
    downloadAllWinnersCSV.addEventListener('click', downloadAllWinnersAsCSV);
    downloadAllWinnersExcel.addEventListener('click', downloadAllWinnersAsExcel);
    resetButton.addEventListener('click', resetAll);
}

// 데이터 소스 선택에 따라 섹션 토글
function toggleDataSource() {
    const selected = document.querySelector('input[name="dataSource"]:checked').value;
    uploadSection.classList.add('hidden');
    googleSheetSection.classList.add('hidden');
    directInputSection.classList.add('hidden');

    if (selected === 'upload') {
        uploadSection.classList.remove('hidden');
    } else if (selected === 'googleSheet') {
        googleSheetSection.classList.remove('hidden');
    } else if (selected === 'directInput') {
        directInputSection.classList.remove('hidden');
    }
}

// 파일 업로드 처리
function handleFileUpload() {
    const file = fileInput.files[0];
    if (!file) {
        fileMessage.innerHTML = '<p class="error">파일을 업로드해주세요.</p>';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataBinary = e.target.result;
        let workbook;
        try {
            workbook = XLSX.read(dataBinary, {type: 'binary'});
        } catch (error) {
            fileMessage.innerHTML = `<p class="error">엑셀 파일을 읽는 중 오류가 발생했습니다: ${error.message}</p>`;
            return;
        }
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {header:1});
        if (jsonData.length === 0) {
            fileMessage.innerHTML = '<p class="error">엑셀 파일이 비어 있습니다.</p>';
            return;
        }
        // 첫 번째 행을 헤더로 사용
        const headers = jsonData[0];
        const rows = jsonData.slice(1).map(row => {
            let obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
        data = rows;
        renderDataTable(headers, rows);
        fileMessage.innerHTML = '<p class="success">파일 추가 완료!</p>';
    };
    if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
        reader.onload = function(e) {
            const csv = e.target.result;
            const workbook = XLSX.read(csv, {type: 'string'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header:1});
            if (jsonData.length === 0) {
                fileMessage.innerHTML = '<p class="error">CSV 파일이 비어 있습니다.</p>';
                return;
            }
            const headers = jsonData[0];
            const rows = jsonData.slice(1).map(row => {
                let obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
            data = rows;
            renderDataTable(headers, rows);
            fileMessage.innerHTML = '<p class="success">파일 추가 완료!</p>';
        };
    } else {
        reader.readAsBinaryString(file);
    }
}

// 구글 시트 처리
async function handleGoogleSheet() {
    const url = googleSheetURL.value.trim();
    if (!url) {
        googleSheetMessage.innerHTML = '<p class="error">구글 시트 URL을 입력해주세요.</p>';
        return;
    }
    const match = url.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+).*gid=([0-9]+)/);
    if (!match) {
        googleSheetMessage.innerHTML = '<p class="error">구글 시트 URL 형식이 올바르지 않습니다.</p>';
        return;
    }
    const fileId = match[1];
    const gid = match[2];
    // CORS 프록시 사용 (https://api.allorigins.win/raw?url=)
    const corsProxy = 'https://api.allorigins.win/raw?url=';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv&gid=${gid}`;
    try {
        const fetchUrl = corsProxy + encodeURIComponent(csvUrl);
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error('네트워크 응답이 올바르지 않습니다.');
        const csv = await response.text();
        const workbook = XLSX.read(csv, {type: 'string'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {header:1});
        if (jsonData.length === 0) {
            googleSheetMessage.innerHTML = '<p class="error">구글 시트가 비어 있습니다.</p>';
            return;
        }
        const headers = jsonData[0];
        const rows = jsonData.slice(1).map(row => {
            let obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
        data = rows;
        renderDataTable(headers, rows);
        googleSheetMessage.innerHTML = '<p class="success">구글 시트 데이터 추가 완료!</p>';
    } catch (error) {
        googleSheetMessage.innerHTML = `<p class="error">구글 시트를 로드하는 중 오류가 발생했습니다: ${error.message}</p>`;
        console.error('Error fetching Google Sheet:', error);
    }
}

// 직접 입력 처리
function handleDirectInput() {
    const input = directInput.value.trim();
    if (!input) {
        directInputMessage.innerHTML = '<p class="error">참가자 목록을 입력해주세요.</p>';
        return;
    }
    const entries = input.split('\n').map(line => line.trim()).filter(line => line);
    if (entries.length === 0) {
        directInputMessage.innerHTML = '<p class="error">입력된 데이터가 유효하지 않습니다.</p>';
        return;
    }
    data = entries.map(name => ({ "이름": name }));
    renderDataTable(["이름"], data);
    directInputMessage.innerHTML = '<p class="success">데이터 추가 완료!</p>';
}

// 데이터 테이블 렌더링
function renderDataTable(headers, rows) {
    // 헤더 설정
    tableHeader.innerHTML = '';
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        tableHeader.appendChild(th);
    });

    // 바디 설정
    tableBody.innerHTML = '';
    rows.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header] || '';
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });

    dataTableSection.classList.remove('hidden');
    drawControlsSection.classList.remove('hidden');
    allWinnersSection.classList.remove('hidden');
    previousWinnersSection.classList.remove('hidden');

    dataMessage.innerHTML = '<p class="success">데이터가 성공적으로 로드됐습니다!(데이터 일부만 노출됩니다.)</p>';
}

// 추첨 처리
function handleDraw() {
    drawMessage.innerHTML = '';
    const numWinners = parseInt(winnerNumber.value);
    if (isNaN(numWinners) || numWinners < 1) {
        drawMessage.innerHTML = '<p class="error">유효한 당첨자 수를 입력해주세요.</p>';
        return;
    }

    let availableData = [...data];
    if (excludePrevious.checked && previousWinners.length > 0) {
        availableData = availableData.filter(entry => {
            return !previousWinners.some(winner => isEqual(entry, winner));
        });
    }

    if (availableData.length < numWinners) {
        drawMessage.innerHTML = `<p class="error">기존 당첨자를 제외한 참가자 수가 당첨자 수(${numWinners})보다 적습니다.</p>`;
        return;
    }

    const drawNameValue = drawName.value.trim() || `추첨 ${currentRound}`;
    // 애니메이션 효과
    const animationSteps = 20;
    let step = 0;
    const interval = setInterval(() => {
        if (step < animationSteps) {
            const tempWinners = getRandomWinners(availableData, numWinners);
            renderWinners(tempWinners);
            step++;
        } else {
            clearInterval(interval);
            const finalWinners = getRandomWinners(availableData, numWinners);
            finalWinners.forEach(winner => {
                winner['Draw Name'] = drawNameValue;
            });
            previousWinners = previousWinners.concat(finalWinners);
            currentRound++;
            renderWinners(finalWinners);
            drawMessage.innerHTML = '<p class="success">당첨자가 선정됐습니다!</p>';
            updatePreviousWinnersDisplay();
        }
    }, 50);
}

// 당첨자 랜덤 선택
function getRandomWinners(dataArray, num) {
    const shuffled = dataArray.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}

// 당첨자 테이블 렌더링
function renderWinners(winners) {
    winnersBody.innerHTML = '';
    winners.forEach(winner => {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.textContent = winner['이름'] || winner['Name'] || 'Unknown';
        tr.appendChild(td);
        winnersBody.appendChild(tr);
    });
    winnersSection.classList.remove('hidden');
}

// 이전 당첨자 표시 업데이트
function updatePreviousWinnersDisplay() {
    previousWinnersContainer.innerHTML = '';
    const grouped = groupBy(previousWinners, 'Draw Name');
    for (const [draw, winners] of Object.entries(grouped)) {
        const section = document.createElement('div');
        section.style.marginBottom = '20px';

        const subHeader = document.createElement('h3');
        subHeader.textContent = draw;
        section.appendChild(subHeader);

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = '이름';
        trHead.appendChild(th);
        thead.appendChild(trHead);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        winners.forEach(winner => {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.textContent = winner['이름'] || winner['Name'] || 'Unknown';
            tr.appendChild(td);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        section.appendChild(table);

        // 다운로드 버튼
        const sanitizedDrawName = sanitizeFilename(draw);
        // CSV 다운로드
        const csvButton = document.createElement('button');
        csvButton.textContent = `'${draw}' 당첨자 다운로드(CSV)`;
        csvButton.addEventListener('click', () => {
            const csvContent = winners.map(w => w['이름'] || w['Name'] || 'Unknown').join('\n');
            downloadFile(`${sanitizedDrawName}.csv`, 'text/csv', csvContent);
        });
        section.appendChild(csvButton);

        // Excel 다운로드
        const excelButton = document.createElement('button');
        excelButton.textContent = `'${draw}' 당첨자 다운로드(Excel)`;
        excelButton.style.marginLeft = '10px';
        excelButton.addEventListener('click', () => {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(winners.map(w => ({ "이름": w['이름'] || w['Name'] || 'Unknown' })));
            XLSX.utils.book_append_sheet(wb, ws, "Winners");
            XLSX.writeFile(wb, `${sanitizedDrawName}.xlsx`);
        });
        section.appendChild(excelButton);

        previousWinnersContainer.appendChild(section);
    }
}

// 유틸리티 함수: 그룹화
function groupBy(array, key) {
    return array.reduce((result, current) => {
        (result[current[key]] = result[current[key]] || []).push(current);
        return result;
    }, {});
}

// 유틸리티 함수: 파일 다운로드
function downloadFile(filename, mimeType, content) {
    const blob = new Blob([content], {type: mimeType});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// 유틸리티 함수: 파일명 정화
function sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]/g, '_').trim() || "당첨자_목록";
}

// 데이터 비교 함수
function isEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}

// 당첨자 CSV 다운로드
function downloadWinnersAsCSV() {
    const winners = previousWinners.slice(-1); // 마지막 추첨만 다운로드
    const csvContent = winners.map(w => w['이름'] || w['Name'] || 'Unknown').join('\n');
    const filename = sanitizeFilename(drawName.value.trim() || `추첨_${currentRound - 1}`) + '.csv';
    downloadFile(filename, 'text/csv', csvContent);
}

// 당첨자 Excel 다운로드
function downloadWinnersAsExcel() {
    const winners = previousWinners.slice(-1); // 마지막 추첨만 다운로드
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(winners.map(w => ({ "이름": w['이름'] || w['Name'] || 'Unknown' })));
    XLSX.utils.book_append_sheet(wb, ws, "Winners");
    const filename = sanitizeFilename(drawName.value.trim() || `추첨_${currentRound - 1}`) + '.xlsx';
    XLSX.writeFile(wb, filename);
}

// 전체 당첨자 CSV 다운로드
function downloadAllWinnersAsCSV() {
    const csvContent = previousWinners.map(w => `${w['Draw Name']},${w['이름'] || w['Name'] || 'Unknown'}`).join('\n');
    const filename = sanitizeFilename('당첨자_목록') + '.csv';
    downloadFile(filename, 'text/csv', csvContent);
}

// 전체 당첨자 Excel 다운로드
function downloadAllWinnersAsExcel() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(previousWinners.map(w => ({ "Draw Name": w['Draw Name'], "이름": w['이름'] || w['Name'] || 'Unknown' })));
    XLSX.utils.book_append_sheet(wb, ws, "All Winners");
    const filename = sanitizeFilename('전체 당첨자 목록') + '.xlsx';
    XLSX.writeFile(wb, filename);
}

// 초기화 함수
function resetAll() {
    if (confirm('정말로 초기화하시겠습니까? 모든 데이터가 삭제됩니다.')) {
        data = [];
        previousWinners = [];
        currentRound = 1;
        tableHeader.innerHTML = '';
        tableBody.innerHTML = '';
        winnersBody.innerHTML = '';
        previousWinnersContainer.innerHTML = '';
        dataTableSection.classList.add('hidden');
        drawControlsSection.classList.add('hidden');
        winnersSection.classList.add('hidden');
        allWinnersSection.classList.add('hidden');
        previousWinnersSection.classList.add('hidden');
        fileMessage.innerHTML = '';
        googleSheetMessage.innerHTML = '';
        directInputMessage.innerHTML = '';
        dataMessage.innerHTML = '';
        drawMessage.innerHTML = '';
    }
}

// 초기화 실행
initialize();
