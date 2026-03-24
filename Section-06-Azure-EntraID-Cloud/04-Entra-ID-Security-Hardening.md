# Section 6.4 — Entra ID Security & Hardening

## 🎯 Overview

Entra ID provides modern security controls that go beyond traditional AD:

1. **Multi-Factor Authentication (MFA)** — Multiple proof factors
2. **Conditional Access** — Risk-based, policy-driven decisions
3. **Identity Protection** — ML-driven risk detection
4. **Privileged Identity Management (PIM)** — Just-in-time admin access
5. **Application Security** — OAuth/OIDC hardening

---

## 🔐 Multi-Factor Authentication (MFA)

MFA requires **two or more proof factors** to authenticate:

### Authentication Factors (Something You Know/Have/Are)

| Factor Type | Examples | Security |
|-------------|----------|----------|
| **Knowledge** | Password, PIN, Security questions | Low (can be guessed/phished) |
| **Possession** | Phone (SMS), hardware key, authenticator app | Medium (device can be lost) |
| **Inherence** | Fingerprint, face, iris | High (biometric, hard to spoof) |
| **Location/Time** | IP whitelist, geofence, time-of-day | Supplementary (not standalone) |

### MFA Methods in Entra ID

#### 1. **Microsoft Authenticator App**

```
┌──────────────────────────────────────┐
│  User Logs In                        │
│  • Username: alice@contoso.com       │
│  • Password: (correct)               │
└──────────┬───────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│  Entra ID: MFA Required              │
│  Sends push notification to phone    │
└──────────┬───────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│  User's Phone (Microsoft Authenticator)│
│  "Approve sign-in?"                  │
│  Location: New York, NY              │
│  Device: Windows 10                  │
│  [Approve] [Deny]                    │
└──────────┬───────────────────────────┘
           │
           ↓ (User taps Approve)
           │
┌──────────────────────────────────────┐
│  Entra ID Receives Approval          │
│  ✓ Login successful                  │
└──────────────────────────────────────┘
```

**Security**: Phishing-resistant if user checks context (location, device)

#### 2. **SMS / Phone Call**

```
User enters username + password
   ↓
Entra ID sends SMS: "Your code: 123456"
   ↓
User enters code
   ↓
✓ Authenticated
```

**Security**: ⚠️ Vulnerable to SIM swapping, SMS interception

#### 3. **OATH Time-Based (TOTP)**

Apps like Google Authenticator, Microsoft Authenticator:

```
User enters username + password
   ↓
Entra ID asks for app code
   ↓
User opens Authenticator app
   Displays: 123456 (changes every 30 seconds)
   ↓
User enters code
   ↓
✓ Authenticated
```

**Security**: Better than SMS (no network dependency, harder to intercept)

#### 4. **FIDO2 Security Keys**

USB/NFC keys (YubiKey, Windows Hello for Business):

```
User enters username + password
   ↓
Entra ID: "Touch your security key"
   ↓
User inserts YubiKey and touches it
   ↓
Key signs challenge with private key
   ↓
✓ Authenticated
```

**Security**: Highest (phishing-resistant, hardware-backed)

#### 5. **Windows Hello (Facial / Fingerprint)**

```
User unlocks Windows with face/fingerprint
   ↓
Windows authenticates to Entra ID with cert
   ↓
✓ No password needed
```

**Security**: Phishing-resistant (cert-based)

### MFA Policy Enforcement

```
┌────────────────────────────────────────┐
│  Conditional Access Policy             │
├────────────────────────────────────────┤
│                                        │
│ IF:                                    │
│  • User is "High-risk admin"           │
│  • Location is "Outside corp network"  │
│  • Time is "After hours"               │
│                                        │
│ THEN:                                  │
│  • REQUIRE MFA                         │
│  • REQUIRE compliant device            │
│                                        │
└────────────────────────────────────────┘
```

---

## 🚦 Conditional Access

**Conditional Access = Zero Trust at the policy level**

It answers: *"Should I let this user, on this device, from this location, in this state, access this resource?"*

### Components

