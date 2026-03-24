# Section 6.6 — App Registration & Enterprise Applications (In Depth)

## 🎯 Overview

This is a **comprehensive guide** to app registration and enterprise application management in Entra ID:

1. **App Registration Basics** — Creating and configuring apps
2. **Permissions (Delegated vs Application)** — Access scopes and consent
3. **Admin Consent** — Controlling who can consent to apps
4. **SSO Integration** — OIDC, SAML, linking apps
5. **Application Provisioning** — SCIM, lifecycle workflows
6. **Client Secrets & Keys** — Rotation, expiration, management
7. **Security Best Practices** — Hardening app integrations

---

## 📱 App Registration Fundamentals

### What is App Registration?

**App Registration** = Telling Entra ID "Here's my application, and here's what it needs access to"

When you register an app:
- ✅ Entra ID knows the app exists
- ✅ App gets unique identifiers (client ID, object ID)
- ✅ You define what permissions the app can request
- ✅ You manage secrets/certificates for authentication

### Two Perspectives in Entra ID Portal

```
┌────────────────────────────────────────────────┐
│     TWO WAYS TO MANAGE APPS IN ENTRA ID        │
├────────────────────────────────────────────────┤
│                                                │
│  1. APP REGISTRATION (Developer View)          │
│     Location: Entra ID → App registrations     │
│     Purpose: Define what app needs              │
│     Manage: Permissions, secrets, auth flows   │
│     Who uses: App developers, admins           │
│                                                │
│     Example: Register "MyCustomApp"            │
│     ├─ Set redirect URIs                       │
│     ├─ Configure permissions                   │
│     ├─ Create client secret                    │
│     └─ Get client ID for coding                │
│                                                │
│  2. ENTERPRISE APPLICATION (Admin View)        │
│     Location: Entra ID → Enterprise apps       │
│     Purpose: Manage who can use the app        │
│     Manage: User assignment, SSO, provisioning│
│     Who uses: IT admins, app owners            │
│                                                │
│     Example: "MyCustomApp" enterprise app      │
│     ├─ Assign users/groups                     │
│     ├─ Configure SAML/OIDC                     │
│     ├─ Enable SCIM provisioning               │
│     └─ Monitor user access                     │
│                                                │
│  RELATIONSHIP:                                 │
│  App Registration ──(creates)──> Service      │
│  Service Principal ────(shown as)──> Enterprise App
│                                                │
└────────────────────────────────────────────────┘
```

### Create App Registration (Step-by-Step)

**Via Azure Portal:**

```
1. Entra ID → App registrations → New registration

2. Register an application:
   - Name: "SecurityAuditApp"
   - Supported account types: 
     ☑ Accounts in this org only (single-tenant)
   - Redirect URI: (optional for now)
     Platform: Web
     URI: https://localhost:3000/callback

3. Click Register

4. You now have:
   - Client ID (Application ID): 
     12345678-1234-1234-1234-567812345678
   - Tenant ID: 87654321-4321-4321-4321-210987654321
   - Directory (tenant name): contoso.onmicrosoft.com
```

**Via PowerShell:**

```powershell
# Connect to Entra ID
Connect-MgGraph -Scopes "Application.ReadWrite.All"

# Create app registration
$params = @{
    displayName = "SecurityAuditApp"
    signInAudience = "AzureADMyOrg"  # Single-tenant
    web = @{
        redirectUris = @("https://localhost:3000/callback")
        implicitGrantSettings = @{
            enableIdTokenIssuance = $true
            enableAccessTokenIssuance = $false
        }
    }
}

$app = New-MgApplication -BodyParameter $params
Write-Host "App ID: $($app.AppId)"
Write-Host "Object ID: $($app.Id)"
```

### App Registration Objects

Two objects are created:

