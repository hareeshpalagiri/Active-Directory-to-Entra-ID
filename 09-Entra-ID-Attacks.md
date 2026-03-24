# Section 6.9 — Entra ID Attack Techniques

## 🎯 Overview

This section covers **attack techniques specific to Entra ID**. Unlike on-prem AD attacks (Kerberoasting, NTLM relay), cloud attacks use OAuth tokens, API manipulation, and federation abuse.

---

## 🔓 Credential-Based Attacks

### 1. Password Spray (Brute Force at Scale)

**Goal**: Try common passwords against many user accounts

```
Attack Flow:

Attacker obtains user list:
├─ From LinkedIn (public)
├─ From OSINT (company directory)
├─ From leaked databases
└─ Example: 1000 users at contoso.com

Attacker tries common passwords:
├─ Password123!
├─ Welcome2024!
├─ Company!2024
├─ Autumn2024
└─ Against ALL 1000 users

Typical success rate: 0.1-1% (1-10 accounts)

Result:
└─ Attacker gets valid credentials
    └─ Can now log into tenant
    └─ Access depends on user privileges
```

**Defense**:
```
✓ MFA (blocks even with valid password)
✓ Conditional Access (detect unusual behavior)
✓ Identity Protection (flag risky sign-in)
✓ Strong password policy (long > complex)
✓ Monitor login failures (alert threshold)
✓ Disable legacy auth (reduces attack surface)
✓ Passwordless (eliminate password attacks)
```

### 2. Phishing / Credential Harvesting

**Goal**: Trick user into revealing credentials or approving suspicious access

```
Attack Types:

A) Fake Login Page
   Attacker creates: fake.contoso.onmicrosoft.com
   User enters username/password
   Attacker captures creds
   
B) Malicious Email
   Email: "Click to approve Entra ID login"
   User clicks link
   Actually approves attacker app (phishing)
   Attacker grants self broad permissions
   
C) OAuth Consent Screen Abuse
   App requests "User.Read"
   Actually stores "Directory.ReadWrite.All"
   User doesn't notice subtle wording
   Attacker gains permissions not visible to user
```

**Defense**:
```
✓ MFA (password alone not enough)
✓ Passwordless (no password to steal)
✓ Conditional Access (unusual location)
✓ User training (phishing awareness)
✓ Email filtering (malicious links)
✓ App permission restrictions (admin consent required)
✓ Continuous access evaluation (detect suspicious activity)
```

### 3. Credential Stuffing

**Goal**: Use stolen username/password from other sites to access Entra ID

```
Attack Scenario:

1. Attacker obtains breach data:
   ├─ 100M user:password pairs from some site
   ├─ (e.g., LinkedIn breach, Yahoo breach, etc)
   
2. Attacker assumes same user on Entra ID:
   ├─ email@contoso.com same password
   ├─ Try against Entra ID login
   
3. Some users reuse passwords:
   ├─ Same password across sites
   ├─ Attacker gets access
   
4. Attacker is now in tenant:
   └─ Can access everything as that user
```

**Defense**:
```
✓ MFA (stops credential reuse)
✓ Leaked Credential Detection (flag breached passwords)
✓ Identity Protection (unusual sign-in)
✓ Conditional Access (geographic anomaly)
✓ FIDO2 passwordless (no password to reuse)
✓ Password strength enforcement
```

---

## 🎫 Token-Based Attacks

### 1. Token Theft

**Goal**: Steal access token from user or app and use it

```
Where tokens can be stolen:

From User's Browser:
├─ Browser memory (if not httpOnly)
├─ XSS (Cross-Site Scripting) attack
├─ Malicious extension
└─ If stored in localStorage (vulnerable!)

From Application:
├─ App server compromise
├─ API leak
├─ Logs containing tokens
└─ Unencrypted storage

From Network:
├─ Man-in-the-middle (HTTPS bypass)
├─ SSL stripping attack
├─ DNS hijacking
└─ Unencrypted HTTP (if allowed)

Once stolen:

Access token (valid 1 hour):
├─ Attacker calls API with token
├─ Server accepts it
├─ Access to user's data
└─ Duration: Limited (1 hour)

Refresh token (valid months):
├─ Attacker calls auth endpoint
├─ Gets new access token
├─ Continuous access
└─ Duration: Long (months)
    └─ Very valuable to attacker!
```

