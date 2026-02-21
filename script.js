// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyBnh9Ij0qZ7KMUyXVQoJmGxuhoeeq2lTos",
    authDomain: "thai-feee6.firebaseapp.com",
    databaseURL: "https://thai-feee6-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "thai-feee6",
    storageBucket: "thai-feee6.firebasestorage.app",
    messagingSenderId: "632113518491",
    appId: "1:632113518491:web:4bbc9416b08f2a42d6333e"
};

// 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let currentItems = [];

// 데이터 저장
function saveData() {
    const content = document.getElementById('content').value;
    const amount = document.getElementById('amount').value;
    if (!content || !amount) { alert("내용과 금액을 입력해주세요!"); return; }
    db.ref('expenses').push().set({
        content: content,
        amount: Number(amount),
        timestamp: Date.now()
    }).then(() => { 
        alert("입력되었습니다!"); 
        document.getElementById('content').value = ''; 
        document.getElementById('amount').value = ''; 
    });
}

// 데이터 삭제
function deleteData(id) {
    if (confirm("정말 삭제하시겠습니까?")) { 
        db.ref('expenses/' + id).remove().then(() => { alert("삭제되었습니다."); }); 
    }
}

// 엑셀 내보내기
function exportToExcel() {
    if (currentItems.length === 0) { alert("내역이 없습니다."); return; }
    let csvContent = "\uFEFF날짜,내용,금액(Baht)\n";
    currentItems.forEach(item => {
        const date = new Date(item.timestamp).toLocaleString('ko-KR').replace(/,/g, '');
        csvContent += `${date},${item.content},${item.amount}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "태국여행_가계부.csv";
    link.click();
}

// ★ PDF 내보내기 (여백 추가 및 잘림 방지 버전) ★
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const area = document.getElementById('print-area');
    const delBtns = document.querySelectorAll('.delete-btn');
    
    // 1. 삭제 버튼 숨기기
    delBtns.forEach(btn => btn.style.display = 'none');

    // 2. 캡처 옵션 설정 (여백 확보를 위해 캔버스 크기 조절)
    html2canvas(area, { 
        scale: 2,           // 화질 개선
        useCORS: true,      // 이미지 로드 허용
        logging: false,
        backgroundColor: "#ffffff" // 배경은 흰색으로 고정
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4'); // A4 사이즈 PDF 생성
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // 여백 설정 (좌우 10mm씩 띄움)
        const margin = 10; 
        const innerWidth = pdfWidth - (margin * 2);
        const innerHeight = (canvas.height * innerWidth) / canvas.width;
        
        // 이미지를 중앙에 배치 (여백 적용)
        pdf.addImage(imgData, 'PNG', margin, margin, innerWidth, innerHeight);
        
        pdf.save("태국여행_가계부.pdf");
        
        // 3. 삭제 버튼 복구
        delBtns.forEach(btn => btn.style.display = 'block');
    });
}

// 실시간 데이터 불러오기
db.ref('expenses').orderByChild('timestamp').on('value', (snapshot) => {
    const listDiv = document.getElementById('history-list');
    const totalSpan = document.getElementById('total-amount');
    listDiv.innerHTML = ''; 
    let totalSum = 0;
    currentItems = [];
    snapshot.forEach((childSnapshot) => {
        const val = childSnapshot.val();
        currentItems.push({ id: childSnapshot.key, ...val });
        totalSum += val.amount;
    });
    totalSpan.innerText = totalSum.toLocaleString();
    [...currentItems].reverse().forEach((item) => {
        const date = new Date(item.timestamp).toLocaleString('ko-KR');
        listDiv.innerHTML += `
            <div class="item">
                <div class="info"><strong>${item.content}</strong><span class="time">${date}</span></div>
                <div class="amount-group">
                    <span class="amount">${item.amount.toLocaleString()} ฿</span>
                    <button class="delete-btn" onclick="deleteData('${item.id}')">삭제</button>
                </div>
            </div>`;
    });
});