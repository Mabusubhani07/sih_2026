export interface ExtractedMetadata {
  caseNumber?: string;
  firNumber?: string;
  referenceNumber?: string;
  documentDate?: Date;
  issuingAuthority?: string;
  departmentName?: string;
  location?: string;
  language: string;
  entities: string[];
  keywords: string[];
  categoryConfidence: number;
}

export class MetadataExtractionService {
  /**
   * Parses structured investigation metadata from extracted text and document context
   */
  static extract(
    text: string,
    fileName: string,
    fallbackCaseNumber?: string,
    fallbackFirNumber?: string
  ): ExtractedMetadata {
    const content = `${fileName}\n${text}`;

    // 1. Case Number Regex (CASE-YYYY-XXXXX)
    const caseMatch = content.match(/CASE-\d{4}-\d{3,6}/i);
    const caseNumber = caseMatch ? caseMatch[0].toUpperCase() : fallbackCaseNumber;

    // 2. FIR Number Regex (FIR/YYYY/XXXX or FIR No. XXXX/YYYY)
    const firMatch =
      content.match(/FIR[/\s-]\d{4}[/\s-]\d{3,6}/i) ||
      content.match(/FIR\s*No\.?\s*\d{3,6}[/\s-]\d{4}/i);
    const firNumber = firMatch ? firMatch[0].replace(/\s+/g, '') : fallbackFirNumber;

    // 3. Document or Evidence Reference Number (EVD-YYYY-XXXXX, DOC-YYYY-XXXXX, Serial #..., Seal #...)
    const refMatch =
      content.match(/EVD-\d{4}-\d{3,6}/i) ||
      content.match(/DOC-\d{4}-\d{3,6}/i) ||
      content.match(/Serial\s*#?\s*([A-Z0-9-]+)/i) ||
      content.match(/Seal\s*#\s*([A-Z0-9-]+)/i) ||
      content.match(/Reference\s*#?\s*:\s*([A-Z0-9\/-]+)/i);
    const referenceNumber = refMatch ? (refMatch[1] ? `Serial #${refMatch[1]}` : refMatch[0]) : undefined;

    // 4. Date extraction
    const dateMatch =
      content.match(/(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i) ||
      content.match(/(\d{4}-\d{2}-\d{2})/);
    let documentDate: Date | undefined;
    if (dateMatch) {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) documentDate = d;
    }

    // 5. Issuing Authority & Department
    let issuingAuthority: string | undefined;
    let departmentName: string | undefined;

    if (content.includes('FORENSIC SCIENCE LABORATORY') || content.includes('FSL')) {
      issuingAuthority = 'Director, Forensic Science Laboratory';
      departmentName = 'Forensic Science Laboratory & Cyber Analysis';
    } else if (content.includes('PUBLIC PROSECUTION') || content.includes('Prosecutor')) {
      issuingAuthority = 'Directorate of Public Prosecution';
      departmentName = 'Directorate of Public Prosecution';
    } else if (content.includes('CRIMINAL INVESTIGATION DEPARTMENT') || content.includes('CID')) {
      issuingAuthority = 'Superintendent of Police, CID';
      departmentName = 'Criminal Investigation Department (CID)';
    } else if (content.includes('POLICE DEPARTMENT') || content.includes('Police Station')) {
      issuingAuthority = 'Station House Officer';
      departmentName = 'Central Police Command & Precincts';
    }

    // 6. Location
    const locMatch =
      content.match(/Location:\s*([^\n\r]+)/i) ||
      content.match(/Place of Incident:\s*([^\n\r]+)/i) ||
      content.match(/(?:Sector|Precinct|Bay|Berth|Highway|Complex)\s+[A-Za-z0-9\s-]+/i);
    const location = locMatch ? locMatch[0].replace(/Location:\s*/i, '').trim().substring(0, 60) : undefined;

    // 7. Named Entities (IPs, Wallets, Person names, Tokens)
    const entities = new Set<string>();

    // IPs
    const ips = content.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
    if (ips) ips.slice(0, 3).forEach((ip) => entities.add(`IP: ${ip}`));

    // Accused / Suspects / Witnesses
    const nameMatches = content.match(/(?:Inspector|Dr\.|Officer|Witness|Accused|Advocate|Registrar)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
    if (nameMatches) nameMatches.slice(0, 4).forEach((n) => entities.add(n.trim()));

    // Hardware tokens or seals
    const tokenMatches = content.match(/(?:Tableau|EnCase|NVMe|SSD|Binance|Ethereum|Cartridge|Luger|Sealed Bricks)\b[A-Za-z0-9-]*/gi);
    if (tokenMatches) tokenMatches.slice(0, 3).forEach((t) => entities.add(t.trim()));

    // 8. Investigative Keywords
    const keywords = new Set<string>();
    const keywordBank = [
      'Bitstream',
      'Tamper-evident',
      'Chain of Custody',
      'Cr.P.C.',
      'Section 65B',
      'Section 161',
      'Section 154',
      'Mnemonic',
      'Seizure',
      'Inquest',
      'Forensic',
      'Audit Discrepancy',
      'Lithographic',
      'Synthetic Narcotics',
      'Exfiltration',
    ];

    keywordBank.forEach((kw) => {
      if (content.toLowerCase().includes(kw.toLowerCase())) {
        keywords.add(kw);
      }
    });

    return {
      caseNumber,
      firNumber,
      referenceNumber,
      documentDate,
      issuingAuthority,
      departmentName,
      location,
      language: 'en',
      entities: Array.from(entities),
      keywords: Array.from(keywords),
      categoryConfidence: 0.92,
    };
  }
}
