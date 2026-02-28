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
        document.getElementById('category').value = '기타';
    });
}

function toggleChart() {
    const container = document.getElementById('chart-container');
    const btn = document.getElementById('toggle-chart-btn');
    if (container.style.display === 'none') {
        container.style.display = 'block';
        btn.innerText = '🔼 통계 접기';
    } else {
        container.style.display = 'none';
        btn.innerText = '📊 카테고리별 통계 보기';
        document.getElementById('category-details').style.display = 'none';
    }
}

// ★ 세부 내역 보기 함수 (시간 표시 추가) ★
function showCategoryDetails(category) {
    const detailsDiv = document.getElementById('category-details');
    const listDiv = document.getElementById('details-list');
    const title = document.getElementById('details-title');

    const filtered = currentItems.filter(item => (item.category || '기타') === category)
        .map(item => ({
            ...item,
            wonValue: (item.currency || 'baht') === 'baht' ? Math.round(item.amount * EXCHANGE_RATE) : item.amount
        }))
        .sort((a, b) => b.wonValue - a.wonValue);

    if (filtered.length === 0) return;

    title.innerText = `🔍 ${category} 세부 내역 (고액순)`;
    listDiv.innerHTML = '';
    
    filtered.forEach(item => {
        const originalPrice = item.currency === 'baht' ? `${item.amount.toLocaleString()}฿` : `${item.amount.toLocaleString()}원`;
        // 타임스탬프를 읽기 쉬운 날짜와 시간으로 변환
        const dateStr = new Date(item.timestamp).toLocaleString('ko-KR');
        
        listDiv.innerHTML += `
            <div class="detail-item">
                <div class="detail-main">
                    <span class="detail-name">${item.content}</span>
                    <span class="detail-price">${item.wonValue.toLocaleString()}원 <small>(${originalPrice})</small></span>
                </div>
                <div class="detail-time">${dateStr}</div> </div>`;
    });

    detailsDiv.style.display = 'block';
}

function updateChart() {
    const categoryTotals = { '교통': 0, '먹거리': 0, '숙박': 0, '관광': 0, '기타': 0 };
    const colors = { '교통': '#3498db', '먹거리': '#e67e22', '숙박': '#9b59b6', '관광': '#2ecc71', '기타': '#95a5a6' };
    const emojis = { '교통': '🚗', '먹거리': '🍕', '숙박': '🏨', '관광': '📸', '기타': '💡' };

    const selectedCats = Array.from(document.querySelectorAll('.cat-filter:checked')).map(el => el.value);
    let filteredGrandTotal = 0;

    currentItems.forEach(item => {
        const wonValue = (item.currency || 'baht') === 'baht' ? Math.round(item.amount * EXCHANGE_RATE) : item.amount;
        const cat = item.category || '기타';
        if (categoryTotals.hasOwnProperty(cat)) { 
            categoryTotals[cat] += wonValue;
        }
    });

    selectedCats.forEach(cat => { filteredGrandTotal += categoryTotals[cat]; });

    const sortedCategories = Object.entries(categoryTotals)
        .filter(([cat]) => selectedCats.includes(cat))
        .sort((a, b) => b[1] - a[1]);

    const maxCategoryTotal = Math.max(...Object.values(categoryTotals).filter((v, i) => selectedCats.includes(Object.keys(categoryTotals)[i])), 1);

    const barsContainer = document.getElementById('chart-bars');
    barsContainer.innerHTML = '';
    
    sortedCategories.forEach(([category, total]) => {
        if (total === 0) return;
        const barWidth = (total / maxCategoryTotal) * 100;
        const sharePercent = filteredGrandTotal > 0 ? ((total / filteredGrandTotal) * 100).toFixed(1) : 0;
        
        barsContainer.innerHTML += `
            <div class="bar-row" onclick="showCategoryDetails('${category}')">
                <div class="bar-label">${emojis[category]} ${category}</div>
                <div class="bar-outer">
                    <div class="bar-inner" style="width: ${barWidth}%; background-color: ${colors[category]};"></div>
                </div>
                <div class="bar-amount">${total.toLocaleString()}원 (${sharePercent}%)</div>
            </div>`;
    });
}

function openEditModal(id) {
    const item = currentItems.find(i => i.id === id);
    if (!item) return;
    editTargetId = id;
    document.getElementById('edit-category').value = item.category || '기타';
    document.getElementById('edit-content').value = item.content || '';
    document.getElementById('edit-amount').value = item.amount || 0;
    const currencyVal = item.currency || 'baht';
    const radioBtn = document.querySelector(`input[name="edit-currency"][value="${currencyVal}"]`);
    if (radioBtn) radioBtn.checked = true;
    const date = new Date(item.timestamp || Date.now());
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    document.getElementById('edit-time').value = date.toISOString().slice(0, 16);
    document.getElementById('edit-modal').style.display = 'block';
}

function closeModal() { document.getElementById('edit-modal').style.display = 'none'; editTargetId = null; }

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
    }).then(() => { alert("수정되었습니다."); closeModal(); });
}

function deleteData(id) {
    if (confirm("정말 삭제하시겠습니까?")) { db.ref('expenses/' + id).remove().then(() => { alert("삭제되었습니다."); }); }
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
    
    updateChart(); 

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