**Defense**:
```
✓ Store tokens securely
  └─ httpOnly cookies (not accessible to JS)
  └─ Encrypted storage in app
  └─ Never in localStorage
  
✓ Use short-lived tokens (15-30 min)
✓ Token revocation (if compromised, revoke)
✓ Continuous access evaluation (detect odd usage)
✓ HTTPS only (no man-in-middle)
✓ Refresh token rotation (issue new, revoke old)
✓ Monitor token usage (anomalies)
```

### 2. Token Forgery / Signature Bypass

**Goal**: Create fake token that app trusts

```
Attack:

Attacker creates fake JWT:
{
  "alg": "none",  ← Changed to NONE!
  "typ": "JWT"
}
{
  "oid": "admin-user-id",
  "sub": "admin@contoso.onmicrosoft.com",
  "roles": ["Global.Administrator"]
}

Sends to app:
GET /api/sensitive
Authorization: Bearer {fake-token}

Vulnerable app:
├─ Doesn't validate signature
├─ Accepts "alg: none" tokens
├─ Trusts claims in token
└─ Grants admin access!

Result: Attacker escalated to admin without credentials!
```

**Defense**:
```
✓ ALWAYS validate token signature
  └─ Get public key from JWKS endpoint
  └─ Verify signature matches
  
✓ Reject "alg: none" tokens
✓ Verify issuer (iss claim)
✓ Verify audience (aud claim)
✓ Check expiration (exp claim)
✓ Check not before (nbf claim)
✓ Never trust claims without signature
```

### 3. Token Replay

**Goal**: Capture and reuse valid token

```
Attack:

1. Attacker captures valid token:
   GET /api/user HTTP/1.1
   Authorization: Bearer eyJ0eXAi...abc123
   
2. Attacker saves token
   └─ Valid for next 60 minutes

3. Attacker replays token:
   GET /api/sensitive HTTP/1.1
   Authorization: Bearer eyJ0eXAi...abc123
   
4. Server accepts replay:
   └─ Token signature valid
   └─ Token not expired
   └─ Server thinks legitimate user
   
5. Attacker accesses data
```

**Defense**:
```
✓ Token binding
  └─ Tie token to specific device
  └─ Can't reuse on different device
  
✓ Short token lifetime (15-30 min)
✓ Continuous access evaluation
  └─ If behavior anomalous, reject
  
✓ Use refresh token rotation
  └─ Each refresh = new token
  └─ Old token auto-revoked
  
✓ Monitor unusual API patterns
  └─ Same token from different IPs
  └─ Same token at same time from multiple locations
```

---

## 🔐 Privilege Escalation Attacks

### 1. Application Permission Escalation

**Goal**: App has limited permissions, tricks user into granting more

```
Attack Scenario:

Initial State:
App registered with scope: "User.Read"
└─ Can only read user's profile

Attack:

1. Attacker modifies app backend
2. Silently requests additional scope: "Mail.ReadWrite"
   └─ User doesn't see this request
   └─ Or user doesn't understand scope
3. User consents (or admin grants consent)
4. App now has "Mail.ReadWrite"
5. App reads, modifies, deletes user emails
```

**Defense**:
```
✓ Admin consent only
  └─ Users cannot consent to apps
  └─ Admin reviews all permission requests
  
✓ User education
  └─ Explain what scopes mean
  └─ Review before consenting
  
✓ Periodic permission review
  └─ Audit what scopes apps have
  └─ Revoke unnecessary permissions
  
✓ Principle of least privilege
  └─ Apps request ONLY what they need
```

### 2. OAuth Redirect URI Abuse

