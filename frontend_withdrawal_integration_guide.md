# HƯỚNG DẪN TÍCH HỢP API RÚT TIỀN VỀ THẺ VISA QUA ZALOPAY (CHO FRONTEND)

Tài liệu này hướng dẫn lập trình viên Frontend tích hợp chức năng rút tiền từ Ví người dùng về thẻ Visa (qua ZaloPay) hoặc Tài khoản ngân hàng.

---

## 1. API Endpoint Rút Tiền

* **URL:** `POST /api/users/{userId}/withdraw`
* **Content-Type:** `application/json`
* **Authorization:** `Bearer <JWT_TOKEN>`

---

## 2. Cấu Trúc Request Body (JSON)

### Mẫu 1: Rút tiền về Thẻ Visa qua ZaloPay (Khuyên dùng)
```json
{
  "amount": 500000,
  "bankCode": "VISA (ZaloPay)",
  "cardNumber": "4111222233334444",
  "cardHolderName": "NGUYEN VAN A"
}
```

### Mẫu 2: Rút tiền về Thẻ Mastercard hoặc Ngân hàng khác
```json
{
  "amount": 200000,
  "bankCode": "MASTERCARD (ZaloPay)",
  "cardNumber": "5123456789012345",
  "cardHolderName": "TRAN THI B"
}
```

---

## 3. Chi Tiết Các Trường Dữ Liệu (Payload Fields)

| Trường (Field) | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `amount` | `number` / `decimal` | **Có** | Số tiền cần rút (VND). Phải lớn hơn 0 và nhỏ hơn hoặc bằng số dư khả dụng (`balance`). |
| `bankCode` | `string` | Không | Kênh rút tiền. Các giá trị gợi ý: `"VISA (ZaloPay)"`, `"MASTERCARD (ZaloPay)"`, `"BANK_TRANSFER"`. Nếu không truyền, Backend sẽ mặc định là `"VISA (ZaloPay)"`. |
| `cardNumber` | `string` | Không | Số thẻ Visa / Mastercard hoặc Số tài khoản nhận tiền. *(Có thể dùng alias `bankAccountNumber`)* |
| `cardHolderName` | `string` | Không | Tên chủ thẻ / Tên tài khoản (viết hoa không dấu, ví dụ: `NGUYEN VAN A`). *(Có thể dùng alias `bankAccountName`)* |

---

## 4. Cấu Trúc Response Trả Về

### 4.1. Thành công (HTTP 200 OK)
```json
{
  "message": "Withdrawal to Visa card via ZaloPay successful.",
  "balance": 1500000.00
}
```

### 4.2. Thất bại (HTTP 400 Bad Request)
Khi số tiền rút lớn hơn số dư khả dụng:
```json
{
  "message": "Insufficient balance."
}
```
Khi số tiền rút `<= 0`:
```json
{
  "message": "Withdrawal amount must be positive."
}
```

---

## 5. Đoạn Mã Mẫu Hướng Dẫn Tích Hợp (React / Javascript)

### 5.1. Cập nhật `src/services/api.js`
```javascript
// Trong api.payments:
withdraw: (userId, amount, extraData = {}) =>
  post(`/users/${userId}/withdraw`, {
    amount: Number(amount),
    bankCode: extraData.bankCode || "VISA (ZaloPay)",
    cardNumber: extraData.cardNumber || extraData.bankAccountNumber || "",
    cardHolderName: extraData.cardHolderName || extraData.bankAccountName || ""
  }),
```

### 5.2. Gọi API trong Component Rút Tiền (Modal)
```javascript
const handleWalletWithdraw = async (e) => {
  e.preventDefault();
  const amount = Number(withdrawAmount);

  try {
    const res = await api.payments.withdraw(user.id, amount, {
      bankCode: "VISA (ZaloPay)",
      cardNumber: withdrawCardNumber,   // ví dụ: "4111222233334444"
      cardHolderName: withdrawCardHolder // ví dụ: "NGUYEN VAN A"
    });

    alert(res.message); // "Withdrawal to Visa card via ZaloPay successful."
    // Reload lại số dư ví...
  } catch (err) {
    alert(err?.message || "Rút tiền thất bại.");
  }
};
```
