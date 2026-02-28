const firebaseConfig = {
    apiKey: "AIzaSyBnh9Ij0qZ7KMUyXVQoJmGxuhoeeq2lTos",
    authDomain: "thai-feee6.firebaseapp.com",
    databaseURL: "https://thai-feee6-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "thai-feee6",
    storageBucket: "thai-feee6.firebasestorage.app",
    messagingSenderId: "632113518491",
    appId: "1:632113518491:web:4bbc9416b08f2a42d6333e"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let currentItems = [];
const EXCHANGE_RATE = 47.3; 
let editTargetId = null;

// 데이터 저장
function saveData() {
    const category = document.getElementById('category').value;
    const content = document.getElementById('content').value;
    const amount = document.getElementById('amount').value;
    const currency = document.querySelector('input[name="currency"]:checked').value;
    if (!content || !amount) { alert("내용과 금액을 입력해주세요!"); return; }
    db.ref('expenses').push().set({
        category: category, content: content, amount: Number(amount),
        currency: currency, timestamp: Date.now()
    }).then(() => { 
        alert("입력되었습니다!"); 
        document.getElementById('content').value = ''; 
        document.getElementById('amount').value = ''; 
    });
}

// ★ 수정 모달 열기 (방어 코드 추가) ★
function openEditModal(id) {
    const item = currentItems.find(i => i.id === id);
    if (!item) return;
    
    editTargetId = id;
    document.getElementById('edit-category').value = item.category || '기타';
    document.getElementById('edit-content').value = item.content || '';
    document.getElementById('edit-amount').value = item.amount || 0;
    
    // 예전 데이터에 화폐 정보가 없을 경우 'baht'를 기본값으로 설정
    const currencyVal = item.currency || 'baht';
    const radioBtn = document.querySelector(`input[name="edit-currency"][value="${currencyVal}"]`);
    if (radioBtn) radioBtn.checked = true;
    
    // 시간 변환
    const date = new Date(item.timestamp || Date.now());
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    document.getElementById('edit-time').value = date.toISOString().slice(0, 16);
    
    document.getElementById('edit-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('edit-modal').style.display = 'none';
    editTargetId = null;
}

function updateData() {
    const category = document.getElementById('edit-category').value;
    const content = document.getElementById('edit-content').value;
    const amount = document.getElementById('edit-amount').value;
    const timeValue = document.getElementById('edit-time').value;
    const currency = document.querySelector('input[name="edit-currency"]:checked').value;

    if (!content || !amount || !timeValue) { alert("모든 항목을 입력해주세요!"); return; }
    const newTimestamp = new Date(timeValue).getTime();

    db.ref('expenses/' + editTargetId).update({
        category: category, content: content, amount: Number(amount),
        currency: currency, timestamp: newTimestamp
    }).then(() => {
        alert("수정되었습니다.");
        closeModal();
    });
}

function deleteData(id) {
    if (confirm("정말 삭제하시겠습니까?")) { 
        db.ref('expenses/' + id).remove().then(() => { alert("삭제되었습니다."); }); 
    }
}

function exportToExcel() {
    if (currentItems.length === 0) { alert("내역이 없습니다."); return; }
    let csvContent = "\uFEFF날짜,카테고리,내용,원래금액,단위,원화환산\n";
    currentItems.forEach(item => {
        const date = new Date(item.timestamp).toLocaleString('ko-KR').replace(/,/g, '');
        const unit = (item.currency || 'baht') === 'baht' ? '฿' : '₩';
        const wonValue = (item.currency || 'baht') === 'baht' ? Math.round(item.amount * EXCHANGE_RATE) : item.amount;
        csvContent += `${date},${item.category || '기타'},${item.content},${item.amount},${unit},${wonValue}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "태국여행_가계부.csv";
    link.click();
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const area = document.getElementById('print-area');
    const btns = document.querySelectorAll('.btn-group');
    btns.forEach(b => b.style.display = 'none');
    html2canvas(area, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const margin = 10; 
        const innerWidth = pdfWidth - (margin * 2);
        const innerHeight = (canvas.height * innerWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', margin, margin, innerWidth, innerHeight);
        pdf.save("태국여행_가계부.pdf");
        btns.forEach(b => b.style.display = 'flex');
    });
}

db.ref('expenses').orderByChild('timestamp').on('value', (snapshot) => {
    const listDiv = document.getElementById('history-list');
    const totalWonSpan = document.getElementById('total-won');
    const totalBahtSub = document.getElementById('total-baht-sub');
    listDiv.innerHTML = ''; 
    let totalWonSum = 0; let totalBahtOnly = 0;
    currentItems = [];
    snapshot.forEach((childSnapshot) => {
        const val = childSnapshot.val();
        currentItems.push({ id: childSnapshot.key, ...val });
        const currency = val.currency || 'baht';
        if (currency === 'baht') { totalWonSum += (val.amount * EXCHANGE_RATE); totalBahtOnly += val.amount; }
        else { totalWonSum += val.amount; }
    });
    totalWonSpan.innerText = Math.round(totalWonSum).toLocaleString();
    totalBahtSub.innerText = `(바트 지출만 합산: ${totalBahtOnly.toLocaleString()} ฿)`;

    [...currentItems].reverse().forEach((item) => {
        const date = new Date(item.timestamp).toLocaleString('ko-KR');
        const currency = item.currency || 'baht';
        let mainDisplay = currency === 'baht' ? `${item.amount.toLocaleString()} ฿` : `${item.amount.toLocaleString()} 원`;
        let subDisplay = currency === 'baht' ? `(${Math.round(item.amount * EXCHANGE_RATE).toLocaleString()}원)` : "";
        
        listDiv.innerHTML += `
            <div class="item">
                <div class="info">
                    <div><span class="tag tag-${item.category || '기타'}">${item.category || '기타'}</span><strong>${item.content}</strong></div>
                    <span class="time">${date}</span>
                </div>
                <div class="amount-group">
                    <span class="main-amount">${mainDisplay}</span>
                    <span class="converted-amount">${subDisplay}</span>
                    <div class="btn-group">
                        <button class="edit-btn" onclick="openEditModal('${item.id}')">수정</button>
                        <button class="delete-btn" onclick="deleteData('${item.id}')">삭제</button>
                    </div>
                </div>
            </div>`;
    });
});