```
┌─────────────────────────────────────────────────┐
│        Conditional Access Policy                │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. CONDITIONS (When to trigger policy)         │
│  ├─ User or group                              │
│  ├─ Cloud app                                  │
│  ├─ Client app (browser, mobile, desktop)      │
│  ├─ Device platform (Windows, iOS, Android)    │
│  ├─ Device state (compliant, trusted)          │
│  ├─ Sign-in risk (low, medium, high)           │
│  ├─ User risk (low, medium, high)              │
│  ├─ Location (IP range, country, geofence)     │
│  └─ Time of day / day of week                  │
│                                                 │
│  2. CONTROLS (What to do when triggered)       │
│  ├─ GRANT                                      │
│  │  ├─ Require MFA                             │
│  │  ├─ Require compliant device                │
│  │  ├─ Require Azure AD joined device          │
│  │  ├─ Require approved app                    │
│  │  └─ Require app protection policy           │
│  │                                             │
│  └─ DENY                                       │
│     └─ Block access                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Example Policy #1: High-Risk Admin Access

```
Name: "Admin Outside Network Requires MFA"

ASSIGN:
  Users: "Admin users" group
  Cloud apps: "Azure Portal", "Microsoft 365 admin"

CONDITIONS:
  Location: "Not trusted IP range (corp network)"

CONTROLS:
  Grant: Require MFA

Result:
  • Admin at coffee shop → Must use MFA
  • Admin at office (trusted IP) → No MFA needed
```

### Example Policy #2: Unmanaged Device Blocked

```
Name: "Block Unmanaged Devices from Teams"

ASSIGN:
  Cloud apps: "Microsoft Teams"
  Device platforms: All

CONDITIONS:
  Device state: "Not compliant"

CONTROLS:
  Deny: Block access

Result:
  • Personal iPhone → Cannot access Teams (not managed)
  • Corporate iPhone (MDM enrolled) → Can access Teams
```

### Example Policy #3: Risky Sign-in Extra Verification

```
Name: "Extra Verify for Risky Sign-in"

ASSIGN:
  All users
  All cloud apps

CONDITIONS:
  Sign-in risk: "High"

CONTROLS:
  Grant: Require MFA

Result:
  • Normal sign-in from usual location/device → No MFA
  • Anomalous sign-in (new device, new country) → Require MFA
```

### Policy Logic (How Multiple Policies Interact)

```
┌─────────────────────┐
│  User Login Request │
└────────┬────────────┘
         │
         ↓
    ┌─────────────┐
    │  Policy 1   │ ─→ Require MFA?
    └──────┬──────┘
           │
           ↓
    ┌─────────────┐
    │  Policy 2   │ ─→ Require Compliant Device?
    └──────┬──────┘
           │
           ↓
    ┌─────────────┐
    │  Policy 3   │ ─→ Block Access?
    └──────┬──────┘
           │
    If ANY policy says DENY → Access Denied
    If multiple GRANT policies → Apply all controls
    If no policies match → Allow access
```

---

## 🔍 Identity Protection

**Identity Protection = ML-driven risk detection**

It continuously monitors for suspicious activities:

### Risk Detections

#### 1. **Sign-in Risk Events**

| Risk Event | What Triggers | Risk Level |
|-----------|---------------|-----------|
| **Atypical travel** | Sign-in from impossible travel distance | Medium |
| **Anonymous IP** | Sign-in from Tor/VPN | Low-Medium |
| **Malware-linked IP** | IP known to be compromised | High |
| **Unfamiliar properties** | New device, new location, new browser | Low-Medium |
| **Password spray** | Many failed logins from one IP | High |
| **Leaked credentials** | Credentials found in dark web breach | High |

#### 2. **User Risk Events**

| Risk Event | What Triggers | Risk Level |
|-----------|---------------|-----------|
| **Leaked credentials** | User's password in breach database | High |
| **Anomalous behavior** | Unusual access patterns | Medium |
| **Admin confirmed compromise** | Manually marked as compromised | High |

### How It Works

```
┌──────────────────────────────────┐
│  User Login Attempt              │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Identity Protection Evaluation  │
│                                  │
│  1. Analyze sign-in:             │
│     • Location: Singapore        │
│     • Device: New iPhone          │
│     • IP: Residential broadband   │
│     • Time: 3 AM                  │
│                                  │
│  2. Check against history:       │
│     • User usually: USA, 9-5 PM  │
│     • User's laptop              │
│                                  │
│  3. Run ML model:                │
│     • Anomaly score: 0.85 (high) │
│     • Risk level: MEDIUM         │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Decision:                       │
│  Sign-in Risk: MEDIUM            │
│                                  │
│  If CA policy says "Medium risk  │
│  → Require MFA"                  │
│  → User must provide MFA         │
└──────────────────────────────────┘
```

### Remediation Options

When Identity Protection detects risk:

```
┌─────────────────────────────────────┐
│  Risk Detected                      │
├─────────────────────────────────────┤
│                                     │
│  For Admins:                        │
│  • Review risk event in portal      │
│  • Dismiss (false positive)         │
│  • Confirm compromise              │
│  • Force password reset             │
│  • Require MFA                      │
│                                     │
│  For Users:                         │
│  • Required to complete MFA         │
│  • May need to reset password       │
│  • Can check risk events in         │
│    "My Account" portal              │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔑 Privileged Identity Management (PIM)

