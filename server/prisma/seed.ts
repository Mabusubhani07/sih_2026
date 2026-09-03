import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ClassificationService } from '../src/services/classificationService';
import { MetadataExtractionService } from '../src/services/metadataExtractionService';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Government Investigation Database ---');

  // Ensure uploads directory exists
  const uploadsDir = path.resolve(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Helper to create sample file and compute real SHA-256
  const createSampleFile = (fileName: string, content: string) => {
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, content, 'utf-8');
    const buffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return {
      storagePath: fileName,
      fileName,
      fileSize: buffer.length,
      sha256: hash,
      content,
    };
  };

  // Clean previous dynamic records for deterministic re-seeding
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.documentShare.deleteMany({});
  await prisma.evidence.deleteMany({});
  await prisma.documentMetadata.deleteMany({});
  await prisma.documentVersion.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.caseMembership.deleteMany({});
  await prisma.case.deleteMany({});

  // 0. Apex State Investigation Organization
  const stateOrg = await prisma.organization.upsert({
    where: { code: 'SID' },
    update: {},
    create: {
      code: 'SID',
      name: 'State Investigation & Law Enforcement Command',
      description: 'Apex administrative agency supervising state police commands, criminal investigations, forensic laboratories, and public prosecution.',
    },
  });

  // 1. Departments
  const deptPolice = await prisma.department.upsert({
    where: { code: 'POLICE' },
    update: { organizationId: stateOrg.id },
    create: {
      code: 'POLICE',
      name: 'Central Police Command & Precincts',
      description: 'First Information Reports, field policing, apprehension, and jurisdiction control.',
      organizationId: stateOrg.id,
    },
  });

  const deptInvestigation = await prisma.department.upsert({
    where: { code: 'INVESTIGATION' },
    update: { organizationId: stateOrg.id },
    create: {
      code: 'INVESTIGATION',
      name: 'Criminal Investigation Department (CID)',
      description: 'Lead investigative operations, case diaries, interrogations, and cross-agency coordination.',
      organizationId: stateOrg.id,
    },
  });

  const deptForensics = await prisma.department.upsert({
    where: { code: 'FORENSICS' },
    update: { organizationId: stateOrg.id },
    create: {
      code: 'FORENSICS',
      name: 'Forensic Science Laboratory & Cyber Analysis',
      description: 'Digital forensics, DNA/biological analysis, ballistics, chemical tests, and hash verification.',
      organizationId: stateOrg.id,
    },
  });

  const deptLegal = await prisma.department.upsert({
    where: { code: 'LEGAL' },
    update: { organizationId: stateOrg.id },
    create: {
      code: 'LEGAL',
      name: 'Directorate of Public Prosecution',
      description: 'Prosecution case preparation, statutory penal compliance, bail opposing, and legal advisory.',
      organizationId: stateOrg.id,
    },
  });

  const deptJudiciary = await prisma.department.upsert({
    where: { code: 'JUDICIARY' },
    update: { organizationId: stateOrg.id },
    create: {
      code: 'JUDICIARY',
      name: 'Metropolitan Judicial Court & Registry',
      description: 'Judicial docket management, warrants, trial evidence verification, and court order sheets.',
      organizationId: stateOrg.id,
    },
  });

  const deptAdmin = await prisma.department.upsert({
    where: { code: 'ADMIN' },
    update: { organizationId: stateOrg.id },
    create: {
      code: 'ADMIN',
      name: 'Department of Internal Security & IT Administration',
      description: 'User access administration, security oversight, system-wide audit monitoring.',
      organizationId: stateOrg.id,
    },
  });

  // 2. Users (Demo Password: DemoPass@2026)
  const passwordHash = await bcrypt.hash('DemoPass@2026', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.gov' },
    update: { passwordHash },
    create: {
      email: 'admin@demo.gov',
      passwordHash,
      name: 'Director General A. K. Mehra',
      badgeNumber: 'ADMIN-001',
      role: 'ADMIN',
      departmentId: deptAdmin.id,
      status: 'ACTIVE',
      phone: '+91 11 2301-4401',
    },
  });

  const policeUser = await prisma.user.upsert({
    where: { email: 'police@demo.gov' },
    update: { passwordHash },
    create: {
      email: 'police@demo.gov',
      passwordHash,
      name: 'Inspector Rajesh Sharma',
      badgeNumber: 'POL-7821',
      role: 'POLICE_OFFICER',
      departmentId: deptPolice.id,
      status: 'ACTIVE',
      phone: '+91 11 2309-8821',
    },
  });

  const investigatorUser = await prisma.user.upsert({
    where: { email: 'investigator@demo.gov' },
    update: { passwordHash },
    create: {
      email: 'investigator@demo.gov',
      passwordHash,
      name: 'Senior Inspector Sarah Vance',
      badgeNumber: 'CID-4092',
      role: 'INVESTIGATOR',
      departmentId: deptInvestigation.id,
      status: 'ACTIVE',
      phone: '+91 11 2309-5544',
    },
  });

  const forensicUser = await prisma.user.upsert({
    where: { email: 'forensic@demo.gov' },
    update: { passwordHash },
    create: {
      email: 'forensic@demo.gov',
      passwordHash,
      name: 'Dr. K. Raman (Lead Cyber Forensic Examiner)',
      badgeNumber: 'FSL-2109',
      role: 'FORENSIC_OFFICER',
      departmentId: deptForensics.id,
      status: 'ACTIVE',
      phone: '+91 11 2307-9912',
    },
  });

  const legalUser = await prisma.user.upsert({
    where: { email: 'legal@demo.gov' },
    update: { passwordHash },
    create: {
      email: 'legal@demo.gov',
      passwordHash,
      name: 'Advocate Meera Sen (Special Public Prosecutor)',
      badgeNumber: 'LEGAL-338',
      role: 'LEGAL_OFFICER',
      departmentId: deptLegal.id,
      status: 'ACTIVE',
      phone: '+91 11 2338-1200',
    },
  });

  const courtUser = await prisma.user.upsert({
    where: { email: 'court@demo.gov' },
    update: { passwordHash },
    create: {
      email: 'court@demo.gov',
      passwordHash,
      name: 'Hon. Registrar P. K. Verma',
      badgeNumber: 'JUD-881',
      role: 'COURT_USER',
      departmentId: deptJudiciary.id,
      status: 'ACTIVE',
      phone: '+91 11 2338-9000',
    },
  });

  console.log('✓ Seeded 6 Official Users with Demo Accounts');

  // 3. Realistic Demo Cases
  // Case 1: Cyber Fraud & Crypto Laundering
  const case1 = await prisma.case.upsert({
    where: { caseNumber: 'CASE-2026-00421' },
    update: {},
    create: {
      caseNumber: 'CASE-2026-00421',
      firNumber: 'FIR/2026/0187',
      title: 'Operation Cipher Vault: Multi-State Cyber Fraud & Crypto Laundering Syndicate',
      crimeCategory: 'Cyber Fraud & Money Laundering',
      policeStation: 'Cyber Crime Police Station, Central District',
      jurisdiction: 'Special Cyber Crime Cell, Metropolitan Police',
      incidentDate: new Date('2026-07-14T03:30:00Z'),
      incidentLocation: 'Server Farm Node 4B, Sector 62 Industrial Complex & Digital Wallets',
      registeredDate: new Date('2026-07-15T09:00:00Z'),
      priority: 'HIGH',
      status: 'UNDER_INVESTIGATION',
      assignedDepartmentId: deptInvestigation.id,
      leadInvestigatorId: investigatorUser.id,
      createdById: policeUser.id,
      description:
        'Investigation into an illicit offshore syndicated phishing operation diverting treasury vendor payments into decentralized crypto tumbling pools. Approximately $4.2M in diversion traced across multiple compromised gateway endpoints.',
      memberships: {
        create: [
          { userId: policeUser.id, roleInCase: 'INITIAL_OFFICER' },
          { userId: investigatorUser.id, roleInCase: 'LEAD_INVESTIGATOR' },
          { userId: forensicUser.id, roleInCase: 'FORENSIC_ANALYST' },
        ],
      },
    },
  });

  // Case 2: Financial Embezzlement
  const case2 = await prisma.case.upsert({
    where: { caseNumber: 'CASE-2026-00317' },
    update: {},
    create: {
      caseNumber: 'CASE-2026-00317',
      firNumber: 'FIR/2026/0112',
      title: 'State Infrastructure Fund Procurement Embezzlement',
      crimeCategory: 'Financial Crimes',
      policeStation: 'Economic Offences Wing, North Precinct',
      jurisdiction: 'State Anti-Corruption Bureau',
      incidentDate: new Date('2026-05-20T11:00:00Z'),
      incidentLocation: 'Department of Public Works Procurement Directorate',
      registeredDate: new Date('2026-05-22T14:30:00Z'),
      priority: 'URGENT',
      status: 'LEGAL_REVIEW',
      assignedDepartmentId: deptInvestigation.id,
      leadInvestigatorId: investigatorUser.id,
      createdById: policeUser.id,
      description:
        'Fraudulent disbursement of structural concrete and reinforcement tenders through forged shell supplier invoices without physical material delivery.',
      memberships: {
        create: [
          { userId: investigatorUser.id, roleInCase: 'LEAD_INVESTIGATOR' },
          { userId: legalUser.id, roleInCase: 'LEGAL_COUNSEL' },
        ],
      },
    },
  });

  // Case 3: Narcotics & Controlled Substances
  const case3 = await prisma.case.upsert({
    where: { caseNumber: 'CASE-2026-00284' },
    update: {},
    create: {
      caseNumber: 'CASE-2026-00284',
      firNumber: 'FIR/2026/0098',
      title: 'Theft & Illegal Trafficking of Controlled Pharmaceutical Consignments',
      crimeCategory: 'Commercial Theft',
      policeStation: 'Harbor Division Port Police Station',
      jurisdiction: 'Metropolitan Port Authority Police',
      incidentDate: new Date('2026-04-10T22:15:00Z'),
      incidentLocation: 'Container Terminal Berth 7, Customs Bonded Zone',
      registeredDate: new Date('2026-04-11T08:00:00Z'),
      priority: 'MEDIUM',
      status: 'COURT_SUBMITTED',
      assignedDepartmentId: deptPolice.id,
      leadInvestigatorId: investigatorUser.id,
      createdById: policeUser.id,
      description:
        'Unauthorized seal breakage and diversion of 3 refrigerated container consignments carrying regulated Schedule H pharmaceutical compounds.',
      memberships: {
        create: [
          { userId: policeUser.id, roleInCase: 'INITIAL_OFFICER' },
          { userId: courtUser.id, roleInCase: 'OBSERVER' },
          { userId: legalUser.id, roleInCase: 'LEGAL_COUNSEL' },
        ],
      },
    },
  });

  // Case 4: Counterfeit Currency Syndicate
  const case4 = await prisma.case.upsert({
    where: { caseNumber: 'CASE-2026-00312' },
    update: {},
    create: {
      caseNumber: 'CASE-2026-00312',
      firNumber: 'FIR/2026/1429',
      title: 'Counterfeit High-Denomination Currency Distribution Syndicate',
      crimeCategory: 'Forgery & Counterfeit',
      policeStation: 'Economic Offences Wing, South Precinct',
      jurisdiction: 'State Criminal Investigation Division',
      incidentDate: new Date('2026-06-01T14:00:00Z'),
      incidentLocation: 'Interstate Transport Terminal, Cargo Bay 12',
      registeredDate: new Date('2026-06-02T09:30:00Z'),
      priority: 'HIGH',
      status: 'UNDER_INVESTIGATION',
      assignedDepartmentId: deptInvestigation.id,
      leadInvestigatorId: investigatorUser.id,
      createdById: policeUser.id,
      description: 'Interception of high-quality forged currency notes transported across state lines via commercial freight parcels.',
    },
  });

  // Case 5: Land Record Mutation Fraud
  const case5 = await prisma.case.upsert({
    where: { caseNumber: 'CASE-2026-00508' },
    update: {},
    create: {
      caseNumber: 'CASE-2026-00508',
      firNumber: 'FIR/2026/2201',
      title: 'Forged Metropolitan Land Registry & Mutation Records Fraud',
      crimeCategory: 'Forgery & Counterfeit',
      policeStation: 'Revenue Intelligence Police Precinct',
      jurisdiction: 'Metropolitan Anti-Corruption Bureau',
      incidentDate: new Date('2026-05-12T10:00:00Z'),
      incidentLocation: 'Sub-Registrar Office, Sector 19',
      registeredDate: new Date('2026-05-14T11:00:00Z'),
      priority: 'HIGH',
      status: 'FORENSIC_ANALYSIS',
      assignedDepartmentId: deptForensics.id,
      leadInvestigatorId: investigatorUser.id,
      createdById: policeUser.id,
      description: 'Unauthorized database alteration and forged physical revenue stamps used to unlawfully re-register prime commercial plots.',
    },
  });

  // Case 6: Interstate Narcotics Concealment
  const case6 = await prisma.case.upsert({
    where: { caseNumber: 'CASE-2026-00619' },
    update: {},
    create: {
      caseNumber: 'CASE-2026-00619',
      firNumber: 'FIR/2026/3845',
      title: 'Interstate Narcotics Concealment in Cold-Chain Logistics',
      crimeCategory: 'Narcotics Smuggling',
      policeStation: 'Special Narcotics Task Force Precinct',
      jurisdiction: 'State Narcotics Enforcement Wing',
      incidentDate: new Date('2026-07-02T23:30:00Z'),
      incidentLocation: 'National Highway 48 Checkpost Mile 14',
      registeredDate: new Date('2026-07-03T06:00:00Z'),
      priority: 'URGENT',
      status: 'UNDER_INVESTIGATION',
      assignedDepartmentId: deptPolice.id,
      leadInvestigatorId: investigatorUser.id,
      createdById: policeUser.id,
      description: 'Discovery of hidden false compartments within commercial milk transport tankers concealing 45 kg of controlled synthetic narcotics.',
    },
  });

  // Case 7: Industrial Warehouse Homicide
  const case7 = await prisma.case.upsert({
    where: { caseNumber: 'CASE-2026-00724' },
    update: {},
    create: {
      caseNumber: 'CASE-2026-00724',
      firNumber: 'FIR/2026/4102',
      title: 'Homicide Investigation: Industrial Zone Warehouse Facility',
      crimeCategory: 'Homicide',
      policeStation: 'Industrial Area Police Station, Sector 5',
      jurisdiction: 'Metropolitan Police Command',
      incidentDate: new Date('2026-06-25T21:45:00Z'),
      incidentLocation: 'Warehouse 18-B, Industrial Estate Phase II',
      registeredDate: new Date('2026-06-26T02:00:00Z'),
      priority: 'URGENT',
      status: 'LEGAL_REVIEW',
      assignedDepartmentId: deptInvestigation.id,
      leadInvestigatorId: investigatorUser.id,
      createdById: policeUser.id,
      description: 'Fatal assault inside secured industrial warehouse premises. Ballistic and biological trace evidence collected at scene.',
    },
  });

  // Case 8: Corporate Data Extortion
  const case8 = await prisma.case.upsert({
    where: { caseNumber: 'CASE-2026-00831' },
    update: {},
    create: {
      caseNumber: 'CASE-2026-00831',
      firNumber: 'FIR/2026/5019',
      title: 'Corporate Data Extortion & Proprietary Design Exfiltration',
      crimeCategory: 'Cyber Fraud',
      policeStation: 'Cyber Crime Police Station, Tech Zone',
      jurisdiction: 'State Cyber Crime Division',
      incidentDate: new Date('2026-07-10T16:20:00Z'),
      incidentLocation: 'Cyber Towers Tech Park, 4th Floor',
      registeredDate: new Date('2026-07-11T12:00:00Z'),
      priority: 'HIGH',
      status: 'FORENSIC_ANALYSIS',
      assignedDepartmentId: deptForensics.id,
      leadInvestigatorId: investigatorUser.id,
      createdById: policeUser.id,
      description: 'Ransom demand following exfiltration of proprietary architectural schematics from defense supply subcontractor server.',
    },
  });

  // Case 9: Cross-Border Wire Manipulation
  const case9 = await prisma.case.upsert({
    where: { caseNumber: 'CASE-2026-00945' },
    update: {},
    create: {
      caseNumber: 'CASE-2026-00945',
      firNumber: 'FIR/2026/7712',
      title: 'Cross-Border Unauthorized Wire Transfer Manipulation',
      crimeCategory: 'Economic Offences',
      policeStation: 'Financial Fraud Division, Central Wing',
      jurisdiction: 'State Anti-Corruption & Financial Wing',
      incidentDate: new Date('2026-05-05T08:15:00Z'),
      incidentLocation: 'Commercial Bank Clearing Centre',
      registeredDate: new Date('2026-05-06T15:00:00Z'),
      priority: 'MEDIUM',
      status: 'CLOSED',
      assignedDepartmentId: deptInvestigation.id,
      leadInvestigatorId: investigatorUser.id,
      createdById: policeUser.id,
      description: 'Recovery and restitution of misdirected international wire batches following forensic reversal and judicial order.',
    },
  });

  console.log('✓ Seeded 9 Distinct Investigation Cases');

  // 4. Sample Documents with REAL file contents & computed SHA-256 hashes!
  const file1 = createSampleFile(
    'FIR_2026_0187_Certified_Copy.txt',
    `GOVERNMENT OF THE STATE - POLICE DEPARTMENT
FIRST INFORMATION REPORT (Under Section 154 Cr.P.C.)
--------------------------------------------------------------------------------
FIR Number: FIR/2026/0187
Police Station: Cyber Crime Police Station, Central District
District: Metropolitan Central | State: Capital Territory
Date and Time of FIR: 15 July 2026, 09:00 Hours
Incident Occurred: 14 July 2026, approx 03:30 Hours
Place of Occurrence: Server Farm Node 4B, Sector 62 Industrial Complex

Complainant: Nodal Officer, State Electronic Treasury Division
Accused: Unknown Operators Operating Under Alias "CipherVault Syndicate"
Acts & Sections: IT Act 2000 Sec 43, 66, 66C, 66D r/w IPC 420, 120B

BRIEF FACTS OF THE CASE:
On 14 July 2026 at 03:30 hours, unauthorized administrative access was gained to the Automated Clearing Gateway.
Three automated batches amounting to $4,210,000 were redirected to offshore crypto tumbler addresses.
Network telemetry logs show routing through IP 198.51.100.42 and IP 203.0.113.19.
Primary evidence seized includes physical server drives and encrypted hardware tokens.
Investigation entrusted to CID Cyber Wing under Inspector Rajesh Sharma.`
  );

  const file2_v1 = createSampleFile(
    'Forensic_Analysis_Hard_Drive_Dump_v1.txt',
    `FORENSIC SCIENCE LABORATORY - CYBER FORENSICS DIVISION
EXAMINATION REPORT & BIT-STREAM INTEGRITY CERTIFICATE
--------------------------------------------------------------------------------
Case Reference: CASE-2026-00421 | FIR/2026/0187
Evidence Reference: EVD-2026-00482 (NVMe SSD Serial #SN98231-X)
Examiner: Dr. K. Raman, Lead Cyber Forensic Examiner (FSL-2109)
Date of Seizure: 15 July 2026 | Date of Examination: 16 July 2026

ACQUISITION DETAILS:
Forensic Hardware Write-Blocker: Tableau T8u USB 3.0 Forensic Bridge
Imaging Software: EnCase Forensic v22.4 / Guymager 0.8.8
Original Media Size: 1,000,204,886,016 bytes (1 TB)
Bit-stream Image Format: Raw DD (.dd) & Expert Witness Format (.E01)

PRELIMINARY FINDINGS (REVISION 1):
1. Partition 3 contains an unallocated space cluster holding Python memory scraping scripts.
2. IP connection logs establish established SSL sockets with command node 198.51.100.42:8443.
3. Cold wallet master seed was observed partially in cleartext swap file at sector offset 0x004F9800.
4. Recovery panchnama executed with witnesses.

CHAIN OF CUSTODY:
Seized by Inspector Rajesh Sharma, transferred to FSL Cyber Locker under seal #SL-8841.`
  );

  const file2_v2 = createSampleFile(
    'Forensic_Analysis_Hard_Drive_Dump_v2.txt',
    `FORENSIC SCIENCE LABORATORY - CYBER FORENSICS DIVISION
EXAMINATION REPORT & BIT-STREAM INTEGRITY CERTIFICATE
--------------------------------------------------------------------------------
Case Reference: CASE-2026-00421 | FIR/2026/0187
Evidence Reference: EVD-2026-00482 (NVMe SSD Serial #SN98231-X)
Examiner: Dr. K. Raman, Lead Cyber Forensic Examiner (FSL-2109)
Date of Seizure: 15 July 2026 | Revision 2 Finalized: 18 July 2026

REVISION 2 SUPPLEMENTAL ANALYSIS:
1. Deep carve of Sector 0x004F9800 recovered complete 24-word BIP-39 mnemonic phrase.
2. Traced transactions through Ethereum node to Binance deposit wallet tag #994102.
3. Re-computed SHA-256 bitstream match on original evidence image confirms no bit alteration.
4. Concluded: Direct evidentiary link to primary suspect accounts identified.`
  );

  const file3 = createSampleFile(
    'Witness_Deposition_Compliance_Officer.txt',
    `CRIMINAL INVESTIGATION DEPARTMENT - WITNESS DEPOSITION
Statement Recorded Under Section 161 of Criminal Procedure Code
--------------------------------------------------------------------------------
Case Number: CASE-2026-00421
Date: 17 July 2026, 14:00 Hours
Location: CID Headquarters, Room 304, Conference Wing
Investigating Officer: Senior Inspector Sarah Vance (CID-4092)

WITNESS PARTICULARS:
Name: Vikramaditya Roy, Age: 44 Years
Occupation: Senior Director of IT Security & Financial Compliance, Treasury Gateway Services
Residential Address: 44 Crestview Avenue, Metropolitan District

STATEMENT:
"I am employed as the chief compliance lead for payment gateway operations. On the evening of 13 July 2026,
at approximately 23:45 hours, our automated intrusion detection cluster logged anomalous credential reuse
from an IP address located in Eastern Europe. The credentials belonged to our lead infrastructure engineer.
I immediately alerted the night shift NOC controller.
By 03:30 hours on 14 July 2026, automated diversion limits were bypassed using a modified root certificate.
I state that no internal employee authorized these batches. The server drive was handed over to Police
in intact condition with seals intact."

Signed and Sworn before me:
Senior Inspector Sarah Vance (CID-4092)`
  );

  const file4 = createSampleFile(
    'Prosecution_Brief_Legal_Summary.txt',
    `DIRECTORATE OF PUBLIC PROSECUTION - LEGAL CASE BRIEF
IN THE COURT OF THE PRINCIPAL DISTRICT & SESSIONS JUDGE
--------------------------------------------------------------------------------
State represented by Special Public Prosecutor Adv. Meera Sen
Versus
Accused Operatives (Investigation Underway)
Case: CASE-2026-00421 | FIR/2026/0187

LEGAL CHARGES FRAMED:
1. Section 66 (Computer Related Offences) Information Technology Act, 2000
2. Section 66C (Identity Theft) & Section 66D (Cheating by Impersonation)
3. Section 420 (Cheating and Dishonestly Inducing Delivery of Property) IPC
4. Section 120B (Criminal Conspiracy) IPC

EVIDENTIARY VALUE OF ATTACHMENTS:
The electronic records, server images, and forensic logs adhere to strict Section 65B of Indian Evidence Act
admissibility norms. The SHA-256 cryptographic hashes demonstrate tamper-free bitstream integrity from the
moment of seizure at Sector 62 through FSL examination.
Bail must be strongly opposed due to transnational flight risk and ongoing crypto asset tracing.`
  );

  // Document 1: FIR in Case 1
  const doc1 = await prisma.document.create({
    data: {
      documentNumber: 'DOC-2026-00101',
      caseId: case1.id,
      title: 'Certified First Information Report (FIR No. 0187/2026)',
      documentType: 'FIR',
      departmentId: deptPolice.id,
      status: 'ACTIVE',
      classificationReason: 'Official initial registration record by station house officer.',
      isConfidential: false,
      currentVersionNumber: 1,
      createdById: policeUser.id,
      versions: {
        create: {
          versionNumber: 1,
          fileName: file1.fileName,
          originalFileName: file1.fileName,
          mimeType: 'text/plain',
          fileSize: file1.fileSize,
          storagePath: file1.storagePath,
          sha256Hash: file1.sha256,
          hashAlgorithm: 'SHA-256',
          changeSummary: 'Certified initial FIR registered and sealed into case repository.',
          extractedText: file1.content,
          uploadedById: policeUser.id,
          createdAt: new Date('2026-07-15T09:15:00Z'),
        },
      },
    },
  });

  // Document 2: Forensic Report with v1 and v2!
  const doc2 = await prisma.document.create({
    data: {
      documentNumber: 'DOC-2026-00102',
      caseId: case1.id,
      title: 'Cyber Forensic Analysis & Bitstream Verification Report',
      documentType: 'FORENSIC_REPORT',
      departmentId: deptForensics.id,
      status: 'ACTIVE',
      classificationReason: 'Laboratory forensic evidence extraction and bitstream certification.',
      isConfidential: true,
      currentVersionNumber: 2,
      createdById: forensicUser.id,
      versions: {
        create: [
          {
            versionNumber: 1,
            fileName: file2_v1.fileName,
            originalFileName: file2_v1.fileName,
            mimeType: 'text/plain',
            fileSize: file2_v1.fileSize,
            storagePath: file2_v1.storagePath,
            sha256Hash: file2_v1.sha256,
            hashAlgorithm: 'SHA-256',
            changeSummary: 'Initial preliminary forensic examination and disk dump.',
            extractedText: file2_v1.content,
            uploadedById: forensicUser.id,
            createdAt: new Date('2026-07-16T11:00:00Z'),
          },
          {
            versionNumber: 2,
            fileName: file2_v2.fileName,
            originalFileName: file2_v2.fileName,
            mimeType: 'text/plain',
            fileSize: file2_v2.fileSize,
            storagePath: file2_v2.storagePath,
            sha256Hash: file2_v2.sha256,
            hashAlgorithm: 'SHA-256',
            changeSummary: 'Supplemental deep-carve analysis recovering wallet mnemonic phrase.',
            extractedText: file2_v2.content,
            uploadedById: forensicUser.id,
            createdAt: new Date('2026-07-18T16:30:00Z'),
          },
        ],
      },
    },
  });

  // Document 3: Witness Deposition in Case 1
  const doc3 = await prisma.document.create({
    data: {
      documentNumber: 'DOC-2026-00103',
      caseId: case1.id,
      title: 'Witness Deposition of Chief Compliance Officer V. Roy',
      documentType: 'WITNESS_STATEMENT',
      departmentId: deptInvestigation.id,
      status: 'ACTIVE',
      classificationReason: 'Sworn Section 161 witness testimony recorded by lead investigator.',
      isConfidential: false,
      currentVersionNumber: 1,
      createdById: investigatorUser.id,
      versions: {
        create: {
          versionNumber: 1,
          fileName: file3.fileName,
          originalFileName: file3.fileName,
          mimeType: 'text/plain',
          fileSize: file3.fileSize,
          storagePath: file3.storagePath,
          sha256Hash: file3.sha256,
          hashAlgorithm: 'SHA-256',
          changeSummary: 'Original recorded interrogation statement.',
          extractedText: file3.content,
          uploadedById: investigatorUser.id,
          createdAt: new Date('2026-07-17T15:00:00Z'),
        },
      },
    },
  });

  // Document 4: Legal Brief in Case 1
  const doc4 = await prisma.document.create({
    data: {
      documentNumber: 'DOC-2026-00104',
      caseId: case1.id,
      title: 'Public Prosecution Pre-Trial Legal Brief & Charge Outline',
      documentType: 'LEGAL_DOCUMENT',
      departmentId: deptLegal.id,
      status: 'ACTIVE',
      classificationReason: 'Statutory penal drafting and Section 65B evidence admissibility notes.',
      isConfidential: false,
      currentVersionNumber: 1,
      createdById: legalUser.id,
      versions: {
        create: {
          versionNumber: 1,
          fileName: file4.fileName,
          originalFileName: file4.fileName,
          mimeType: 'text/plain',
          fileSize: file4.fileSize,
          storagePath: file4.storagePath,
          sha256Hash: file4.sha256,
          hashAlgorithm: 'SHA-256',
          changeSummary: 'Initial prosecution brief submitted for judicial docketing.',
          extractedText: file4.content,
          uploadedById: legalUser.id,
          createdAt: new Date('2026-07-20T10:00:00Z'),
        },
      },
    },
  });

  // Additional realistic case documents across cases 2 through 9
  const f_c2_fir = createSampleFile('FIR_2026_6896_Certified.txt', 'GOVERNMENT POLICE RECORD\nFIR 6896/2026\nUnder Sections 409, 420, 468 IPC.\nInvestigation: Public Works Reinforcement Tender Invoice Manipulation.');
  const f_c2_memo = createSampleFile('Invoice_Audit_Discrepancy_Analysis.txt', 'ECONOMIC OFFENCES WING - FORENSIC ACCOUNTING REPORT\nAnalysis of 14 forged vendor vouchers totaling $1.8M lacking delivery receipt slips.');
  const f_c3_cert = createSampleFile('Port_Customs_Inspection_Certificate.txt', 'METROPOLITAN PORT AUTHORITY - CUSTOMS BONDED AREA INSPECTION\nCertified tampering on refrigerated container seal numbers #CT-99104 and #CT-99105.');
  const f_c4_curr = createSampleFile('FSL_Currency_Forensic_Report.txt', 'CENTRAL FORENSIC SCIENCE LABORATORY - QUESTIONED DOCUMENTS WING\nMicroscopic examination reveals offset lithographic counterfeit printing lacking intaglio tactile print features.');
  const f_c5_land = createSampleFile('Forensic_Handwriting_Mutation_Stamp_Analysis.txt', 'FSL QUESTIONED DOCUMENTS DIVISION\nComparative signature verification indicates simulated forgery of Sub-Registrar signature.');
  const f_c6_chem = createSampleFile('Narcotics_Chemical_Analysis_Certificate.txt', 'GOVERNMENT ANALYST TEST CERTIFICATE\nSample analyzed positive for high-purity methylamphetamine hydrochloride (94.2% purity).');
  const f_c7_ball = createSampleFile('Ballistics_Crime_Scene_Inquest_Report.txt', 'CRIME SCENE FORENSIC BALLISTICS REPORT\nStriation mark analysis matches 9mm casing #EVD-491 with seized firearm breach-face.');
  const f_c8_dump = createSampleFile('Network_Packet_Exfiltration_Dump.txt', 'CYBER CRIME INCIDENT RESPONSE LOG\nSFTP exfiltration channel logged 42.6 GB transfer of CAD blueprint archives to offshore host.');

  const doc5 = await prisma.document.create({
    data: {
      documentNumber: 'DOC-2026-00105',
      caseId: case2.id,
      title: 'Certified FIR for Public Works Tender Manipulation',
      documentType: 'FIR',
      departmentId: deptPolice.id,
      status: 'ACTIVE',
      classificationReason: 'Statutory First Information Report under Section 154 Cr.P.C.',
      currentVersionNumber: 1,
      createdById: policeUser.id,
      versions: {
        create: {
          versionNumber: 1,
          fileName: f_c2_fir.fileName,
          originalFileName: f_c2_fir.fileName,
          mimeType: 'text/plain',
          fileSize: f_c2_fir.fileSize,
          storagePath: f_c2_fir.storagePath,
          sha256Hash: f_c2_fir.sha256,
          hashAlgorithm: 'SHA-256',
          changeSummary: 'Certified initial FIR record.',
          extractedText: f_c2_fir.content,
          uploadedById: policeUser.id,
        },
      },
    },
  });

  const doc6 = await prisma.document.create({
    data: {
      documentNumber: 'DOC-2026-00106',
      caseId: case2.id,
      title: 'Forensic Accounting Audit Discrepancy Analysis',
      documentType: 'INVESTIGATION_REPORT',
      departmentId: deptInvestigation.id,
      status: 'ACTIVE',
      classificationReason: 'Ledger discrepancy audit report.',
      currentVersionNumber: 1,
      createdById: investigatorUser.id,
      versions: {
        create: {
          versionNumber: 1,
          fileName: f_c2_memo.fileName,
          originalFileName: f_c2_memo.fileName,
          mimeType: 'text/plain',
          fileSize: f_c2_memo.fileSize,
          storagePath: f_c2_memo.storagePath,
          sha256Hash: f_c2_memo.sha256,
          hashAlgorithm: 'SHA-256',
          changeSummary: 'Financial audit report.',
          extractedText: f_c2_memo.content,
          uploadedById: investigatorUser.id,
        },
      },
    },
  });

  const doc7 = await prisma.document.create({
    data: {
      documentNumber: 'DOC-2026-00107',
      caseId: case3.id,
      title: 'Port Customs Inspection & Seal Breakage Memo',
      documentType: 'EVIDENCE',
      departmentId: deptPolice.id,
      status: 'ACTIVE',
      classificationReason: 'Customs border inspection memo.',
      currentVersionNumber: 1,
      createdById: policeUser.id,
      versions: {
        create: {
          versionNumber: 1,
          fileName: f_c3_cert.fileName,
          originalFileName: f_c3_cert.fileName,
          mimeType: 'text/plain',
          fileSize: f_c3_cert.fileSize,
          storagePath: f_c3_cert.storagePath,
          sha256Hash: f_c3_cert.sha256,
          hashAlgorithm: 'SHA-256',
          changeSummary: 'Inspection memo.',
          extractedText: f_c3_cert.content,
          uploadedById: policeUser.id,
        },
      },
    },
  });

  const doc8 = await prisma.document.create({
    data: {
      documentNumber: 'DOC-2026-00108',
      caseId: case4.id,
      title: 'FSL Currency Forensic Analysis Report',
      documentType: 'FORENSIC_REPORT',
      departmentId: deptForensics.id,
      status: 'ACTIVE',
      classificationReason: 'Expert opinion under Section 45 Indian Evidence Act.',
      currentVersionNumber: 1,
      createdById: forensicUser.id,
      versions: {
        create: {
          versionNumber: 1,
          fileName: f_c4_curr.fileName,
          originalFileName: f_c4_curr.fileName,
          mimeType: 'text/plain',
          fileSize: f_c4_curr.fileSize,
          storagePath: f_c4_curr.storagePath,
          sha256Hash: f_c4_curr.sha256,
          hashAlgorithm: 'SHA-256',
          changeSummary: 'Scientific currency evaluation.',
          extractedText: f_c4_curr.content,
          uploadedById: forensicUser.id,
        },
      },
    },
  });

  const doc9 = await prisma.document.create({
    data: {
      documentNumber: 'DOC-2026-00109',
      caseId: case5.id,
      title: 'Forensic Handwriting & Revenue Stamp Verification Certificate',
      documentType: 'FORENSIC_REPORT',
      departmentId: deptForensics.id,
      status: 'ACTIVE',
      classificationReason: 'Questioned document examination.',
      currentVersionNumber: 1,
      createdById: forensicUser.id,
      versions: {
        create: {
          versionNumber: 1,
          fileName: f_c5_land.fileName,
          originalFileName: f_c5_land.fileName,
          mimeType: 'text/plain',
          fileSize: f_c5_land.fileSize,
          storagePath: f_c5_land.storagePath,
          sha256Hash: f_c5_land.sha256,
          hashAlgorithm: 'SHA-256',
          changeSummary: 'Handwriting verification.',
          extractedText: f_c5_land.content,
          uploadedById: forensicUser.id,
        },
      },
    },
  });

  const doc10 = await prisma.document.create({
    data: {
      documentNumber: 'DOC-2026-00110',
      caseId: case6.id,
      title: 'Chemical Analytical Laboratory Test Certificate',
      documentType: 'FORENSIC_REPORT',
      departmentId: deptForensics.id,
      status: 'ACTIVE',
      classificationReason: 'NDPS Act statutory chemical purity certificate.',
      currentVersionNumber: 1,
      createdById: forensicUser.id,
      versions: {
        create: {
          versionNumber: 1,
          fileName: f_c6_chem.fileName,
          originalFileName: f_c6_chem.fileName,
          mimeType: 'text/plain',
          fileSize: f_c6_chem.fileSize,
          storagePath: f_c6_chem.storagePath,
          sha256Hash: f_c6_chem.sha256,
          hashAlgorithm: 'SHA-256',
          changeSummary: 'Chemical qualitative evaluation.',
          extractedText: f_c6_chem.content,
          uploadedById: forensicUser.id,
        },
      },
    },
  });

  const doc11 = await prisma.document.create({
    data: {
      documentNumber: 'DOC-2026-00111',
      caseId: case7.id,
      title: 'Ballistics & Crime Scene Examination Inquest Brief',
      documentType: 'FORENSIC_REPORT',
      departmentId: deptForensics.id,
      status: 'ACTIVE',
      classificationReason: 'Crime scene inquest and striation analysis.',
      currentVersionNumber: 1,
      createdById: forensicUser.id,
      versions: {
        create: {
          versionNumber: 1,
          fileName: f_c7_ball.fileName,
          originalFileName: f_c7_ball.fileName,
          mimeType: 'text/plain',
          fileSize: f_c7_ball.fileSize,
          storagePath: f_c7_ball.storagePath,
          sha256Hash: f_c7_ball.sha256,
          hashAlgorithm: 'SHA-256',
          changeSummary: 'Ballistics striation comparison.',
          extractedText: f_c7_ball.content,
          uploadedById: forensicUser.id,
        },
      },
    },
  });

  const doc12 = await prisma.document.create({
    data: {
      documentNumber: 'DOC-2026-00112',
      caseId: case8.id,
      title: 'Network Packet & Exfiltration Forensic Analysis Dump',
      documentType: 'FORENSIC_REPORT',
      departmentId: deptForensics.id,
      status: 'ACTIVE',
      classificationReason: 'Network intrusion incident report.',
      currentVersionNumber: 1,
      createdById: forensicUser.id,
      versions: {
        create: {
          versionNumber: 1,
          fileName: f_c8_dump.fileName,
          originalFileName: f_c8_dump.fileName,
          mimeType: 'text/plain',
          fileSize: f_c8_dump.fileSize,
          storagePath: f_c8_dump.storagePath,
          sha256Hash: f_c8_dump.sha256,
          hashAlgorithm: 'SHA-256',
          changeSummary: 'Network capture analysis.',
          extractedText: f_c8_dump.content,
          uploadedById: forensicUser.id,
        },
      },
    },
  });

  console.log('✓ Seeded 12 Comprehensive Case Documents with Real Hashes');

  // 5. Evidence Ledger Items
  await prisma.evidence.create({
    data: {
      evidenceNumber: 'EVD-2026-00482',
      caseId: case1.id,
      documentId: doc2.id,
      title: 'Seized NVMe Solid State Drive (Serial #SN98231-X)',
      description: 'Primary memory and operating system drive recovered from server rack node 4B in Sector 62.',
      category: 'DIGITAL',
      collectedDate: new Date('2026-07-15T05:30:00Z'),
      collectedBy: 'Inspector Rajesh Sharma (POL-7821)',
      custodyLocation: 'FSL Cyber Forensics Evidence Vault Locker 4B',
      integrityStatus: 'VERIFIED',
      currentStatus: 'IN_CUSTODY',
      notes: 'Hardware write-blocker applied before imaging. Bitstream match confirmed.',
    },
  });

  await prisma.evidence.create({
    data: {
      evidenceNumber: 'EVD-2026-00483',
      caseId: case1.id,
      title: 'Hardware Cryptocurrency Cold Wallet (Ledger Nano X)',
      description: 'Physical hardware wallet recovered during raid on courier hub addressed to suspect PO box.',
      category: 'DIGITAL',
      collectedDate: new Date('2026-07-16T18:00:00Z'),
      collectedBy: 'Senior Inspector Sarah Vance (CID-4092)',
      custodyLocation: 'FSL Hardware Diagnostics Secure Box #12',
      integrityStatus: 'VERIFIED',
      currentStatus: 'LAB_ANALYSIS',
      notes: 'Physical seals inspected by forensic technician. PIN brute-force lockout prevention active.',
    },
  });

  await prisma.evidence.create({
    data: {
      evidenceNumber: 'EVD-2026-00484',
      caseId: case2.id,
      title: 'Forged Vendor Voucher Booklets (Vols 1 - 4)',
      description: 'Original physical payment vouchers and fake receipt rubber stamps seized from procurement office.',
      category: 'DOCUMENTARY',
      collectedDate: new Date('2026-05-21T16:00:00Z'),
      collectedBy: 'Senior Inspector Sarah Vance (CID-4092)',
      custodyLocation: 'Economic Offences Evidence Vault Shelf C-2',
      integrityStatus: 'VERIFIED',
      currentStatus: 'IN_CUSTODY',
      notes: 'Sealed in tamper-evident documentary evidence bags.',
    },
  });

  await prisma.evidence.create({
    data: {
      evidenceNumber: 'EVD-2026-00485',
      caseId: case3.id,
      title: 'Severed Refrigerated Container Bolt Seals',
      description: 'Pair of serialized customs container bolt seals severed with hydraulic cutting tool.',
      category: 'PHYSICAL_ITEM',
      collectedDate: new Date('2026-04-11T09:30:00Z'),
      collectedBy: 'Inspector Rajesh Sharma (POL-7821)',
      custodyLocation: 'Harbor Precinct Evidence Locker #7',
      integrityStatus: 'VERIFIED',
      currentStatus: 'COURT_SUBMITTED',
      notes: 'Exhibited in preliminary magistrate bail hearing.',
    },
  });

  await prisma.evidence.create({
    data: {
      evidenceNumber: 'EVD-2026-00486',
      caseId: case4.id,
      title: 'Commercial Offset Lithographic Printing Plates',
      description: 'Dual micro-etched steel plates used in high-denomination counterfeit note reproduction.',
      category: 'PHYSICAL_ITEM',
      collectedDate: new Date('2026-06-03T11:00:00Z'),
      collectedBy: 'Senior Inspector Sarah Vance (CID-4092)',
      custodyLocation: 'FSL Questioned Documents Safe Vault #2',
      integrityStatus: 'VERIFIED',
      currentStatus: 'IN_CUSTODY',
      notes: 'Recovered during raid on printing workshop in Sector 8.',
    },
  });

  await prisma.evidence.create({
    data: {
      evidenceNumber: 'EVD-2026-00487',
      caseId: case5.id,
      title: 'Forged Revenue Stamp Die & Seal Apparatus',
      description: 'Brass manual stamping die used to simulate certified land revenue mutation seals.',
      category: 'PHYSICAL_ITEM',
      collectedDate: new Date('2026-05-15T14:30:00Z'),
      collectedBy: 'Inspector Rajesh Sharma (POL-7821)',
      custodyLocation: 'Revenue Intelligence Evidence Locker #1',
      integrityStatus: 'VERIFIED',
      currentStatus: 'LAB_ANALYSIS',
      notes: 'Toolmark comparison underway against official treasury stamps.',
    },
  });

  await prisma.evidence.create({
    data: {
      evidenceNumber: 'EVD-2026-00488',
      caseId: case6.id,
      title: 'Seized Synthetic Narcotics Sealed Sample Bricks',
      description: 'Ten certified 1-kilogram sealed test packets of synthetic narcotics seized from tanker compartment.',
      category: 'BIOLOGICAL',
      collectedDate: new Date('2026-07-03T07:15:00Z'),
      collectedBy: 'Inspector Rajesh Sharma (POL-7821)',
      custodyLocation: 'Narcotics High Security Vault #9',
      integrityStatus: 'VERIFIED',
      currentStatus: 'IN_CUSTODY',
      notes: 'Chemical analysis report certified and affixed to evidence ledger.',
    },
  });

  await prisma.evidence.create({
    data: {
      evidenceNumber: 'EVD-2026-00489',
      caseId: case7.id,
      title: '9mm Spent Cartridge Casing (Winchester Luger)',
      description: 'Fired cartridge casing recovered from warehouse loading dock floor.',
      category: 'BALLISTICS',
      collectedDate: new Date('2026-06-26T03:30:00Z'),
      collectedBy: 'Senior Inspector Sarah Vance (CID-4092)',
      custodyLocation: 'FSL Ballistics Laboratory Cabinet 3',
      integrityStatus: 'VERIFIED',
      currentStatus: 'LAB_ANALYSIS',
      notes: 'Striation characteristics matching suspect firearm record.',
    },
  });

  await prisma.evidence.create({
    data: {
      evidenceNumber: 'EVD-2026-00490',
      caseId: case8.id,
      title: 'SanDisk Extreme 128GB Encrypted Flash Drive',
      description: 'External USB storage drive recovered from suspect vehicle carrying exfiltrated defense blueprints.',
      category: 'DIGITAL',
      collectedDate: new Date('2026-07-11T14:00:00Z'),
      collectedBy: 'Inspector Rajesh Sharma (POL-7821)',
      custodyLocation: 'FSL Cyber Forensics Evidence Vault Locker 8A',
      integrityStatus: 'VERIFIED',
      currentStatus: 'IN_CUSTODY',
      notes: 'Forensic bitstream image created. Master SHA-256 seal logged.',
    },
  });

  console.log('✓ Seeded 9 Distinct Evidence Items with Custody Ledger');

  // 6. Pre-configured Controlled Share: Investigator shares Forensic Report with Legal Officer
  await prisma.documentShare.create({
    data: {
      documentId: doc2.id,
      sharedWithUserId: legalUser.id,
      sharedByUserId: investigatorUser.id,
      permission: 'DOWNLOAD',
      notes: 'Shared for statutory charge framing and Section 65B electronic certificate preparation.',
      createdAt: new Date('2026-07-19T09:00:00Z'),
    },
  });

  // Pre-configured Controlled Share: Investigator shares Witness statement with Court User
  await prisma.documentShare.create({
    data: {
      documentId: doc3.id,
      sharedWithUserId: courtUser.id,
      sharedByUserId: investigatorUser.id,
      permission: 'VIEW',
      notes: 'Submitted for preliminary judicial review prior to docket registration.',
      createdAt: new Date('2026-07-20T11:00:00Z'),
    },
  });

  console.log('✓ Seeded Controlled Document Shares');

  // 7. Realistic Append-Only Audit Trail
  const auditEntries = [
    {
      eventId: 'AUD-2026-10021',
      userId: policeUser.id,
      userRole: 'POLICE_OFFICER',
      action: 'LOGIN',
      status: 'SUCCESS',
      details: JSON.stringify({ ip: '10.14.2.81', station: 'Cyber Crime PS' }),
      timestamp: new Date('2026-07-15T08:50:00Z'),
    },
    {
      eventId: 'AUD-2026-10022',
      userId: policeUser.id,
      userRole: 'POLICE_OFFICER',
      action: 'CASE_CREATED',
      caseId: case1.id,
      status: 'SUCCESS',
      details: JSON.stringify({ caseNumber: 'CASE-2026-00421', firNumber: 'FIR/2026/0187' }),
      timestamp: new Date('2026-07-15T09:00:00Z'),
    },
    {
      eventId: 'AUD-2026-10023',
      userId: policeUser.id,
      userRole: 'POLICE_OFFICER',
      action: 'DOCUMENT_UPLOADED',
      caseId: case1.id,
      documentId: doc1.id,
      status: 'SUCCESS',
      details: JSON.stringify({
        documentNumber: 'DOC-2026-00101',
        title: 'Certified First Information Report',
        sha256: file1.sha256,
        version: 1,
      }),
      timestamp: new Date('2026-07-15T09:15:00Z'),
    },
    {
      eventId: 'AUD-2026-10024',
      userId: forensicUser.id,
      userRole: 'FORENSIC_OFFICER',
      action: 'DOCUMENT_UPLOADED',
      caseId: case1.id,
      documentId: doc2.id,
      status: 'SUCCESS',
      details: JSON.stringify({
        documentNumber: 'DOC-2026-00102',
        title: 'Cyber Forensic Analysis & Bitstream Verification Report',
        sha256: file2_v1.sha256,
        version: 1,
      }),
      timestamp: new Date('2026-07-16T11:00:00Z'),
    },
    {
      eventId: 'AUD-2026-10025',
      userId: investigatorUser.id,
      userRole: 'INVESTIGATOR',
      action: 'DOCUMENT_VIEWED',
      caseId: case1.id,
      documentId: doc2.id,
      status: 'SUCCESS',
      details: JSON.stringify({ documentNumber: 'DOC-2026-00102', version: 1 }),
      timestamp: new Date('2026-07-16T14:20:00Z'),
    },
    {
      eventId: 'AUD-2026-10026',
      userId: forensicUser.id,
      userRole: 'FORENSIC_OFFICER',
      action: 'VERSION_CREATED',
      caseId: case1.id,
      documentId: doc2.id,
      status: 'SUCCESS',
      details: JSON.stringify({
        documentNumber: 'DOC-2026-00102',
        newVersion: 2,
        previousVersion: 1,
        sha256: file2_v2.sha256,
        changeSummary: 'Supplemental deep-carve analysis recovering wallet mnemonic phrase.',
      }),
      timestamp: new Date('2026-07-18T16:30:00Z'),
    },
    {
      eventId: 'AUD-2026-10027',
      userId: investigatorUser.id,
      userRole: 'INVESTIGATOR',
      action: 'DOCUMENT_SHARED',
      caseId: case1.id,
      documentId: doc2.id,
      status: 'SUCCESS',
      details: JSON.stringify({
        sharedWithUser: 'Advocate Meera Sen',
        badge: 'LEGAL-338',
        permission: 'DOWNLOAD',
      }),
      timestamp: new Date('2026-07-19T09:00:00Z'),
    },
    {
      eventId: 'AUD-2026-10028',
      userId: investigatorUser.id,
      userRole: 'INVESTIGATOR',
      action: 'INTEGRITY_CHECK',
      caseId: case1.id,
      documentId: doc2.id,
      status: 'SUCCESS',
      details: JSON.stringify({
        version: 2,
        algorithm: 'SHA-256',
        verified: true,
        recordedHash: file2_v2.sha256,
        calculatedHash: file2_v2.sha256,
      }),
      timestamp: new Date('2026-07-19T09:05:00Z'),
    },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.create({ data: entry });
  }

  console.log('✓ Seeded Audit Trail Events');

  // 7.5 Enrich all documents with subcategories, OCR text, and DocumentMetadata
  const allSeededDocs = await prisma.document.findMany({
    include: {
      versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      case: true,
    },
  });

  for (const doc of allSeededDocs) {
    const activeVer = doc.versions[0];
    const text = activeVer?.extractedText || '';
    const classification = ClassificationService.classify(doc.title, text);
    const metadata = MetadataExtractionService.extract(
      text,
      doc.title,
      doc.case?.caseNumber,
      doc.case?.firNumber
    );

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        subCategory: classification.subCategory,
        processingStatus: 'READY',
        ocrText: text,
        isOcrProcessed: false,
      },
    });

    await prisma.documentMetadata.upsert({
      where: { documentId: doc.id },
      update: {
        caseNumber: metadata.caseNumber,
        firNumber: metadata.firNumber,
        referenceNumber: metadata.referenceNumber || doc.documentNumber,
        documentDate: metadata.documentDate || doc.createdAt,
        issuingAuthority: metadata.issuingAuthority,
        departmentName: metadata.departmentName,
        location: metadata.location,
        language: metadata.language,
        entities: JSON.stringify(metadata.entities),
        keywords: JSON.stringify(metadata.keywords),
        categoryConfidence: metadata.categoryConfidence,
        isVerified: true,
      },
      create: {
        documentId: doc.id,
        caseNumber: metadata.caseNumber,
        firNumber: metadata.firNumber,
        referenceNumber: metadata.referenceNumber || doc.documentNumber,
        documentDate: metadata.documentDate || doc.createdAt,
        issuingAuthority: metadata.issuingAuthority,
        departmentName: metadata.departmentName,
        location: metadata.location,
        language: metadata.language,
        entities: JSON.stringify(metadata.entities),
        keywords: JSON.stringify(metadata.keywords),
        categoryConfidence: metadata.categoryConfidence,
        isVerified: true,
      },
    });
  }

  console.log('✓ Enriched All Documents with Metadata & Classification');

  // 8. Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: investigatorUser.id,
        title: 'New Case Assigned: CASE-2026-00421',
        message: 'You were designated Lead Investigator for Cyber Fraud FIR/2026/0187.',
        type: 'CASE_UPDATE',
        link: `/cases/${case1.id}`,
        isRead: true,
      },
      {
        userId: legalUser.id,
        title: 'Document Access Granted',
        message: 'Senior Inspector Sarah Vance shared Cyber Forensic Analysis & Bitstream Verification Report with you.',
        type: 'SHARE',
        link: `/cases/${case1.id}?doc=${doc2.id}`,
        isRead: false,
      },
      {
        userId: courtUser.id,
        title: 'Witness Statement Submitted for Judicial Review',
        message: 'Witness Deposition of Chief Compliance Officer V. Roy is available for view.',
        type: 'SHARE',
        link: `/cases/${case1.id}?doc=${doc3.id}`,
        isRead: false,
      },
      {
        userId: forensicUser.id,
        title: 'Integrity Check Passed',
        message: 'Cryptographic SHA-256 seal verified on Evidence EVD-2026-00482.',
        type: 'INTEGRITY',
        link: `/cases/${case1.id}`,
        isRead: true,
      },
    ],
  });

  console.log('✓ Seeded User Notifications');
  console.log('====================================================');
  console.log(' SEED COMPLETE. Platform is ready for demo!');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