```
┌──────────────────────────────────────┐
│  1. APPLICATION OBJECT               │
│  (Template in Entra ID)              │
├──────────────────────────────────────┤
│  • Unique per app                    │
│  • One per tenant where registered   │
│  • Stores metadata, permissions      │
│  • Object ID: 12345678-...           │
│                                      │
│  Found in: App registrations         │
│  Used by: Developers to config app   │
└──────────────────────────────────────┘

         │
         │ (Automatically creates)
         ↓

┌──────────────────────────────────────┐
│  2. SERVICE PRINCIPAL               │
│  (Instance of app in tenant)        │
├──────────────────────────────────────┤
│  • Instance of app in your tenant    │
│  • Can have multiple per app         │
│  • Stores role assignments, consent  │
│  • Service Principal ID: abc123...   │
│                                      │
│  Found in: Enterprise applications   │
│  Used by: Admins to manage access    │
└──────────────────────────────────────┘
```

---

## 🔐 Permissions: The Complete Picture

### Permission Types

```
┌─────────────────────────────────────────────────────┐
│           PERMISSION TYPES IN ENTRA ID              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. DELEGATED PERMISSIONS                          │
│     ├─ User-dependent (requires user context)      │
│     ├─ App acts "on behalf of" the user            │
│     ├─ Limited to user's permissions               │
│     ├─ Scope: /me (current user)                   │
│     │                                              │
│     └─ Example:                                    │
│        App: "Read my calendar events"              │
│        User: Alice                                 │
│        Result: App can read Alice's calendar,      │
│                not other users' calendars          │
│                                                    │
│  2. APPLICATION PERMISSIONS                        │
│     ├─ User-independent (no user context)          │
│     ├─ App acts "as itself"                        │
│     ├─ Full org-wide access                        │
│     ├─ Scope: All resources of type                │
│     │                                              │
│     └─ Example:                                    │
│        App: "Read all user calendar events"        │
│        Result: App can read EVERY user's calendar  │
│                (powerful, requires admin consent)  │
│                                                    │
│  3. DIRECTORY ROLES                                │
│     ├─ Role-based access control                   │
│     ├─ Examples: User Administrator, Security Admin│
│     ├─ Typically for service principals            │
│                                                    │
└─────────────────────────────────────────────────────┘
```

### Delegated Permissions (Scopes)

**Common Graph API Delegated Scopes:**

```
User.Read
  └─ Read profile of signed-in user
  
User.ReadWrite
  └─ Read AND modify profile of signed-in user
  
Mail.Read
  └─ Read emails of signed-in user
  
Mail.Send
  └─ Send emails on behalf of signed-in user
  
Calendar.Read
  └─ Read calendar of signed-in user
  
Files.Read.All
  └─ Read all files user has access to
  
Group.Read.All
  └─ Read all groups in organization
  
Directory.Read.All
  └─ Read directory (users, groups, devices)
```

### Application Permissions (App-only)

**Common Graph API App Permissions:**

```
User.Read.All
  └─ Read all users in organization (no user context)
  
User.ReadWrite.All
  └─ Read AND modify all users (full control)
  
Mail.ReadWrite
  └─ Read and modify emails of ALL users
  
Directory.ReadWrite.All
  └─ Full directory access (users, groups, etc)
  
Application.Read.All
  └─ Read all registered applications
  
RoleManagement.ReadWrite.Directory
  └─ Manage role assignments
```

### Least Privilege Principle

```
┌──────────────────────────────────────────┐
│    LEAST PRIVILEGE BEST PRACTICE         │
├──────────────────────────────────────────┤
│                                          │
│  ❌ Request too much:                    │
│  App needs "Mail.Read"                   │
│  But requests "Mail.ReadWrite" + "Mail.Send"
│  → App can delete emails!                │
│                                          │
│  ✅ Request only what's needed:          │
│  App needs "Mail.Read"                   │
│  Request only "Mail.Read"                │
│  → App can only read, not modify         │
│                                          │
│  ✅ Use delegated when possible:         │
│  Instead of: "User.ReadWrite.All" (app-only)
│  Use: "User.Read" (delegated)            │
│  → Limited to current user's data        │
│                                          │
└──────────────────────────────────────────┘
```

### How Permissions Flow

