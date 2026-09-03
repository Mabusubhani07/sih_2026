export interface ClassificationResult {
  documentType: string;
  subCategory: string;
  confidence: number;
  rationale: string;
}

export class ClassificationService {
  /**
   * Deterministically classifies documents based on text cues, legal markers, and file nomenclature
   */
  static classify(fileName: string, extractedText: string): ClassificationResult {
    const textLower = (extractedText || '').toLowerCase();
    const nameLower = (fileName || '').toLowerCase();
    const combined = `${nameLower} ${textLower}`;

    // 1. Forensic Report (Laboratory examinations, bitstream telemetry, ballistics)
    if (
      combined.includes('forensic') ||
      combined.includes('bit-stream') ||
      combined.includes('bitstream') ||
      combined.includes('tableau') ||
      combined.includes('ballistics') ||
      combined.includes('fsl') ||
      combined.includes('lithographic') ||
      combined.includes('counterfeit currency') ||
      combined.includes('hash match') ||
      combined.includes('dna') ||
      combined.includes('chemical analysis')
    ) {
      let sub = 'Cyber Forensics';
      if (combined.includes('ballistic')) sub = 'Ballistics Striation';
      else if (combined.includes('currency') || combined.includes('handwriting') || combined.includes('stamp'))
        sub = 'Questioned Documents';
      else if (combined.includes('chemical') || combined.includes('narcotic')) sub = 'Chemical Analysis';

      return {
        documentType: 'FORENSIC_REPORT',
        subCategory: sub,
        confidence: 0.95,
        rationale: 'Detected laboratory examination findings, bitstream telemetry, and expert opinion markers.',
      };
    }

    // 2. FIR (First Information Report)
    if (
      combined.includes('first information report') ||
      combined.includes('section 154') ||
      nameLower.startsWith('fir_') ||
      nameLower.startsWith('fir-') ||
      nameLower.startsWith('fir ') ||
      combined.includes('complainant particulars') ||
      combined.includes('station house officer')
    ) {
      return {
        documentType: 'FIR',
        subCategory: 'First Information Reports',
        confidence: 0.96,
        rationale: 'Identified statutory Section 154 Cr.P.C. First Information Report markers.',
      };
    }

    // 3. Witness Statement
    if (
      combined.includes('witness') ||
      combined.includes('deposition') ||
      combined.includes('section 161') ||
      combined.includes('statement of') ||
      combined.includes('sworn before me') ||
      combined.includes('interrogation')
    ) {
      return {
        documentType: 'WITNESS_STATEMENT',
        subCategory: 'Interrogation Statements',
        confidence: 0.93,
        rationale: 'Contains Section 161 witness testimony recording signatures and sworn statements.',
      };
    }

    // 4. Evidence Record / Seizure Memo
    if (
      combined.includes('seizure') ||
      combined.includes('panchnama') ||
      combined.includes('evd-') ||
      combined.includes('recovered from') ||
      combined.includes('tamper-evident') ||
      combined.includes('customs bolt') ||
      combined.includes('custody memo')
    ) {
      return {
        documentType: 'EVIDENCE',
        subCategory: 'Seizure Panchnama',
        confidence: 0.91,
        rationale: 'Identified physical exhibit recovery inventory, seizure panchnama, or custody memo.',
      };
    }

    // 5. Legal Document / Prosecution Brief
    if (
      combined.includes('section 65b') ||
      combined.includes('prosecution') ||
      combined.includes('charge sheet') ||
      combined.includes('bail opposing') ||
      combined.includes('penal code') ||
      combined.includes('legal brief') ||
      combined.includes('statutory compliance')
    ) {
      return {
        documentType: 'LEGAL_DOCUMENT',
        subCategory: 'Prosecution Briefs',
        confidence: 0.92,
        rationale: 'Detected statutory charge framing, penal code drafting, or electronic evidence certification.',
      };
    }

    // 6. Court Document
    if (
      combined.includes('magistrate') ||
      combined.includes('sessions court') ||
      combined.includes('judicial order') ||
      combined.includes('docket') ||
      combined.includes('sub-registrar') ||
      combined.includes('remand order')
    ) {
      return {
        documentType: 'COURT_DOCUMENT',
        subCategory: 'Court Orders & Dockets',
        confidence: 0.9,
        rationale: 'Contains judicial bench signatures, docket numbers, or formal magistrate orders.',
      };
    }

    // 7. Police Report / Case Diary
    if (
      combined.includes('police report') ||
      combined.includes('case diary') ||
      combined.includes('incident report') ||
      combined.includes('patrol') ||
      combined.includes('inspection memo')
    ) {
      return {
        documentType: 'POLICE_REPORT',
        subCategory: 'Case Diaries',
        confidence: 0.88,
        rationale: 'Recognized police operational case diary and precinct patrol reporting format.',
      };
    }

    // 8. Investigation Report
    if (
      combined.includes('investigation report') ||
      combined.includes('audit report') ||
      combined.includes('discrepancy analysis') ||
      combined.includes('inquest')
    ) {
      return {
        documentType: 'INVESTIGATION_REPORT',
        subCategory: 'Operational Reports',
        confidence: 0.87,
        rationale: 'Identified supervisory investigation progress and accounting discrepancy analysis.',
      };
    }

    // Default
    return {
      documentType: 'OTHER',
      subCategory: 'General Case Records',
      confidence: 0.7,
      rationale: 'Classified under general investigation exhibits and supplementary documentation.',
    };
  }
}
