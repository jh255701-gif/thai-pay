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

// 데이터 저장 함수
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

// 데이터 삭제 함수
function deleteData(id) {
    if (confirm("정말 삭제하시겠습니까?")) {
        db.ref('expenses/' + id).remove()
        .then(() => {
            alert("삭제되었습니다.");
        })
        .catch((error) => {
            alert("삭제 실패: " + error.message);
        });
    }
}

// 데이터 불러오기 및 실시간 업데이트
db.ref('expenses').orderByChild('timestamp').on('value', (snapshot) => {
    const listDiv = document.getElementById('history-list');
    const totalSpan = document.getElementById('total-amount');
    
    listDiv.innerHTML = ''; 
    let totalSum = 0;
    const items = [];

    // 데이터를 배열에 담으면서 총액 계산
    snapshot.forEach((childSnapshot) => {
        const key = childSnapshot.key; // 데이터의 고유 ID
        const val = childSnapshot.val();
        items.push({ id: key, ...val });
        totalSum += val.amount;
    });

    totalSpan.innerText = totalSum.toLocaleString();

    // 최신순 정렬 후 화면 표시
    items.reverse().forEach((item) => {
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
            </div>
        `;
    });
});