```
OAUTH 2.0 FLOW WITH PERMISSIONS

Step 1: App Requests Scopes
┌──────────────────────────────────────────┐
│  App redirects to:                       │
│  https://login.microsoftonline.com/      │
│    ?client_id=12345                      │
│    &scope=User.Read Mail.Read             │
│    &response_type=code                   │
│                                          │
│  (Requesting: read profile + read email) │
└──────────────────────────────────────────┘
         │
         ↓

Step 2: User Consent
┌──────────────────────────────────────────┐
│  Entra ID Consent Screen:                │
│                                          │
│  "MyApp" wants to:                       │
│  ☐ View your profile                    │
│  ☐ Read your email messages             │
│                                          │
│  [Consent] [Decline]                     │
│                                          │
│  User clicks [Consent]                   │
└──────────────────────────────────────────┘
         │
         ↓

Step 3: Token with Scopes
┌──────────────────────────────────────────┐
│  Access Token contains:                  │
│  {                                       │
│    "scope": "User.Read Mail.Read"       │
│    "aud": "https://graph.microsoft.com"  │
│  }                                       │
│                                          │
│  App can now use these scopes            │
│  to call Graph API                       │
└──────────────────────────────────────────┘
         │
         ↓

Step 4: API Calls
┌──────────────────────────────────────────┐
│  GET /me                                 │
│  Authorization: Bearer {token}           │
│  ✓ Allowed (has User.Read)               │
│                                          │
│  GET /me/messages                        │
│  Authorization: Bearer {token}           │
│  ✓ Allowed (has Mail.Read)               │
│                                          │
│  DELETE /me/messages/{id}                │
│  Authorization: Bearer {token}           │
│  ✗ Denied (no Mail.Delete scope)         │
└──────────────────────────────────────────┘
```

---

## ✅ Admin Consent & Consent Framework

### Consent Types

```
┌──────────────────────────────────────────────┐
│         CONSENT TYPES IN ENTRA ID            │
├──────────────────────────────────────────────┤
│                                              │
│  1. USER CONSENT (Default)                   │
│     ├─ User grants permission to app         │
│     ├─ Applies only to that user             │
│     ├─ Risk: Users might consent to risky    │
│     │       permissions without understanding│
│     │                                        │
│     └─ Example:                              │
│        User sees consent screen              │
│        "MyApp wants to read your email"      │
│        User clicks [Consent]                 │
│                                              │
│  2. ADMIN CONSENT (Controlled)               │
│     ├─ Admin grants permission to app        │
│     ├─ Applies to ENTIRE organization        │
│     ├─ Stronger control than user consent    │
│     ├─ Prevents phishing and risky apps      │
│     │                                        │
│     └─ Example:                              │
│        Salesforce SSO integration            │
│        Admin grants consent once             │
│        All users can now use Salesforce      │
│                                              │
│  3. ADMIN RESTRICTED CONSENT (Strictest)     │
│     ├─ For high-risk permissions             │
│     ├─ User cannot consent (admin only)      │
│     ├─ Examples: Directory.ReadWrite, RoleAdmin│
│     │                                        │
│     └─ Use case:                             │
│        App requests "RoleManagement.Write"   │
│        User sees: "Admin approval required"  │
│        Only admin can approve                │
│                                              │
└──────────────────────────────────────────────┘
```

### Admin Consent Workflow

```
SCENARIO: Company wants to integrate Salesforce SSO

┌──────────────────────────────────────────────┐
│  1. Salesforce App Registration (Pre-done)   │
│     ├─ Already in Entra ID gallery           │
│     ├─ Requires: User.Read (delegated)       │
│     └─ Requires: Directory.Read.All (app)    │
└──────────────────────────────────────────────┘
         │
         ↓

┌──────────────────────────────────────────────┐
│  2. Admin Grants Consent                     │
│                                              │
│     Entra ID Portal:                         │
│     Enterprise Apps → Salesforce             │
│     → Permissions → Grant admin consent      │
│                                              │
│     OR via Link (automatic):                 │
│     https://login.microsoftonline.com/
│      {tenant}/v2.0/adminconsent
│      ?client_id={salesforce_client_id}
│      &redirect_uri={redirect_uri}            │
│                                              │
│     Admin signs in → Consent form appears    │
│     → Clicks [Accept] for entire org         │
└──────────────────────────────────────────────┘
         │
         ↓

┌──────────────────────────────────────────────┐
│  3. Consent Granted Org-Wide                 │
│                                              │
│     • Stored in service principal            │
│     • All users inherit consent              │
│     • Users no longer see consent screen     │
│     • Direct access to Salesforce SSO        │
└──────────────────────────────────────────────┘
         │
         ↓

┌──────────────────────────────────────────────┐
│  4. Users Access Salesforce                  │
│                                              │
│     User clicks "Sign in with Microsoft"     │
│     → Redirects to Entra ID                  │
│     → Entra ID validates creds               │
│     → Issues token (already consented)       │
│     → User logged into Salesforce            │
│     (No consent screen because admin already │
│      approved app)                           │
└──────────────────────────────────────────────┘
```