**PIM = Just-in-time, time-limited admin access**

Prevents standing admin rights from being abused.

### Traditional Model (Risky)

```
┌────────────────────────────────────┐
│  User is Permanent Global Admin    │
├────────────────────────────────────┤
│                                    │
│  • Has admin rights 24/7           │
│  • Highest privilege scope         │
│  • If account compromised:         │
│    → Full tenant compromise        │
│  • No time limits                  │
│  • No audit of actual usage        │
│                                    │
│  Risk: ★★★★★ (Very High)          │
└────────────────────────────────────┘
```

### PIM Model (Secure)

```
┌────────────────────────────────────┐
│  User Eligible for Global Admin    │
├────────────────────────────────────┤
│                                    │
│  Normal state: Regular user        │
│  (No admin rights)                 │
│                                    │
│  When needs admin:                 │
│  1. Request activation in PIM      │
│  2. Provide business justification │
│  3. Approver reviews + approves    │
│  4. Granted for 2-4 hours          │
│  5. Rights expire automatically    │
│  6. All actions audited            │
│                                    │
│  Risk: ★★☆☆☆ (Low)                │
└────────────────────────────────────┘
```

### PIM Workflow

```
Timeline:
9:00 AM ─ Regular admin needs elevated access
          Submits PIM request
          │
          ├─ Justification: "Deploy security patch"
          ├─ Duration: 4 hours
          │
9:05 AM ─ Approver notified
          Reviews request
          │
9:10 AM ─ Approver approves
          │
9:11 AM ─ Admin receives notification
          "Global Admin role activated"
          │
9:12 AM ─ Admin is now Global Admin (until 1:11 PM)
          │
1:11 PM ─ Role automatically expires
          Admin reverts to regular user
          │
          Audit log shows:
          • Activation time: 9:11 AM
          • Deactivation time: 1:11 PM
          • All actions during that period logged
```

### PIM Rules (Best Practices)

```
┌────────────────────────────────────┐
│  PIM Policies to Enforce           │
├────────────────────────────────────┤
│                                    │
│  Role: Global Administrator        │
│  ├─ Activation max duration: 4h    │
│  ├─ Require MFA for activation: YES│
│  ├─ Require approval: YES          │
│  ├─ Approver: Security team        │
│  ├─ Audit eligible requests: YES   │
│  ├─ Notify on activation: YES      │
│  └─ Disable standing assignment: NO│
│                                    │
│  Role: Exchange Administrator      │
│  ├─ Activation max duration: 2h    │
│  ├─ Require MFA: YES               │
│  └─ Require approval: YES          │
│                                    │
│  Role: User Administrator          │
│  ├─ Activation max duration: 1h    │
│  ├─ Require MFA: YES               │
│  └─ Require approval: YES          │
│                                    │
└────────────────────────────────────┘
```

---

## 🛡️ Application Security Hardening

### 1. **Secure App Registration**

```
When registering an app in Entra ID:

DO ✅
  • Use OpenID Connect (not Implicit flow)
  • Store client secret securely (Key Vault)
  • Use HTTPS redirect URIs
  • Minimize requested scopes (least privilege)
  • Regularly rotate client secrets (< 1 year)
  • Add PKCE for mobile/SPA apps

DON'T ❌
  • Hardcode client secret in app code
  • Accept HTTP redirect URIs (unless localhost)
  • Request "/.default" scope (too broad)
  • Use Implicit flow for modern apps
  • Store tokens in localStorage (XSS risk)
```

### 2. **Secret Management**

