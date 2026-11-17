# API Contract — AI Legal Assistant for Citizens (আইনি সহায়ক)

Frontend-to-Backend Interface Specification.
Matches the Python FastAPI / RAG module integration.

---

## 1. Authentication & Identity
```http
POST /auth/login
Content-Type: application/json
Body: { "email": "user@example.com", "password": "..." }
Response: { "user": User, "token": "jwt_token_string" }

POST /auth/register/citizen
Content-Type: application/json
Body: { "name": "Tahrim Araha", "email": "...", "phone": "...", "district": "Dhaka" }
Response: { "user": User, "token": "jwt_token_string" }

POST /auth/register/lawyer
Content-Type: application/json
Body: {
  "fullName": "...",
  "email": "...",
  "phone": "...",
  "district": "...",
  "barEnrolmentNo": "BC/DH/2014/9201",
  "enrolmentYear": 2014,
  "practiceAreas": ["Family Law", "Cyber Security"],
  "startingFeeBdt": 800,
  "bio": "..."
}
Response: { "user": User, "lawyerProfile": LawyerProfile, "token": "..." }

GET /auth/me
Headers: Authorization: Bearer <token>
Response: User

POST /auth/verify-email
Body: { "code": "123456" }
Response: { "ok": true }

POST /auth/forgot-password
Body: { "email": "user@example.com" }
Response: { "ok": true }
```

---

## 2. Statutes & Vector Grounding
```http
GET /statutes
Response: Statute[]

GET /statutes/:slug
Response: Statute & { sections: StatuteSection[] }

GET /glossary?q=searchTerm
Response: GlossaryTerm[]
```

---

## 3. Chat & AI Q&A (Grounding Engine)
```http
GET /conversations
Response: Conversation[]

GET /conversations/:id
Response: Conversation & { messages: Message[] }

POST /chat
Content-Type: application/json
Body: { "question": "আমার বাড়িওয়ালা নোটিশ ছাড়া ভাড়া বাড়িয়েছে...", "conversationId"?: "conv-1" }
Response: (Streamed SSE or chunked JSON)
{
  "message": {
    "id": "msg-...",
    "role": "assistant",
    "bodyBn": "...",
    "bodyEn": "...",
    "citations": [
      {
        "id": "rent-18",
        "statuteId": "rent-control-1991",
        "labelBn": "বাড়ী ভাড়া নিয়ন্ত্রণ আইন ১৯৯১ · ধারা ১৮",
        "labelEn": "House Rent Control Act 1991 · Section 18",
        "section": "১৮",
        "textBn": "...",
        "textEn": "...",
        "matchBn": "...",
        "matchEn": "...",
        "score": 0.94
      }
    ],
    "createdAt": "2025-05-12T14:31:00Z"
  },
  "conversationId": "conv-1"
}

POST /messages/:id/feedback
Body: { "value": "up" | "down" | "flag", "reason"?: "..." }
Response: { "ok": true }

DELETE /conversations/:id
Response: { "ok": true }
```

---

## 4. Lawyer Directory & Verification Ladder
```http
GET /lawyers?area=&district=&verifiedOnly=&maxFee=
Response: LawyerProfile[]

GET /lawyers/:id
Response: LawyerProfile & { reviews: Review[] }

PATCH /lawyers/me
Body: Partial<LawyerProfile>
Response: LawyerProfile

POST /verifications
Body: {
  "conversationId": "conv-1",
  "messageId": "msg-1",
  "questionText": "...",
  "answerText": "...",
  "citations": Citation[],
  "urgency": "normal" | "urgent"
}
Response: VerificationRequest

GET /verifications
Response: VerificationRequest[]

GET /verifications/:id
Response: VerificationRequest & { verdict?: VerificationVerdict }

POST /verifications/:id/claim
Body: { "lawyerId": "...", "lawyerName": "..." }
Response: VerificationRequest

POST /verifications/:id/verdict
Body: {
  "lawyerId": "...",
  "lawyerName": "...",
  "verdict": "accurate" | "incomplete" | "needs_correction" | "incorrect",
  "correctedExplanationBn": "...",
  "correctedExplanationEn": "...",
  "addedStatuteCitations": string[],
  "disputedStatuteCitations": string[],
  "noteToCitizenBn": "...",
  "noteToCitizenEn": "...",
  "minutesSpent": 20
}
Response: VerificationVerdict
```

---

## 5. Consultations & Client Messaging
```http
POST /consultations
Body: {
  "lawyerId": "lawyer-3",
  "topic": "...",
  "description": "...",
  "mode": "chat" | "audio" | "video" | "in_person",
  "feeBdt": 1200,
  "slots": [{ "date": "2025-05-18", "time": "16:00" }],
  "attachments": [{ "name": "...", "size": "...", "url": "..." }]
}
Response: ConsultationRequest

GET /consultations
Response: ConsultationRequest[]

GET /consultations/:id
Response: ConsultationRequest

POST /consultations/:id/accept
Body: { "slot"?: { "date": "...", "time": "..." } }
Response: ConsultationRequest

POST /consultations/:id/decline
Body: { "reason": "Conflict of interest" }
Response: ConsultationRequest

POST /consultations/:id/complete
Body: { "privateNotes"?: "..." }
Response: ConsultationRequest

POST /consultations/:id/review
Body: { "rating": 5, "text": "..." }
Response: { "ok": true }

GET /threads
Response: Thread[]

GET /threads/:id
Response: Thread & { messages: ThreadMessage[] }

POST /threads/:id/messages
Body: { "text": "...", "senderRole": "citizen" | "lawyer" }
Response: Thread
```

---

## 6. Document Drafting Wizard
```http
GET /draft/templates
Response: DraftTemplate[]

GET /draft/templates/:slug
Response: DraftTemplate

GET /documents
Response: DraftDocument[]

POST /documents
Body: { "templateId": "...", "title": "...", "answers": { ... } }
Response: DraftDocument

GET /documents/:id
Response: DraftDocument
```

---

## 7. Admin Console
```http
GET /admin/stats
Response: AdminStats

GET /admin/lawyers
Response: LawyerProfile[]

POST /admin/lawyers/:id/approve
Response: LawyerProfile

POST /admin/lawyers/:id/reject
Body: { "reason": "..." }
Response: LawyerProfile

GET /admin/corpus
Response: CorpusDocument[]

POST /admin/corpus/upload
Multipart file upload: { file, statuteId }
Response: CorpusDocument

POST /admin/corpus/reindex
Response: { "ok": true, "message": "Index rebuilt" }

GET /admin/flags
Response: FlaggedAnswer[]

POST /admin/flags/:id/resolve
Body: { "action": "dismiss" | "escalate" | "corpus_issue" }
Response: { "ok": true }
```