### Admin Consent Policy

```
By default: Both users and admins can consent

To restrict: Only admins can consent
┌─────────────────────────────────────────┐
│ Entra ID → Enterprise applications      │
│ → Consent and permissions               │
│ → User consent settings                 │
│                                         │
│ Change to:                              │
│ "Do not allow user consent"             │
│                                         │
│ → Now users CANNOT consent              │
│ → Only admins can grant access          │
│ → Stronger security posture             │
└─────────────────────────────────────────┘
```

---

## 🔗 Single Sign-On (SSO) Integration

### SAML-based SSO (Traditional)

**When to use**: Legacy enterprise apps (Salesforce, ServiceNow, etc.)

```
SAML SSO Setup Process:

Step 1: Configure in Entra ID
┌───────────────────────────────────────┐
│ Entra ID → Enterprise Apps            │
│ → Salesforce → Single sign-on         │
│                                       │
│ Enter Salesforce SAML settings:       │
│ • Entity ID                           │
│ • Reply URL (Assertion Consumer URL)  │
│ • Sign on URL                         │
│                                       │
│ Copy from Entra ID:                   │
│ • Login URL                           │
│ • Certificate                         │
│ • Logout URL                          │
└───────────────────────────────────────┘
         │
         ↓

Step 2: Configure in Salesforce
┌───────────────────────────────────────┐
│ Salesforce Setup:                     │
│ Single Sign-On Settings               │
│                                       │
│ Paste values from Entra ID:           │
│ • Entra ID Login URL                  │
│ • Entra ID Certificate                │
│                                       │
│ Enable SAML                           │
│ Save                                  │
└───────────────────────────────────────┘
         │
         ↓

Step 3: Test
┌───────────────────────────────────────┐
│ 1. Sign out of Salesforce             │
│ 2. Navigate to Salesforce login       │
│ 3. Click "Login with SSO"             │
│ 4. Redirected to Entra ID             │
│ 5. Enter Entra ID credentials         │
│ 6. Salesforce validates SAML assertion│
│ 7. ✓ Logged in to Salesforce          │
└───────────────────────────────────────┘
```

### OIDC-based SSO (Modern)

**When to use**: Modern web apps, custom apps

```
OIDC SSO is simpler than SAML:
• No certificates to manage
• JSON instead of XML
• Automatic discovery
• Better developer experience

Configuration:
1. Register app in Entra ID
2. Set redirect URIs
3. Assign users/groups in enterprise app
4. App automatically discovers OIDC endpoints
5. Users click "Sign in with Microsoft"
6. Standard OAuth/OIDC flow
7. ✓ Logged in
```

### Linked Apps (Pre-integrated)

```
Entra ID Gallery Apps:
├─ Salesforce
├─ ServiceNow
├─ Slack
├─ Jira
├─ GitHub
├─ Okta
└─ 10,000+ more

For these apps:
1. Search in Enterprise Apps gallery
2. Click "Create"
3. App auto-configured
4. Just assign users
5. ✓ SSO ready (no complex setup)
```

---

## 🔄 Application Provisioning (SCIM)

### What is SCIM?

**SCIM** = System for Cross-domain Identity Management

It's a **standard protocol** for automating user lifecycle management between Entra ID and SaaS apps.