```
┌────────────────────────────────────────┐
│  Where to Store Secrets                │
├────────────────────────────────────────┤
│                                        │
│  ❌ NOT in code / config files        │
│  ❌ NOT in version control (git)      │
│  ❌ NOT in appsettings.json            │
│  ❌ NOT in environment variables       │
│     (on local machine only)            │
│                                        │
│  ✅ Azure Key Vault                   │
│  ✅ App Service Managed Identity       │
│  ✅ GitHub Secrets (if CI/CD)          │
│  ✅ Kubernetes Secrets (if k8s)        │
│                                        │
│  Example: Python + Key Vault           │
│  from azure.keyvault.secrets import SecretClient
│  
│  client = SecretClient(
│    vault_url="https://contoso-kv.vault.azure.net/",
│    credential=DefaultAzureCredential()
│  )
│  
│  secret = client.get_secret("db-password")
│                                        │
└────────────────────────────────────────┘
```

### 3. **Token Validation**

```python
# When receiving a token from Entra ID:

import jwt

token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# ✅ ALWAYS validate:
try:
    decoded = jwt.decode(
        token,
        key=public_key_from_entra_id,  # Must fetch from JWKS URI
        algorithms=["RS256"],
        audience="your-app-id",         # Must match your app
        issuer=f"https://login.microsoftonline.com/{tenant_id}/v2.0"
    )
    
    # Check critical claims
    assert decoded['exp'] > time.time()  # Not expired
    assert decoded['aud'] == "your-app-id"  # For your app
    assert decoded['iss'] == issuer  # From Entra ID
    
    # Token valid!
    user_id = decoded['sub']
    email = decoded['email']
    
except jwt.InvalidTokenError:
    # Reject token
    return 401 Unauthorized
```

---

## 🔒 Security Checklist

```
┌──────────────────────────────────────────────────┐
│  Entra ID Security Hardening Checklist           │
├──────────────────────────────────────────────────┤
│                                                  │
│ Authentication:                                  │
│  ☐ MFA enabled for all users (or via CA policy) │
│  ☐ Passwordless methods enabled (WHfB, FIDO2)   │
│  ☐ Legacy auth protocols disabled               │
│     (Basic auth, IMAP, POP3 on Exchange)        │
│                                                  │
│ Conditional Access:                             │
│  ☐ Baseline policy: MFA for admins              │
│  ☐ Baseline policy: Block legacy auth           │
│  ☐ High-risk policy: Require trusted device     │
│  ☐ Test policies in Report-only mode first      │
│                                                  │
│ Identity Protection:                            │
│  ☐ Monitor risky sign-ins                       │
│  ☐ Monitor compromised credentials              │
│  ☐ Set up alerts for high-risk events           │
│                                                  │
│ Admin Security (PIM):                           │
│  ☐ Admin roles assigned via PIM, not permanent  │
│  ☐ Max activation duration: 4 hours             │
│  ☐ All activations require approval             │
│  ☐ All admin actions audited                    │
│  ☐ Global Admins: < 3 people                    │
│                                                  │
│ Applications:                                    │
│  ☐ Use OAuth 2.0 / OIDC (not SAML legacy)       │
│  ☐ Client secrets rotated < 1 year              │
│  ☐ Secrets stored in Key Vault                  │
│  ☐ Validate all tokens (signature, exp, aud)    │
│  ☐ Use least privilege scopes                   │
│  ☐ Require PKCE for mobile/SPA                  │
│                                                  │
│ Monitoring:                                     │
│  ☐ Sign-in logs reviewed regularly              │
│  ☐ Suspicious activities investigated           │
│  ☐ Alerts set for failed logins (threshold)     │
│  ☐ Application consent tracked                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 🎓 Interview Questions

**Q1: What's the difference between MFA and Conditional Access?**
A: MFA requires multiple factors (password + phone code). Conditional Access is a policy that *decides when* to require MFA (based on risk, location, device, etc). CA might say "Require MFA if outside network" without always requiring it.

**Q2: Why is Conditional Access better than "require MFA for everyone"?**
A: MFA for everyone has friction (slower logins, support costs). CA applies MFA only when risky (new location, new device). Normal logins stay frictionless, risky ones get extra protection.

**Q3: What makes a sign-in "risky" in Identity Protection?**
A: ML model analyzes location, device, IP, time-of-day, browser, etc. against user's history. If anomalous (new country, new device, off-hours), risk score increases.

**Q4: Why use PIM for admin roles instead of permanent assignment?**
A: Permanent admin = full exposure 24/7. PIM = rights only when needed, for short time (2-4 hours), auto-expire, all audited. If account compromised, damage window is small.

**Q5: What's the most important thing to check when validating a JWT token?**
A: Signature (using public key from JWKS endpoint), expiration (not expired), and audience (matches your app ID). If any fail, reject token.

---

*End of Section 6.4*
