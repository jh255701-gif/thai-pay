// 본인의 Firebase 설정값 적용 완료
const firebaseConfig = {
    apiKey: "AIzaSyBnh9Ij0qZ7KMUyXVQoJmGxuhoeeq2lTos",
    authDomain: "thai-feee6.firebaseapp.com",
    databaseURL: "https://thai-feee6-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "thai-feee6",
    storageBucket: "thai-feee6.firebasestorage.app",
    messagingSenderId: "632113518491",
    appId: "1:632113518491:web:4bbc9416b08f2a42d6333e"
};

// Firebase 초기화 (호환 모드)
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

    // 데이터베이스에 저장
    const newPostRef = db.ref('expenses').push();
    newPostRef.set({
        content: content,
        amount: Number(amount),
        timestamp: Date.now()
    }).then(() => {
        // 입력창 비우기
        document.getElementById('content').value = '';
        document.getElementById('amount').value = '';
    });
}

// 실시간 내역 불러오기 (최신순)
db.ref('expenses').orderByChild('timestamp').on('value', (snapshot) => {
    const listDiv = document.getElementById('history-list');
    listDiv.innerHTML = ''; 

    const data = [];
    snapshot.forEach((childSnapshot) => {
        data.push(childSnapshot.val());
    });

    // 최신순 정렬
    data.reverse().forEach((item) => {
        const date = new Date(item.timestamp).toLocaleString('ko-KR');
        
        listDiv.innerHTML += `
            <div class="item">
                <div class="info">
                    <strong>${item.content}</strong>
                    <span class="time">${date}</span>
                </div>
                <div class="amount">${item.amount.toLocaleString()} ฿</div>
            </div>
        `;
    });
});