**Goal**: Change app's redirect URI to attacker's URL

```
Attack:

App Configuration (Legitimate):
Redirect URI: https://myapp.com/callback

Attacker (via compromised app backend):
Changes to:
Redirect URI: https://attacker.com/callback

Attack flow:

1. User clicks "Sign in with Microsoft"
2. Redirected to Entra ID
3. User authenticates
4. Entra ID generates auth code
5. Redirects to attacker.com/callback (not myapp.com!)
6. Attacker captures auth code
7. Attacker exchanges code for token
8. Attacker now has user's token!
```

**Defense**:
```
✓ Whitelist redirect URIs (no wildcards)
✓ Regular audit of app registrations
✓ Restrict who can modify app config
✓ PKCE (prevents code interception)
✓ Monitor for unusual redirects
```

---

## 🚪 Federation & Trust Abuse

### 1. False Federation / Tenant Takeover

**Goal**: Attacker creates trust relationship to hijack tenant

```
Attack Scenario:

Attacker compromises high-privilege account:
└─ Global Admin or Application Admin

Attacker configures federation:
├─ Points to attacker's identity provider (IdP)
├─ Sets up SAML trust
├─ Or modifies OAuth configuration

Result:

1. Attacker controls IdP
2. User tries to log in
3. Redirected to attacker's IdP
4. Attacker approves / denies / modifies
5. Attacker can:
   ├─ Deny all logins (DoS)
   ├─ Issue fake credentials
   ├─ Intercept tokens
   └─ Takeover tenant

Organizations can't remove attacker because:
└─ Attacker still has credentials to admin account
```

**Defense**:
```
✓ Restrict who can modify federation
✓ Multi-admin approval for federation changes
✓ MFA on admin accounts (required)
✓ PIM for admin activation
✓ Monitor federation configuration
✓ Regular audit of trust relationships
✓ Conditional Access on admin actions
```

### 2. SAML Token Forgery

**Goal**: Create fake SAML token to impersonate user

```
Vulnerable Scenario:

App trusts Entra ID's SAML certificate
But doesn't validate signature properly

Attack:

1. Attacker creates fake SAML assertion:
   <saml:Assertion>
     <saml:Subject>
       <saml:NameID>admin@contoso.com</saml:NameID>
     </saml:Subject>
     <saml:Attribute Name="roles">
       <saml:AttributeValue>Administrator</saml:AttributeValue>
     </saml:Attribute>
   </saml:Assertion>

2. Attacker signs with own cert (or no signature)
3. Sends to app as if from Entra ID
4. App accepts (doesn't validate signature)
5. App logs in attacker as "admin"
```

**Defense**:
```
✓ Validate SAML signatures
✓ Use Entra ID's certificate from metadata
✓ Check certificate expiration
✓ Validate issuer (must be Entra ID)
✓ Validate audience (must be app)
✓ Validate not before / not after timestamps
✓ Never accept unsigned assertions
```

---

## 🎯 Identity Abuse

### 1. Service Principal Abuse

**Goal**: Compromise service principal to access org resources

```
Service Principal = App identity (no human user)

Attack:

1. Attacker compromises service principal:
   └─ Finds client secret (hardcoded, unencrypted, leaked)
   └─ Finds certificate (exported, unprotected)

2. Attacker uses client_id + client_secret
   POST /token
   grant_type=client_credentials
   client_id=12345
   client_secret=abc123
   
3. Gets access token as service principal
4. Can now call Graph API with that token
5. Can access all resources principal has permissions to
6. If principal has broad permissions:
   └─ Can read all users
   └─ Can create users
   └─ Can modify groups
   └─ Full org access!
```

**Defense**:
```
✓ Never hardcode secrets
✓ Store secrets in Key Vault
✓ Use Managed Identity (no secrets)
✓ Short secret lifetime (90 days max)
✓ Certificate auth > secret auth
✓ Least privilege permissions
✓ Monitor service principal usage
✓ Alert on unusual API calls
```