```
┌────────────────────────────────────────────┐
│        WITHOUT SCIM (Manual)               │
├────────────────────────────────────────────┤
│                                            │
│ New hire "Alice" joins:                   │
│ 1. Admin creates user in Entra ID         │
│ 2. Admin logs into Salesforce             │
│ 3. Manually creates Alice in Salesforce   │
│ 4. Manually assigns roles                 │
│ 5. ❌ Alice leaves:                        │
│    Admin manually deletes from Salesforce │
│                                            │
│ Issues: Manual work, human error, delays  │
│                                            │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│        WITH SCIM (Automated)               │
├────────────────────────────────────────────┤
│                                            │
│ New hire "Alice" joins:                   │
│ 1. Admin creates user in Entra ID         │
│ 2. ✓ SCIM automatically creates Alice     │
│      in Salesforce                        │
│ 3. ✓ SCIM automatically assigns roles     │
│ 4. Alice can immediately access Salesforce│
│ 5. ✓ Alice leaves:                        │
│    SCIM automatically disables in         │
│    Salesforce                             │
│                                            │
│ Benefits: Automatic, fast, error-free     │
│                                            │
└────────────────────────────────────────────┘
```

### SCIM Provisioning Setup

```
Step 1: Enable Provisioning in Enterprise App
┌────────────────────────────────────────────┐
│ Entra ID → Enterprise Apps → Salesforce   │
│ → Provisioning                            │
│                                           │
│ Set Provisioning Mode to "Automatic"      │
│                                           │
│ Enter Salesforce SCIM settings:           │
│ • Tenant URL (Salesforce API endpoint)    │
│ • Secret Token (Bearer token)             │
│                                           │
│ Click "Test Connection"                   │
│ → ✓ Connection established                │
│                                           │
│ Save                                      │
└────────────────────────────────────────────┘
         │
         ↓

Step 2: Map Attributes
┌────────────────────────────────────────────┐
│ Define how Entra ID attributes map         │
│ to Salesforce attributes                  │
│                                           │
│ Entra ID Attribute → Salesforce Attribute │
│ userPrincipalName → email                │
│ displayName → name                        │
│ givenName → givenName                     │
│ surname → familyName                      │
│ department → department                   │
│ jobTitle → jobTitle                       │
│                                           │
│ Save Mappings                             │
│                                           │
│ Click "Provision on Demand" to test       │
│ → Verify first user created in Salesforce │
└────────────────────────────────────────────┘
         │
         ↓

Step 3: Assign Users/Groups
┌────────────────────────────────────────────┐
│ Entra ID → Enterprise Apps → Salesforce   │
│ → Users and groups                        │
│                                           │
│ Add users/groups:                         │
│ • Alice Johnson                           │
│ • Bob Smith                               │
│ • Engineering Department (group)          │
│                                           │
│ These users now provisioned to Salesforce │
└────────────────────────────────────────────┘
         │
         ↓

Step 4: Monitor Provisioning
┌────────────────────────────────────────────┐
│ Entra ID → Enterprise Apps → Salesforce   │
│ → Provisioning → Provisioning logs        │
│                                           │
│ See:                                      │
│ • Create: Alice Johnson → Salesforce      │
│ • Create: Bob Smith → Salesforce          │
│ • Create: Engineering group → Salesforce  │
│                                           │
│ If errors:                                │
│ • Check SCIM connection                   │
│ • Verify secret token                     │
│ • Check attribute mappings                │
│                                           │
│ When Alice leaves:                        │
│ • Disable in Entra ID                    │
│ • SCIM auto-disables in Salesforce       │
└────────────────────────────────────────────┘
```

### SCIM Request Examples

```
CREATE User via SCIM:

POST https://salesforce-api.com/scim/v2/Users
Authorization: Bearer {secret_token}
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "alice@contoso.com",
  "emails": [{
    "value": "alice@contoso.com",
    "primary": true
  }],
  "name": {
    "givenName": "Alice",
    "familyName": "Johnson"
  },
  "active": true
}

RESPONSE (201 Created):
{
  "id": "salesforce-user-12345",
  "userName": "alice@contoso.com",
  "meta": {
    "created": "2024-03-24T10:30:00Z"
  }
}

---

DEACTIVATE User via SCIM:

PATCH https://salesforce-api.com/scim/v2/Users/salesforce-user-12345
Authorization: Bearer {secret_token}
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "active": false
}

RESPONSE (200 OK):
User deactivated in Salesforce
```

