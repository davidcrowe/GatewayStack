# Three-Party Problem

## Two Directions, Same Problem

The Three-Party Problem manifests in two critical ways:

1. **Enterprises controlling model access** (user → backend → LLM)  
   *"Only doctors can use medical models"*

2. **Users accessing their own data** (user → LLM → backend)  
   *"Show me MY calendar, not everyone's"*

Both require the same solution: **cryptographic user identity on every request**.

### Direction 1: Enterprises controlling who can use which models and tools
*"How do I ensure only **licensed doctors** use medical models, only **analysts** access financial data, and **contractors** can't send sensitive prompts?"*

> user → backend → LLM

**Without Gatewaystack:**
```typescript
app.post('/chat', async (req, res) => {
  const { model, prompt } = req.body;
  const response = await openai.chat.completions.create({
    model, // Anyone can use gpt-4-medical
    messages: [{ role: 'user', content: prompt }]
  });
  res.json(response);
});
```

**With Gatewaystack:**
```typescript
app.post('/chat', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role']; // "doctor", "analyst", etc.
  const userScopes = req.headers['x-user-scopes']?.split(' ') || [];
  
  // Gateway already enforced: only doctors with medical:write can reach here
  const response = await openai.chat.completions.create({
    model: req.body.model,
    messages: [{ role: 'user', content: req.body.prompt }],
    user: userId // OpenAI audit trail
  });
  res.json(response);
});
```

**Gateway policy:**
```json
{
  "gpt-4-medical": {
    "requiredRoles": ["doctor", "physician_assistant"],
    "requiredScopes": ["medical:write"]
  }
}
```

The gateway enforces role + scope checks **before** forwarding to your backend. If a nurse tries to use `gpt-4-medical`, they get `403 Forbidden`.


```
    USER                    BACKEND                    LLM
  (Doctor)              (Your API)              (OpenAI/Claude)
     │                       │                         │
     │  "Use medical model"  │                         │
     ├──────────────────────►│                         │
     │                       │   Shared API Key        │
     │                       ├────────────────────────►│
     │                       │                         │
     │                       │ ❌ No identity proof    │
     │                       │ ❌ Can't verify role    │
     │                       │ ❌ Anyone can access    │
     │                       │                         │
     │                       │◄────────────────────────┤
     │◄──────────────────────┤      Response           │
     │                       │                         │
```

**Problem:** Backend can't enforce "only doctors use medical models"


```
    USER              GATEWAYSTACK           BACKEND           LLM
  (Doctor)           (Identity +          (Your API)      (OpenAI/
                      Policy Layer)                        Claude)
     │                    │                   │               │
     │  OAuth token       │                   │               │
     ├───────────────────►│                   │               │
     │                    │                   │               │
     │                    │ ✓ Verify identity │               │
     │                    │ ✓ Check role      │               │
     │                    │ ✓ Check scopes    │               │
     │                    │                   │               │
     │                    │ X-User-Id: 123    │               │
     │                    │ X-Role: doctor    │               │
     │                    ├──────────────────►│               │
     │                    │                   │               │
     │                    │                   │ Verified ID   │
     │                    │                   ├──────────────►│
     │                    │                   │               │
     │                    │                   │◄──────────────┤
     │                    │◄──────────────────┤   Response    │
     │◄───────────────────┤                   │               │
     │                    │                   │               │
```

**Result:** ✅ Role-based access enforced  
✅ Audit trail: "Dr. Smith used gpt-4-medical at 2:15pm"

---

### Direction 2: Users accessing their own data via AI
*"How do I let ChatGPT read **my** calendar without exposing **everyone's** calendar?"*

> user → LLM → backend

**Without Gatewaystack:**
```typescript
app.get('/calendar', async (_req, res) => {
  const events = await getAllEvents(); // Everyone sees everything
  res.json(events);
});
```

**With Gatewaystack:**
```typescript
app.get('/calendar', async (req, res) => {
  const userId = req.headers['x-user-id']; // Verified by gateway
  const events = await getUserEvents(userId);
  res.json(events);
});
```

The gateway validates the OAuth token, extracts the user identity, and injects `X-User-Id` — so your backend can safely filter data per-user.

---

### Why Both Directions Matter
Attaching a cryptographically confirmed user identity to a shared request context is the key that makes request level governance possible:

**Without solving the Three-Party Problem, you can't:**
- Filter data per-user (Direction 1: everyone sees everything)
- Enforce "who can use which models" (Direction 2: no role-based access)
- Audit "who did what" (compliance impossible)
- Rate limit per-user (shared quotas get exhausted)
- Attribute costs (can't charge back to teams/users)

**Gatewaystack solves both** by binding cryptographic user identity to every AI request:

* OAuth login per user (RS256 JWT, cryptographic identity proof)
* Per-user / per-tenant data isolation by default
* Deny-by-default authorization (scopes per tool/model/role)
* Immutable audit trails (who, what, when, which model)
* Rate limits & spend caps (per user/team/org)
* Drop-in between AI clients and your backend (no SDK changes)

Gatewaystack is composed of modular packages that can run **standalone** or as a cohesive **six-layer pipeline** for complete AI governance.

```
    USER                    LLM                     BACKEND
  (Alice)              (ChatGPT)               (Calendar API)
     │                      │                         │
     │ "Show my calendar"   │                         │
     ├─────────────────────►│                         │
     │                      │                         │
     │  (Alice logged in    │   GET /calendar         │
     │   to ChatGPT)        │   Shared API Key        │
     │                      ├────────────────────────►│
     │                      │                         │
     │                      │ ❌ No user identity     │
     │                      │ ❌ Can't filter         │
     │                      │                         │
     │                      │◄────────────────────────┤
     │                      │  Returns EVERYONE's     │
     │                      │  calendar events!       │
     │◄─────────────────────┤                         │
     │  Shows all events    │                         │
```

**Problem:** Backend returns everyone's data (data leakage)


```
    USER                    LLM              GATEWAYSTACK      BACKEND
  (Alice)              (ChatGPT)           (Identity         (Calendar
                                            Injection)         API)
     │                      │                    │               │
     │ "Show my calendar"   │                    │               │
     ├─────────────────────►│                    │               │
     │                      │                    │               │
     │  (Alice logged in    │  OAuth token       │               │
     │   to ChatGPT)        │  for Alice         │               │
     │                      ├───────────────────►│               │
     │                      │                    │               │
     │                      │                    │ ✓ Verify      │
     │                      │                    │   Alice's ID  │
     │                      │                    │               │
     │                      │                    │ GET /calendar │
     │                      │                    │ X-User-Id:    │
     │                      │                    │   alice_123   │
     │                      │                    ├──────────────►│
     │                      │                    │               │
     │                      │                    │               │ filter by
     │                      │                    │               │ alice_123
     │                      │                    │◄──────────────┤
     │                      │◄───────────────────┤ Alice's       │
     │◄─────────────────────┤  events only       │ events only   │
     │  Shows only          │                    │               │
     │  Alice's events      │                    │               │
```

**Result:** ✅ Per-user data filtering  
✅ Cryptographically verified identity  
✅ Audit trail: "Alice accessed her calendar via ChatGPT"