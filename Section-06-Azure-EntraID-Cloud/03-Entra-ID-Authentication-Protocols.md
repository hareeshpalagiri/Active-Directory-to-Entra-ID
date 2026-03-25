# Section 6.3 — Entra ID Authentication Protocols

## 🎯 Overview

Entra ID uses modern, cloud-native authentication protocols:

| Protocol | Use Case | Security |
|----------|----------|----------|
| **OAuth 2.0** | Authorization (app accessing resources) | Token-based |
| **OpenID Connect (OIDC)** | Authentication + basic user info | Token-based |
| **SAML 2.0** | Legacy enterprise SSO | XML-based assertion |
| **Passwordless** | MFA-less, phishing-resistant auth | Public key crypto |

This is **very different** from on-prem AD (Kerberos/NTLM). Those protocols are LAN-centric; Entra ID protocols are **internet-scale**.

---

## 🔐 OAuth 2.0 in Entra ID

OAuth 2.0 is the **authorization framework** — it answers: *"What resources can this app access on behalf of the user?"*

### OAuth 2.0 Authorization Code Flow (Most Common)

Used by web apps, desktop apps, mobile apps:

```
┌─────────────┐
│   User      │
│  (Browser)  │
└────────┬────┘
         │
    1.   │ Clicks "Login with Microsoft"
         ↓
    ┌────────────────────┐
    │   Client App       │
    │   (Salesforce)     │
    └────────┬───────────┘
             │
    2.       │ Redirects to Entra ID with:
             │ • client_id (app identifier)
             │ • scope (permissions needed)
             │ • redirect_uri (where to send code)
             │ • state (CSRF token)
             ↓
    ┌────────────────────────────┐
    │   Entra ID Login Page      │
    └────────┬───────────────────┘
             │
    3.       │ User enters credentials
             │ (Username, password, MFA)
             ↓
    ┌────────────────────────────┐
    │   Entra ID Validates       │
    │   Issues authorization     │
    │   code (short-lived, 1 min)│
    └────────┬───────────────────┘
             │
    4.       │ Redirects back to app with code
             │ ?code=ABC123&state=xyz
             ↓
    ┌────────────────────┐
    │   Client App       │
    │   (Backend)        │
    └────────┬───────────┘
             │
    5.       │ Server-to-server exchange
             │ POST to Entra ID token endpoint:
             │ • code=ABC123
             │ • client_id
             │ • client_secret (stored securely)
             │ • grant_type=authorization_code
             ↓
    ┌────────────────────────────┐
    │   Entra ID Token Endpoint  │
    │   Validates code           │
    │   Validates client_secret  │
    │   Issues tokens            │
    └────────┬───────────────────┘
             │
    6.       │ Returns:
             │ {
             │   "access_token": "eyJhbG...",
             │   "token_type": "Bearer",
             │   "expires_in": 3600,
             │   "refresh_token": "AwABb..."
             │ }
             ↓
    ┌────────────────────┐
    │   Client App       │
    │   (Backend)        │
    │   Stores tokens    │
    └────────┬───────────┘
             │
    7.       │ Uses access_token to call
             │ Microsoft Graph API
             │ GET /me
             │ Authorization: Bearer {access_token}
             ↓
    ┌────────────────────────┐
    │   Microsoft Graph      │
    │   Returns user info    │
    └────────┬───────────────┘
             │
    8.       │ App creates session
             │ User logged in!
```

### OAuth 2.0 Implicit Flow (Deprecated)

Older pattern for browser-based apps:

```
User → App → Entra ID → Token returned directly to browser
(SECURITY ISSUE: Token exposed in URL history)
```

**Microsoft is phasing this out** — use Authorization Code + PKCE instead.

### OAuth 2.0 Client Credentials Flow

For service-to-service (no user involved):

```
┌──────────────┐
│  Your API    │
│  (Backend)   │
└──────┬───────┘
       │
       │ Needs to call Graph API
       │ No user interaction
       ↓
┌──────────────────────────┐
│  Entra ID                │
│  Validates credentials:  │
│  • client_id             │
│  • client_secret         │
│  (no user_id involved)   │
└──────┬───────────────────┘
       │
       ↓ Issues access token
       │
┌──────────────┐
│  Graph API   │
│  Returns data│
```

**Use case**: Background jobs, integrations, scheduled tasks

---

## 🆔 OpenID Connect (OIDC)

OIDC = **OAuth 2.0 + identity layer**

OAuth tells you *what you can access*, OIDC tells you *who you are*.

### Key Difference: ID Token

