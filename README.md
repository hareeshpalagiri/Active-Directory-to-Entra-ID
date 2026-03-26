# Active Directory to Microsoft Entra ID

A comprehensive security reference for **On-Premise, Hybrid, and Cloud** environments.  
This repository is designed to help security professionals, students, and IT administrators understand the evolution from **Active Directory (AD)** to **Microsoft Entra ID**, with a focus on identity, authentication, and security.

![Blueprint](assets/blueprint.svg)  
![Course Architecture](assets/course-architecture.png)

---

## 🔎 What is this repository about?

Identity is the new security perimeter. As organizations move from traditional **Active Directory** to **Hybrid Identity** and finally to **Microsoft Entra ID**, attackers increasingly target identity systems.  
This repo provides:
- A **structured learning path** from IAM fundamentals to advanced attack techniques.  
- **Hands-on labs** to practice detection, defense, and response.  
- **Interview Q&A** to prepare for cybersecurity roles.  

---

## 🛡️ What is IAM and why does it matter?

**Identity and Access Management (IAM)** is the framework of policies, processes, and technologies that ensure the right individuals have the right access to the right resources at the right time.  

From a cybersecurity perspective:
- IAM reduces the attack surface by enforcing **least privilege**.  
- It enables **Zero Trust** by verifying every access request.  
- It defends against credential theft, phishing, and privilege escalation.  
- It provides visibility into suspicious activity through **monitoring and logging**.  

In short: mastering IAM is critical for defending modern enterprises against identity-based attacks.

---

## 👥 Who is this for?

This repository is useful for:
- **Students & Learners** building foundational knowledge in IAM and AD.  
- **SOC Analysts & Blue Teamers** learning detection and defense strategies.  
- **IAM Engineers & Architects** designing secure identity systems.  
- **Penetration Testers & Red Teamers** studying attack techniques and lab simulations.  
- **Cybersecurity Professionals** preparing for interviews and certifications.  

---

## 🧭 Learning Path

This repository is structured as a progressive journey from foundational IAM concepts to advanced identity security in the cloud. Follow the sections in order to build your expertise:

1. **Start with Fundamentals**  
   - [Section-01-IAM-Core](Section-01-IAM-Core): Authentication, Authorization, SSO, PAM, Zero Trust.

2. **Master Active Directory (On-Premise)**  
   - [Section-02-Active-Directory](Section-02-Active-Directory): AD architecture, forests, domains, and GPOs.  
   - [Section-03-AD-Auth-Protocols](Section-03-AD-Auth-Protocols): Kerberos, NTLM, LDAP, smart cards.  
   - [Section-04-AD-Security](Section-04-AD-Security): Hardening techniques like LAPS, Credential Guard, tiered admin models.  
   - [Section-05-AD-Attacks](Section-05-AD-Attacks): Real-world attack techniques and defenses.

3. **Transition to Hybrid Identity**  
   - [Section-06-Azure-EntraID-Cloud](Section-06-Azure-EntraID-Cloud): Azure AD integration.  
   - [Section-07-Entra-ID-Security](Section-07-Entra-ID-Security): MFA, Conditional Access, Identity Protection.  
   - [Section-08-Hybrid-Identity](Section-08-Hybrid-Identity): Entra Connect, ADFS, seamless SSO.

4. **Strengthen Detection and Response**  
   - [Section-09-Monitoring-Logging-IR](Section-09-Monitoring-Logging-IR): Defender for Identity, Sentinel, logging and IR.

5. **Apply Your Knowledge**  
   - [Section-10-Labs-Scenarios](Section-10-Labs-Scenarios): Hands-on labs, simulations, interview Q&A.

---

## 🛠️ How to Use This Repo

1. **Clone the repository locally**
   ```bash
   git clone https://github.com/hareeshpalagiri/Active-Directory-to-Entra-ID.git
   cd Active-Directory-to-Entra-ID