### 2. Device Identity Abuse

**Goal**: Compromise device to access org apps

```
Attack:

1. Attacker compromises user's laptop
2. Steals device's private key (if not protected)
3. Device has cert for authentication
4. Attacker uses cert to sign into cloud apps
5. CA policy thinks: "Device is compliant, known device"
6. Attacker gets access

vs. Uncompromised device:
Password lost: Can reset
Device key lost: Cannot recover!
```

**Defense**:
```
✓ Bitlocker encryption (device secret protected)
✓ TPM (hardware-backed key storage)
✓ Device compliance checking
✓ Regular device audits
✓ Remote device wipe capability
✓ Conditional Access on device status
✓ Monitor device logins for anomalies
```

---

## 📊 Large-Scale Attacks

### 1. Application Consent Abuse (Malicious SaaS)

**Goal**: Create seemingly-legitimate app, trick users into consenting

```
Attack:

1. Attacker creates app: "File-Organizer"
   └─ Looks like useful utility
   └─ Requests scopes: User.Read, Files.Read.All

2. User sees consent screen:
   "File-Organizer wants to:"
   - View your profile
   - Read all your files
   └─ User clicks [Consent]

3. Once consented:
   └─ App has User.Read + Files.Read.All
   └─ Attacker's backend exfiltrates files
   └─ Steals sensitive documents
   └─ Sells data on dark web

4. Takes weeks to detect!
   └─ App appears normal
   └─ Just has more permissions than expected
```

**Defense**:
```
✓ Require admin consent
✓ Admin reviews app permissions
✓ Monitor for risky apps
✓ Revoke consent for suspicious apps
✓ Educate users about consent screens
✓ Audit app permissions regularly
✓ Restrict 3rd-party integrations
```

### 2. MFA Fatigue / Push Notification Spam

**Goal**: Spam user with MFA requests until they approve attacker

```
Attack:

1. Attacker has valid credentials (phishing, etc)
2. Attacker logs in from unusual location
3. MFA challenge sent to user's phone
   "Approve login from Singapore?"

4. Attacker sends 10+ simultaneous login attempts
5. Phone gets bombarded with MFA prompts
6. User gets frustrated
7. User accidentally approves one
8. Attacker logged in!

Also called "MFA Bypass" or "MFA Fatigue Attack"
```

**Defense**:
```
✓ Limited MFA attempts (3-5 max)
✓ Lockout after failed attempts
✓ Conditional Access (detect impossible travel)
✓ Risk-based MFA (unusual = higher barrier)
✓ User education (never approve unknown requests)
✓ Alert on multiple MFA attempts
✓ Conditional Access > require approval from app only
```

---

## 🎓 Interview Questions

**Q1: What's password spray and how do you defend against it?**
A: Try common passwords against many users. Attacker gets 1000 users, tries "Password123" against all. Even 0.1% success = 1 compromised account. Defend with MFA (blocks even with valid password), Conditional Access (detect risky pattern), strong password policy.

**Q2: Why are refresh tokens more valuable than access tokens to attackers?**
A: Access token expires in 1 hour. Refresh token lasts months/years. Attacker with refresh token has persistent access, can continuously get new access tokens. Defend with refresh token rotation, short lifetime, detection of unusual usage.

**Q3: How can an attacker escalate from User to Admin without credentials?**
A: Token forgery (fake JWT with admin role), privilege escalation via app permissions, service principal compromise with broad permissions, or SAML token forgery if not validated.

**Q4: What's an OAuth redirect URI abuse attack?**
A: Attacker changes app's redirect URI from legit domain to attacker's domain. User logs in, authorization code sent to attacker instead of app. Attacker exchanges code for user's token. Defend with whitelisted URIs, PKCE, monitoring.

**Q5: What makes MFA fatigue attacks work?**
A: Attacker spams MFA requests until user gets tired and approves one. Defend with MFA attempt limits, lockouts, Conditional Access triggering only when needed, user training.

---

*End of Section 6.9*
