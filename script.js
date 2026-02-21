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
        document.getElementById('content').value = '';
        document.getElementById('amount').value = '';
    });
}

db.ref('expenses').orderByChild('timestamp').on('value', (snapshot) => {
    const listDiv = document.getElementById('history-list');
    const totalSpan = document.getElementById('total-amount');
    
    listDiv.innerHTML = ''; 
    let totalSum = 0;
    const data = [];

    snapshot.forEach((childSnapshot) => {
        const item = childSnapshot.val();
        data.push(item);
        totalSum += item.amount;
    });

    totalSpan.innerText = totalSum.toLocaleString();

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