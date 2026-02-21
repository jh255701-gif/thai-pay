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

let currentItems = []; // 엑셀 출력을 위해 데이터를 보관할 변수

function saveData() {
    const content = document.getElementById('content').value;
    const amount = document.getElementById('amount').value;

    if (!content || !amount) {
        alert("내용과 금액을 입력해주세요!");
        return;
    }

    const newPostRef = db.ref('expenses').push();
    newPostRef.set({
        content: content,
        amount: Number(amount),
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

// 엑셀(CSV) 내보내기 함수
function exportToExcel() {
    if (currentItems.length === 0) {
        alert("내보낼 내역이 없습니다.");
        return;
    }

    let csvContent = "\uFEFF날짜,내용,금액(Baht)\n"; // 한글 깨짐 방지 BOM 추가
    
    currentItems.forEach(item => {
        const date = new Date(item.timestamp).toLocaleString('ko-KR').replace(/,/g, '');
        csvContent += `${date},${item.content},${item.amount}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", "태국여행_가계부.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

db.ref('expenses').orderByChild('timestamp').on('value', (snapshot) => {
    const listDiv = document.getElementById('history-list');
    const totalSpan = document.getElementById('total-amount');
    
    listDiv.innerHTML = ''; 
    let totalSum = 0;
    currentItems = []; // 초기화

    snapshot.forEach((childSnapshot) => {
        const key = childSnapshot.key;
        const val = childSnapshot.val();
        currentItems.push({ id: key, ...val });
        totalSum += val.amount;
    });

    totalSpan.innerText = totalSum.toLocaleString();

    // 화면 표시용 (복사본 생성하여 뒤집기)
    const displayItems = [...currentItems].reverse();
    displayItems.forEach((item) => {
        const date = new Date(item.timestamp).toLocaleString('ko-KR');
        listDiv.innerHTML += `
            <div class="item">
                <div class="info">
                    <strong>${item.content}</strong>
                    <span class="time">${date}</span>
                </div>
                <div class="amount-group">
                    <span class="amount">${item.amount.toLocaleString()} ฿</span>
                    <button class="delete-btn" onclick="deleteData('${item.id}')">삭제</button>
                </div>
            </div>`;
    });
});