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

function saveData() {
    const content = document.getElementById('content').value;
    const amount = document.getElementById('amount').value;
    const currency = document.querySelector('input[name="currency"]:checked').value;

    if (!content || !amount) { alert("내용과 금액을 입력해주세요!"); return; }
    
    db.ref('expenses').push().set({
        content: content,
        amount: Number(amount),
        currency: currency, // baht 또는 won 저장
        timestamp: Date.now()
    }).then(() => { 
        alert("입력되었습니다!"); 
        document.getElementById('content').value = ''; 
        document.getElementById('amount').value = ''; 
    });
}

function deleteData(id) {
    if (confirm("정말 삭제하시겠습니까?")) { 
        db.ref('expenses/' + id).remove().then(() => { alert("삭제되었습니다."); }); 
    }
}

function exportToExcel() {
    if (currentItems.length === 0) { alert("내역이 없습니다."); return; }
    let csvContent = "\uFEFF날짜,내용,원래금액,단위,원화환산\n";
    currentItems.forEach(item => {
        const date = new Date(item.timestamp).toLocaleString('ko-KR').replace(/,/g, '');
        const unit = item.currency === 'baht' ? '฿' : '₩';
        const wonValue = item.currency === 'baht' ? Math.round(item.amount * EXCHANGE_RATE) : item.amount;
        csvContent += `${date},${item.content},${item.amount},${unit},${wonValue}\n`;
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
    const delBtns = document.querySelectorAll('.delete-btn');
    delBtns.forEach(btn => btn.style.display = 'none');

    html2canvas(area, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const margin = 10; 
        const innerWidth = pdfWidth - (margin * 2);
        const innerHeight = (canvas.height * innerWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', margin, margin, innerWidth, innerHeight);
        pdf.save("태국여행_가계부.pdf");
        delBtns.forEach(btn => btn.style.display = 'block');
    });
}

db.ref('expenses').orderByChild('timestamp').on('value', (snapshot) => {
    const listDiv = document.getElementById('history-list');
    const totalWonSpan = document.getElementById('total-won');
    const totalBahtSub = document.getElementById('total-baht-sub');
    
    listDiv.innerHTML = ''; 
    let totalWonSum = 0;
    let totalBahtOnly = 0;
    currentItems = [];

    snapshot.forEach((childSnapshot) => {
        const val = childSnapshot.val();
        currentItems.push({ id: childSnapshot.key, ...val });
        
        if (val.currency === 'baht') {
            totalWonSum += (val.amount * EXCHANGE_RATE);
            totalBahtOnly += val.amount;
        } else {
            totalWonSum += val.amount;
        }
    });

    totalWonSpan.innerText = Math.round(totalWonSum).toLocaleString();
    totalBahtSub.innerText = `(바트 지출만 합산: ${totalBahtOnly.toLocaleString()} ฿)`;

    [...currentItems].reverse().forEach((item) => {
        const date = new Date(item.timestamp).toLocaleString('ko-KR');
        let mainDisplay = "";
        let subDisplay = "";

        if (item.currency === 'baht') {
            mainDisplay = `${item.amount.toLocaleString()} ฿`;
            subDisplay = `(${Math.round(item.amount * EXCHANGE_RATE).toLocaleString()}원)`;
        } else {
            mainDisplay = `${item.amount.toLocaleString()} 원`;
            subDisplay = ""; // 원화 입력 시 별도 환산 불필요
        }
        
        listDiv.innerHTML += `
            <div class="item">
                <div class="info"><strong>${item.content}</strong><span class="time">${date}</span></div>
                <div class="amount-group">
                    <span class="main-amount">${mainDisplay}</span>
                    <span class="converted-amount">${subDisplay}</span>
                    <button class="delete-btn" onclick="deleteData('${item.id}')">삭제</button>
                </div>
            </div>`;
    });
});