```
OAuth 2.0:
{
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 3600
}

OIDC:
{
  "access_token": "eyJhbG...",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### ID Token Claims (JWT Decoded)

```json
{
  "iss": "https://login.microsoftonline.com/{tenant_id}/v2.0",
  "aud": "{client_id}",
  "iat": 1516239022,
  "exp": 1516242622,
  "sub": "user_object_id",
  "name": "Alice Johnson",
  "email": "alice@contoso.onmicrosoft.com",
  "preferred_username": "alice@contoso.com",
  "oid": "12345678-1234-1234-1234-123456789012",
  "tid": "87654321-4321-4321-4321-210987654321",
  "nonce": "n-0S6_WzA2Mj"
}
```

### OIDC Discovery

Apps can dynamically discover Entra ID's capabilities:

```
GET https://login.microsoftonline.com/{tenant_id}/.well-known/openid-configuration

Response:
{
  "authorization_endpoint": "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize",
  "token_endpoint": "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
  "userinfo_endpoint": "https://graph.microsoft.com/oidc/userinfo",
  "jwks_uri": "https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys",
  ...
}
```

---

## 🔒 SAML 2.0 (Legacy Enterprise SSO)

SAML (Security Assertion Markup Language) is XML-based, used for legacy enterprise integrations.

### SAML Assertion (XML)

```xml
<saml:Assertion IssueInstant="2024-03-24T10:30:00Z" Version="2.0">
  <saml:Issuer>https://login.microsoftonline.com/{tenant}/</saml:Issuer>
  
  <saml:Subject>
    <saml:NameID>alice@contoso.onmicrosoft.com</saml:NameID>
  </saml:Subject>
  
  <saml:Conditions NotBefore="..." NotOnOrAfter="...">
    <saml:AudienceRestriction>
      <saml:Audience>https://salesforce.com</saml:Audience>
    </saml:AudienceRestriction>
  </saml:Conditions>
  
  <saml:AuthnStatement>
    <saml:AuthnContext>
      <saml:AuthnContextClassRef>
        urn:oasis:names:tc:SAML:2.0:ac:classes:Password
      </saml:AuthnContextClassRef>
    </saml:AuthnContext>
  </saml:AuthnStatement>
  
  <saml:AttributeStatement>
    <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress">
      <saml:AttributeValue>alice@contoso.com</saml:AttributeValue>
    </saml:Attribute>
    <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname">
      <saml:AttributeValue>Alice</saml:AttributeValue>
    </saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>
```

### SAML Flow

```
1. User visits Salesforce
   ↓
2. Salesforce: "I don't know you"
   ↓
3. Salesforce redirects to Entra ID
   ↓
4. Entra ID authenticates user
   ↓
5. Entra ID creates XML assertion (shown above)
   ↓
6. Entra ID POSTs assertion back to Salesforce
   ↓
7. Salesforce validates signature, creates session
   ↓
8. User logged in!
```

### SAML vs OAuth/OIDC

| Aspect | SAML | OAuth 2.0 / OIDC |
|--------|------|-----------------|
| **Format** | XML | JSON (JWT) |
| **Primary use** | Authentication | Authorization (OAuth) / Auth + Identity (OIDC) |
| **Protocol** | Request-Response via HTTP POST | Request-Response via HTTP Redirect |
| **Token storage** | Session cookie | Browser localStorage / httpOnly cookie |
| **Security** | XML signature, encryption | JWT signature (RS256) |
| **Complexity** | High (XML parsing, encryption) | Lower (JSON simpler) |
| **Use in 2024** | Legacy, phasing out | Modern standard |

---

## 🔑 Passwordless Authentication

Entra ID supports multiple passwordless methods:

### 1. **Windows Hello for Business (WHfB)**

Biometric or PIN-based, replaces passwords on Windows 10/11:

```
┌──────────────────┐
│  Windows 10 PC   │
│  (Facial / PIN)  │
└────────┬─────────┘
         │
         │ User's face/fingerprint/PIN
         ↓
    ┌──────────────┐
    │  Local auth  │
    │  (TPM chip)  │
    └────────┬─────┘
             │
             │ Unlocks private key
             ↓
    ┌──────────────────┐
    │  Sign request    │
    │  with private key│
    └────────┬─────────┘
             │
             ↓ (Cert-based auth)
    ┌──────────────────┐
    │  Entra ID        │
    │  Verifies cert   │
    │  ✓ Authenticated │
    └──────────────────┘
```

**Security**: Phishing-resistant (uses cert, not password)

### 2. **Microsoft Authenticator App (Phone Sign-in)**

Push notification approval on phone:

```
User tries to log in (no password)
   ↓
Entra ID: "Send approval request to phone"
   ↓
User's phone: "Approve login? [Yes] [No]"
   ↓
User taps Yes
   ↓
