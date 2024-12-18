// 파일 업로드 처리
function handleFileUpload() {
    const file = fileInput.files[0];
    if (!file) {
        fileMessage.innerHTML = '<p class="error">파일을 업로드해주세요.</p>';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        let jsonData;
        if (file.name.endsWith('.csv')) {
            const csv = e.target.result;
            jsonData = CSVToArray(csv); // CSV 처리 함수로 변경
        } else {
            const dataBinary = e.target.result;
            try {
                const workbook = XLSX.read(dataBinary, {type: 'binary'});
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                jsonData = XLSX.utils.sheet_to_json(worksheet, {header:1});
            } catch (error) {
                fileMessage.innerHTML = `<p class="error">엑셀 파일을 읽는 중 오류가 발생했습니다: ${error.message}</p>`;
                return;
            }
        }

        if (jsonData.length === 0) {
            fileMessage.innerHTML = '<p class="error">파일이 비어 있습니다.</p>';
            return;
        }

        // 첫 번째 행을 헤더로 사용
        headers = jsonData[0].map(header => header.trim());
        const rows = jsonData.slice(1).map(row => {
            let obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] ? row[index].toString().trim() : '';
            });
            return obj;
        }).filter(row => Object.values(row).some(value => value !== ''));

        data = rows;
        renderDataTable(headers, rows);
        fileMessage.innerHTML = '<p class="success">파일 추가 완료!</p>';
    };

    if (file.name.endsWith('.csv')) {
        reader.readAsText(file); // CSV 파일은 텍스트로 읽음
    } else {
        reader.readAsBinaryString(file); // 엑셀 파일은 바이너리로 읽음
    }
}

// CSV 텍스트를 2D 배열로 변환하는 함수 (CSV 파일 처리)
function CSVToArray(strData) {
    const rows = strData.split("\n");
    return rows.map(row => row.split(","));
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
    const csvUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv&gid=${gid}`;
    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error('네트워크 응답이 올바르지 않습니다.');
        const csv = await response.text();
        const jsonData = CSVToArray(csv);
        if (jsonData.length === 0) {
            googleSheetMessage.innerHTML = '<p class="error">구글 시트가 비어 있습니다.</p>';
            return;
        }

        headers = jsonData[0].map(header => header.trim());
        const rows = jsonData.slice(1).map(row => {
            let obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] ? row[index].toString().trim() : '';
            });
            return obj;
        }).filter(row => Object.values(row).some(value => value !== ''));

        data = rows;
        renderDataTable(headers, rows);
        googleSheetMessage.innerHTML = '<p class="success">구글 시트 데이터 추가 완료!</p>';
    } catch (error) {
        googleSheetMessage.innerHTML = `<p class="error">구글 시트를 로드하는 중 오류가 발생했습니다: ${error.message}</p>`;
        console.error('Error fetching Google Sheet:', error);
    }
}
