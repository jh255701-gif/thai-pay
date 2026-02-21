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

// 요청하신 환율 47.3 적용
const EXCHANGE_RATE = 47.3; 

// 데이터 저장 함수
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

// 데이터 삭제 함수
function deleteData(id) {
    if (confirm("정말 삭제하시겠습니까?")) { 
        db.ref('expenses/' + id).remove().then(() => { alert("삭제되었습니다."); }); 
    }
}

// 엑셀 내보내기 기능
function exportToExcel() {
    if (currentItems.length === 0) { alert("내역이 없습니다."); return; }
    let csvContent = "\uFEFF날짜,내용,금액(Baht),환산(Won)\n";
    currentItems.forEach(item => {
        const date = new Date(item.timestamp).toLocaleString('ko-KR').replace(/,/g, '');
        const won = Math.round(item.amount * EXCHANGE_RATE);
        csvContent += `${date},${item.content},${item.amount},${won}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "태국여행_가계부.csv";
    link.click();
}

// PDF 내보내기 기능 (여백 및 잘림 방지)
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const area = document.getElementById('print-area');
    const delBtns = document.querySelectorAll('.delete-btn');
    
    delBtns.forEach(btn => btn.style.display = 'none'); // 삭제 버튼 숨김

    html2canvas(area, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const margin = 10; 
        const innerWidth = pdfWidth - (margin * margin);
        const innerHeight = (canvas.height * innerWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', margin, margin, innerWidth, innerHeight);
        pdf.save("태국여행_가계부.pdf");
        
        delBtns.forEach(btn => btn.style.display = 'block'); // 삭제 버튼 복구
    });
}

// 실시간 데이터 리스너
db.ref('expenses').orderByChild('timestamp').on('value', (snapshot) => {
    const listDiv = document.getElementById('history-list');
    const totalSpan = document.getElementById('total-amount');
    const totalWonSpan = document.getElementById('total-won');
    
    listDiv.innerHTML = ''; 
    let totalSum = 0;
    currentItems = [];
    snapshot.forEach((childSnapshot) => {
        const val = childSnapshot.val();
        currentItems.push({ id: childSnapshot.key, ...val });
        totalSum += val.amount;
    });

    // 총액 업데이트 (바트 및 원화)
    totalSpan.innerText = totalSum.toLocaleString();
    totalWonSpan.innerText = `(${Math.round(totalSum * EXCHANGE_RATE).toLocaleString()}원)`;

    // 내역 리스트 표시 (최신순)
    [...currentItems].reverse().forEach((item) => {
        const date = new Date(item.timestamp).toLocaleString('ko-KR');
        const wonAmount = Math.round(item.amount * EXCHANGE_RATE);
        
        listDiv.innerHTML += `
            <div class="item">
                <div class="info"><strong>${item.content}</strong><span class="time">${date}</span></div>
                <div class="amount-group">
                    <span class="amount">${item.amount.toLocaleString()} ฿</span>
                    <span class="item-won">(${wonAmount.toLocaleString()}원)</span>
                    <button class="delete-btn" onclick="deleteData('${item.id}')">삭제</button>
                </div>
            </div>`;
    });
});