App sends approval to Entra ID
   ↓
✓ Login approved
```

**Security**: Phone is second factor, hard to phish

### 3. **FIDO2 Security Keys**

Hardware keys (YubiKey, Titan):

```
User inserts USB security key
   ↓
Website/App challenges key
   ↓
User touches key (or enters PIN)
   ↓
Key signs challenge with private key
   ↓
Response sent back
   ↓
✓ Authentication complete
```

**Security**: Most phishing-resistant (no password, needs physical key)

### 4. **Temporary Access Pass (TAP)**

One-time code (5-6 digits):

```
User receives TAP (via admin email or SMS)
   ↓
User tries to log in
   ↓
Enters username + TAP
   ↓
Entra ID validates
   ↓
✓ Logged in
```

**Use**: Onboarding, emergency access, device setup

---

## 🔄 Token Lifecycle & Refresh

### Access Token

```
┌─────────────────────────────────┐
│   Access Token (JWT)            │
├─────────────────────────────────┤
│                                 │
│ exp: 1516242622  (30 min)       │
│ aud: https://graph.microsoft.com│
│ scp: "User.Read Mail.Read"      │
│                                 │
│ Valid for: API calls only       │
│ Not valid for: User identification│
│                                 │
└─────────────────────────────────┘

Expires after 30-60 minutes
→ Need refresh token to get new one
```

### Refresh Token

```
┌──────────────────────────────────────┐
│   Refresh Token (Opaque String)      │
├──────────────────────────────────────┤
│                                      │
│ Encrypted token stored in Azure      │
│ Can last days, weeks, or months      │
│ Used to get new access token         │
│ without re-authenticating user       │
│                                      │
│ If refresh token stolen: revoked     │
│ If refresh token expires: re-login   │
│                                      │
└──────────────────────────────────────┘
```

### Token Refresh Flow

```
1. User has expired access token
   ↓
2. App sends refresh token to Entra ID
   ↓
3. Entra ID validates refresh token
   ↓
4. Issues new access token + refresh token
   ↓
5. App continues without user re-entering credentials
```

---

## ⚡ Modern Authentication Best Practices

### DO ✅

- Use Authorization Code flow (not Implicit)
- Add PKCE (Proof Key for Code Exchange) for mobile/SPA
- Use HTTPS/TLS everywhere
- Store tokens securely (httpOnly cookies on server)
- Validate token signatures and expiration
- Use short-lived access tokens (15-30 min)
- Implement refresh token rotation
- Check token claims (iss, aud, exp)

### DON'T ❌

- Store passwords in cloud (use hashes)
- Use Implicit flow
- Store access tokens in localStorage (XSS vulnerable)
- Trust tokens without signature validation
- Use long-lived access tokens (> 1 hour)
- Hardcode client secrets in client apps
- Accept tokens with invalid signatures

---

## 🔍 Protocol Comparison Cheat Sheet

| Scenario | Protocol | Why |
|----------|----------|-----|
| Web app needs SSO | OIDC | Identity + info about user |
| App needs API access | OAuth 2.0 | Authorization to resources |
| Legacy app (Salesforce old) | SAML | Enterprise standard pre-2010 |
| Modern SaaS (Teams, Slack) | OIDC | JSON-based, developer-friendly |
| Mobile app | OAuth + PKCE | Prevents authorization code interception |
| Service-to-service | Client Credentials | No user involved |
| No passwords wanted | Passwordless methods | MFA-less, phishing-resistant |

---

## 🎓 Interview Questions

**Q1: What's the difference between OAuth 2.0 and OpenID Connect?**
A: OAuth 2.0 is authorization (what resources you can access). OIDC is auth + identity (who you are). OIDC includes an ID token with user claims; OAuth only has access token.

**Q2: Why is the implicit flow deprecated?**
A: Because the authorization code is returned in the URL fragment, visible in browser history. Authorization Code flow is safer — code is short-lived, and the real token exchange happens server-to-server.

**Q3: What's the difference between access token and refresh token?**
A: Access token is short-lived (30 min), used for API calls. Refresh token is long-lived, used to get new access tokens without re-authenticating. If access token stolen, damage limited to 30 min; if refresh token stolen, revoke it.

**Q4: Why use PKCE with OAuth 2.0?**
A: Mobile/SPA apps can't securely store client_secret. PKCE uses a code_challenge (hash of random value) sent in auth request, and code_verifier sent in token request. Prevents authorization code interception.

**Q5: What makes Windows Hello for Business phishing-resistant?**
A: Uses certificate-based auth (private key stored in TPM), not password. Attacker can't phish a password because there isn't one. Only the device with that private key can authenticate.

---

*End of Section 6.3*
