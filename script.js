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
let currentDetailItems = [];
let editTargetId = null;
let currentEditImages = []; // 현재 수정 중인 항목의 기존 사진들

function togglePhotos(btn) {
    const photoDiv = btn.nextElementSibling;
    if (photoDiv.style.display === 'flex') { photoDiv.style.display = 'none'; btn.innerHTML = '🖼️ 사진 보기'; }
    else { photoDiv.style.display = 'flex'; btn.innerHTML = '📂 사진 접기'; }
}

function resizeImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400; 
                let width = img.width; let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
        };
    });
}

// 사진 미리보기 통합 함수
function previewImages(inputId, containerId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (input.files.length > 2) { alert("사진은 최대 2장까지만 선택 가능합니다."); input.value = ''; return; }
    Array.from(input.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result; img.className = 'preview-img'; container.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

async function saveData() {
    const category = document.getElementById('category').value;
    const content = document.getElementById('content').value;
    const amount = document.getElementById('amount').value;
    const currency = document.querySelector('input[name="currency"]:checked').value;
    const imageInput = document.getElementById('image-input');
    const saveBtn = document.getElementById('save-btn');
    if (!content || !amount) { alert("내용과 금액을 입력해주세요!"); return; }
    saveBtn.disabled = true; saveBtn.innerText = "처리 중...";
    let imageUrls = [];
    try {
        if (imageInput.files.length > 0) {
            const resizePromises = Array.from(imageInput.files).map(file => resizeImage(file));
            imageUrls = await Promise.all(resizePromises);
        }
        await db.ref('expenses').push().set({ category, content, amount: Number(amount), currency, timestamp: Date.now(), imageUrls });
        alert("입력되었습니다!");
        document.getElementById('content').value = ''; document.getElementById('amount').value = '';
        document.getElementById('image-input').value = ''; document.getElementById('image-preview-container').innerHTML = '';
    } catch (e) { alert("저장 실패: " + e.message); }
    finally { saveBtn.disabled = false; saveBtn.innerText = "내역 추가"; }
}

function toggleChart() {
    const c = document.getElementById('chart-container');
    const b = document.getElementById('toggle-chart-btn');
    if (c.style.display === 'none') { c.style.display = 'block'; b.innerText = '🔼 통계 접기'; }
    else { c.style.display = 'none'; b.innerText = '📊 카테고리별 통계 보기'; document.getElementById('category-details').style.display = 'none'; }
}

function renderDetailItems() {
    const listDiv = document.getElementById('details-list');
    listDiv.innerHTML = '';
    currentDetailItems.forEach(item => {
        const originalPrice = item.currency === 'baht' ? `${item.amount.toLocaleString()}฿` : `${item.amount.toLocaleString()}원`;
        const dateStr = new Date(item.timestamp).toLocaleString('ko-KR');
        let imgHtml = ''; let btnHtml = '';
        if (item.imageUrls && item.imageUrls.length > 0) {
            btnHtml = `<button class="photo-toggle-btn" onclick="togglePhotos(this)">🖼️ 사진 보기</button>`;
            imgHtml = `<div class="item-images">` + (item.imageUrls).map(url => `<img src="${url}" class="item-img" onclick="window.open('${url}')">`).join('') + `</div>`;
        }
        listDiv.innerHTML += `
            <div class="detail-item">
                <div class="detail-main"><span class="detail-name">${item.content}</span><span class="detail-price">${item.wonValue.toLocaleString()}원 <small>(${originalPrice})</small></span></div>
                <div class="detail-time">${dateStr}</div>${btnHtml}${imgHtml}
            </div>`;
    });
}

function sortDetails(criteria) {
    if (currentDetailItems.length === 0) return;
    if (criteria === 'latest') currentDetailItems.sort((a,b) => b.timestamp - a.timestamp);
    else if (criteria === 'high') currentDetailItems.sort((a,b) => b.wonValue - a.wonValue);
    else if (criteria === 'low') currentDetailItems.sort((a,b) => a.wonValue - b.wonValue);
    renderDetailItems();
}

function showCategoryDetails(category) {
    currentDetailItems = currentItems.filter(item => (item.category || '기타') === category).map(item => ({ ...item, wonValue: (item.currency === 'baht' ? Math.round(item.amount * EXCHANGE_RATE) : item.amount) }));
    if (currentDetailItems.length === 0) return;
    currentDetailItems.sort((a,b) => b.timestamp - a.timestamp);
    let sum = 0; currentDetailItems.forEach(i => sum += i.wonValue);
    document.getElementById('details-title').innerText = `🔍 ${category} 세부 내역`;
    document.getElementById('details-total').innerText = `합계: ${sum.toLocaleString()}원`;
    renderDetailItems();
    document.getElementById('category-details').style.display = 'block';
}

function updateChart() {
    const totals = { '교통':0, '먹거리':0, '숙박':0, '관광':0, '기타':0 };
    const colors = { '교통':'#3498db', '먹거리':'#e67e22', '숙박':'#9b59b6', '관광':'#2ecc71', '기타':'#95a5a6' };
    const emojis = { '교통':'🚗', '먹거리':'🍕', '숙박':'🏨', '관광':'📸', '기타':'💡' };
    const selected = Array.from(document.querySelectorAll('.cat-filter:checked')).map(el => el.value);
    let filteredSum = 0;
    currentItems.forEach(i => {
        const won = (i.currency === 'baht' ? Math.round(i.amount * EXCHANGE_RATE) : i.amount);
        const cat = i.category || '기타';
        if (totals.hasOwnProperty(cat)) totals[cat] += won;
    });
    selected.forEach(cat => filteredSum += totals[cat]);
    document.getElementById('filtered-total-display').innerText = `선택 항목 합계: ${filteredSum.toLocaleString()}원`;
    const sorted = Object.entries(totals).filter(([c]) => selected.includes(c)).sort((a,b) => b[1]-a[1]);
    const max = Math.max(...Object.values(totals).filter((v,i) => selected.includes(Object.keys(totals)[i])), 1);
    const container = document.getElementById('chart-bars');
    container.innerHTML = '';
    sorted.forEach(([cat, total]) => {
        if (total === 0) return;
        const width = (total / max) * 100;
        const percent = filteredSum > 0 ? ((total / filteredSum) * 100).toFixed(1) : 0;
        container.innerHTML += `
            <div class="bar-row" onclick="showCategoryDetails('${cat}')">
                <div class="bar-label">${emojis[cat]} ${cat}</div>
                <div class="bar-outer"><div class="bar-inner" style="width:${width}%; background-color:${colors[cat]};"></div></div>
                <div class="bar-amount">${total.toLocaleString()}원 (${percent}%)</div>
            </div>`;
    });
}

// 수정 모달 열기 (사진 표시 로직 추가)
function openEditModal(id) {
    const item = currentItems.find(i => i.id === id); if (!item) return;
    editTargetId = id;
    document.getElementById('edit-category').value = item.category || '기타';
    document.getElementById('edit-content').value = item.content;
    document.getElementById('edit-amount').value = item.amount;
    document.querySelector(`input[name="edit-currency"][value="${item.currency || 'baht'}"]`).checked = true;
    
    const date = new Date(item.timestamp);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    document.getElementById('edit-time').value = date.toISOString().slice(0, 16);
    
    // 기존 사진 미리보기 표시
    const previewContainer = document.getElementById('edit-image-preview');
    previewContainer.innerHTML = '';
    currentEditImages = item.imageUrls || [];
    currentEditImages.forEach(url => {
        const img = document.createElement('img');
        img.src = url; img.className = 'preview-img'; previewContainer.appendChild(img);
    });

    document.getElementById('edit-image-input').value = '';
    document.getElementById('edit-modal').style.display = 'block';
}

function closeModal() { document.getElementById('edit-modal').style.display = 'none'; }

// 수정 데이터 저장 (사진 업데이트 로직 포함)
async function updateData() {
    const cat = document.getElementById('edit-category').value;
    const con = document.getElementById('edit-content').value;
    const amo = document.getElementById('edit-amount').value;
    const tim = document.getElementById('edit-time').value;
    const cur = document.querySelector('input[name="edit-currency"]:checked').value;
    const imgInput = document.getElementById('edit-image-input');
    const updateBtn = document.getElementById('update-btn');

    if (!con || !amo || !tim) return;
    updateBtn.disabled = true; updateBtn.innerText = "업데이트 중...";

    let finalImages = currentEditImages;

    try {
        // 새로 선택된 사진이 있으면 압축하여 대체
        if (imgInput.files.length > 0) {
            const resizePromises = Array.from(imgInput.files).map(file => resizeImage(file));
            finalImages = await Promise.all(resizePromises);
        }

        await db.ref('expenses/' + editTargetId).update({
            category: cat, content: con, amount: Number(amo),
            currency: cur, timestamp: new Date(tim).getTime(),
            imageUrls: finalImages
        });
        
        alert("수정되었습니다.");
        closeModal();
    } catch (e) { alert("수정 실패: " + e.message); }
    finally { updateBtn.disabled = false; updateBtn.innerText = "수정 완료"; }
}

function deleteData(id) { if (confirm("정말 삭제하시겠습니까?")) db.ref('expenses/' + id).remove(); }

function exportToExcel() {
    if (currentItems.length === 0) return;
    let csv = "\uFEFF날짜,카테고리,내용,원래금액,단위,원화환산\n";
    currentItems.forEach(i => {
        const d = new Date(i.timestamp).toLocaleString('ko-KR').replace(/,/g, '');
        const won = (i.currency === 'baht' ? Math.round(i.amount * EXCHANGE_RATE) : i.amount);
        csv += `${d},${i.category || '기타'},${i.content},${i.amount},${i.currency === 'baht' ? '฿' : '₩'},${won}\n`;
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = "태국여행_가계부.csv"; link.click();
}

db.ref('expenses').orderByChild('timestamp').on('value', (s) => {
    const listDiv = document.getElementById('history-list');
    const tw = document.getElementById('total-won');
    const ts = document.getElementById('total-baht-sub');
    listDiv.innerHTML = ''; let sumW = 0; let sumB = 0; currentItems = [];
    s.forEach(c => {
        const v = c.val(); currentItems.push({ id: c.key, ...v });
        if (v.currency === 'baht') { sumW += (v.amount * EXCHANGE_RATE); sumB += v.amount; }
        else sumW += v.amount;
    });
    tw.innerText = Math.round(sumW).toLocaleString(); ts.innerText = `(바트 지출만 합산: ${sumB.toLocaleString()} ฿)`;
    updateChart();
    [...currentItems].reverse().forEach(i => {
        const d = new Date(i.timestamp).toLocaleString('ko-KR');
        const main = i.currency === 'baht' ? `${i.amount.toLocaleString()} ฿` : `${i.amount.toLocaleString()} 원`;
        const sub = i.currency === 'baht' ? `(${Math.round(i.amount * EXCHANGE_RATE).toLocaleString()}원)` : "";
        let imgHtml = ''; let btnHtml = '';
        if (i.imageUrls && i.imageUrls.length > 0) {
            btnHtml = `<button class="photo-toggle-btn" onclick="togglePhotos(this)">🖼️ 사진 보기</button>`;
            imgHtml = `<div class="item-images">` + (i.imageUrls).map(url => `<img src="${url}" class="item-img" onclick="window.open('${url}')">`).join('') + `</div>`;
        }
        listDiv.innerHTML += `
            <div class="item"><div class="info"><div><span class="tag tag-${i.category || '기타'}">${i.category || '기타'}</span><strong>${i.content}</strong></div><span class="time">${d}</span>${btnHtml}${imgHtml}</div>
            <div class="amount-group"><span class="main-amount">${main}</span><span class="converted-amount">${sub}</span>
            <div class="btn-group"><button class="edit-btn" onclick="openEditModal('${i.id}')">수정</button><button class="delete-btn" onclick="deleteData('${i.id}')">삭제</button></div></div></div>`;
    });
});