---

## 🔑 Client Secrets & Certificate Management

### Secret Types

```
┌──────────────────────────────────────────────────┐
│      CLIENT AUTHENTICATION METHODS               │
├──────────────────────────────────────────────────┤
│                                                  │
│  1. CLIENT SECRET (Simplest)                     │
│     ├─ Opaque string (like password)             │
│     ├─ Easy to create and use                    │
│     ├─ Risk: Can be stolen if hardcoded          │
│     ├─ Best for: Secure backend services        │
│     │                                            │
│     └─ How: App includes in token request        │
│        POST /token                              │
│        grant_type=client_credentials             │
│        client_id=...                             │
│        client_secret=...  ← This string          │
│                                                  │
│  2. CERTIFICATE (Stronger)                       │
│     ├─ Public/private key pair                   │
│     ├─ App signs JWT with private key            │
│     ├─ Entra ID validates with public cert       │
│     ├─ Risk: Lower than secret                   │
│     ├─ Best for: Daemon apps, automation         │
│     │                                            │
│     └─ How: App signs assertion, includes in     │
│        token request (JWT bearer flow)           │
│                                                  │
│  3. MANAGED IDENTITY (Azure Native)              │
│     ├─ App running in Azure gets automatic auth  │
│     ├─ No secrets to manage                      │
│     ├─ Risk: Minimal (no creds to steal)         │
│     ├─ Best for: Apps in Azure                   │
│     │                                            │
│     └─ How: Azure provides token automatically   │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Create Client Secret

```powershell
# Create new client secret
$secret = Add-MgApplicationPassword `
  -ApplicationObjectId "12345678-1234-1234-1234-567812345678" `
  -PasswordCredential @{ displayName = "Production Secret" }

Write-Host "Secret Value: $($secret.SecretText)"
Write-Host "Expires: $($secret.EndDateTime)"

# Store in Key Vault (IMMEDIATELY!)
$secretSecure = ConvertTo-SecureString -String $secret.SecretText -AsPlainText
Set-AzKeyVaultSecret -VaultName "contoso-kv" `
                     -Name "app-client-secret" `
                     -SecretValue $secretSecure
```

### Secret Expiration & Rotation

**Best Practice: Rotate every 90 days**

```
Rotation Timeline:

Day 0-88: Current secret in use
Day 89: Create NEW secret
Day 89-92: Update app code to use NEW secret
Day 92: Verify NEW secret working in production
Day 93: Delete OLD secret

PowerShell Rotation Script:
┌──────────────────────────────────────────┐
│ # Create new secret                      │
│ $newSecret = Add-MgApplicationPassword ` │
│   -ApplicationObjectId $appId            │
│                                          │
│ # Store in Key Vault                     │
│ Set-AzKeyVaultSecret -VaultName $kv `   │
│   -Name "app-secret" `                   │
│   -SecretValue $newSecret.SecretText     │
│                                          │
│ # In app: Update to new secret           │
│ # Test thoroughly                        │
│                                          │
│ # After verified in production:          │
│ # Remove old secret                      │
│ $oldSecret | Remove-MgApplicationPassword│
│                                          │
└──────────────────────────────────────────┘
```

### Certificate Authentication (Preferred)

More secure than secrets:

```
Create Self-Signed Certificate:

openssl req -x509 -newkey rsa:4096 -keyout private.pem \
  -out certificate.pem -days 365 -nodes \
  -subj "/CN=SecurityAuditApp"

Upload to App Registration:

PowerShell:
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("certificate.pem")

$keyCredential = @{
  type = "AsymmetricX509Cert"
  usage = "Sign"
  key = $cert.GetRawCertData()
}

New-MgApplicationKeyCredential -ApplicationObjectId $appId -KeyCredential $keyCredential

Use in App Code (Python):

from cryptography.hazmat.primitives import serialization
from cryptography import x509
import jwt

# Load private key
with open('private.pem', 'rb') as f:
    private_key = serialization.load_pem_private_key(
        f.read(), password=None
    )

# Create JWT assertion
assertion = jwt.encode(
    {
        "iss": client_id,
        "sub": client_id,
        "aud": "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time())
    },
    private_key,
    algorithm="RS256"
)

# Use assertion in token request
token_response = requests.post(
    f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
    data={
        "grant_type": "client_credentials",
        "client_id": client_id,
        "assertion": assertion,
        "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
    }
)
```

---

## 🛡️ Security Best Practices

### Complete Hardening Checklist

```
┌────────────────────────────────────────────┐
│   APP REGISTRATION SECURITY CHECKLIST      │
├────────────────────────────────────────────┤
│                                            │
│ PERMISSIONS:                               │
│  ☐ Only request needed scopes             │
│  ☐ Use delegated > application perms      │
│  ☐ Admin consent required for sensitive   │
│  ☐ Review permissions quarterly           │
│                                            │
│ SECRETS & KEYS:                            │
│  ☐ Never hardcode secrets                 │
│  ☐ Store in Key Vault/Secrets Manager     │
│  ☐ Rotate every 90 days                   │
│  ☐ Use certificates > secrets             │
│  ☐ Prefer Managed Identity in Azure       │
│  ☐ Monitor secret expiration              │
│                                            │
│ AUTHENTICATION:                            │
│  ☐ Use HTTPS only (no HTTP)               │
│  ☐ Validate redirect URIs (no wildcards)  │
│  ☐ For public clients: Add PKCE           │
│  ☐ For confidential clients: MFA/cert     │
│                                            │
│ OAUTH/OIDC:                                │
│  ☐ Use Authorization Code flow            │
│  ☐ Validate token signatures              │
│  ☐ Check token expiration                 │
│  ☐ Validate audience (aud) claim          │
│  ☐ Validate issuer (iss) claim            │
│  ☐ Store tokens securely (httpOnly)       │
│                                            │
│ SSO INTEGRATION:                           │
│  ☐ Enable admin consent only              │
│  ☐ Require MFA for app access             │
│  ☐ Review user assignments regularly      │
│  ☐ Audit successful logins                │
│  ☐ Alert on failed login attempts         │
│                                            │
│ PROVISIONING:                              │
│  ☐ Enable SCIM where supported            │
│  ☐ Secure SCIM token in Key Vault         │
│  ☐ Test provisioning thoroughly           │
│  ☐ Monitor provisioning logs              │
│  ☐ Verify deprovisioning works            │
│                                            │
│ MONITORING:                                │
│  ☐ Review app activity logs               │
│  ☐ Monitor failed authentications         │
│  ☐ Alert on suspicious patterns           │
│  ☐ Review service principal usage         │
│                                            │
└────────────────────────────────────────────┘
```

---

## 🎓 Interview Questions

**Q1: What's the difference between delegated and application permissions?**
A: Delegated permissions are user-dependent (app acts on behalf of user, limited to user's access). Application permissions are user-independent (app acts as itself, org-wide access). App permissions are more powerful, require admin consent.

**Q2: Why use admin consent instead of user consent?**
A: Admin consent prevents users from accidentally granting risky permissions to malicious apps. Admin reviews before granting, applies org-wide, stronger security posture.

**Q3: What's SCIM and why is it important?**
A: SCIM is a standard protocol for automating user lifecycle (create, update, deactivate, delete) between Entra ID and SaaS apps. Without it: manual work, delays, errors. With it: automatic, fast, consistent.

**Q4: How should you store client secrets?**
A: Never hardcode. Use Azure Key Vault, AWS Secrets Manager, or similar. For Azure workloads, use Managed Identity (no secrets needed). For certificates: preferred over secrets as they're harder to steal.

**Q5: What's the proper client secret rotation schedule?**
A: Every 90 days minimum. Create new secret, update app, test in production, delete old secret. Use Key Vault to rotate automatically if possible.

---

*End of Section 6.6*
